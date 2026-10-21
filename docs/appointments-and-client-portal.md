# Acceso Unificado, Portal del Cliente y Reservas — Huomo

Documento de auditoría, arquitectura, modelo de datos y flujos para el sprint de reservas y acceso unificado.

---

## 1. Auditoría del Estado Existente y Decisiones Técnicas

### 1.1 Autenticación y Normalización de Identidad

- **Situación previa**: El sistema contaba con tres roles (`admin`, `reception`, `barber`) y una pantalla de acceso en `/admin` pensada originalmente para empleados internos. Los nombres de usuario se normalizaban internamente a `@staff.huomo.invalid` mediante `loginEmail()`.
- **Decisión de diseño**:
  - Incorporar el valor `'client'` al tipo enumerado `public.app_role`.
  - Mantener la función `loginEmail()`: si la entrada contiene `@` (como en correos de clientes y del administrador), se respeta intacta; si es un nombre de usuario plano de empleado, se completa el dominio interno.
  - La pantalla principal `/` se convierte en la bienvenida oficial con:
    1. **Iniciar sesión**: Formulario único para los 4 roles (sin selector manual de rol). Tras autenticar con Supabase Auth, se consulta `public.profiles.role` y se redirige automáticamente al portal correspondiente (`/admin`, `/recepcion`, `/barbero`, `/cliente`).
    2. **Crear cuenta**: Formulario público exclusivo para clientes. Requiere nombre completo, email, teléfono, contraseña y confirmación de contraseña.
    3. **Recuperación de acceso**: Flujo de restablecimiento de contraseña vía Supabase Auth.
- **Garantía de Privilegios**:
  - Ningún usuario puede autoasignarse roles privilegiados.
  - Un trigger en `auth.users` (`tr_on_auth_user_created`) asigna exclusivamente `role = 'client'::public.app_role` en `public.profiles`.
  - La regla estricta `prevent_role_self_elevation()` en `public.profiles` rechaza cualquier modificación de rol por parte de usuarios no administradores.

---

## 2. Modelo de Datos de Turnos y Reglas

### 2.1 Enumerado de Estados

```sql
CREATE TYPE public.appointment_status AS ENUM ('confirmed', 'completed', 'cancelled', 'no_show');
```

Transiciones permitidas:

- `confirmed` -> `completed`: Cuando el cliente fue atendido (ejecutado por recepción o administración al vincular el servicio con Caja).
- `confirmed` -> `cancelled`: Por el cliente (si respeta el límite de anticipación de cancelación) o por recepción/administración (con motivo).
- `confirmed` -> `no_show`: Marcado por recepción o administración si el cliente no se presentó.

### 2.2 Tabla `public.appointments`

- `id`: UUID clave primaria.
- `client_id`: UUID referencia opcional a `public.profiles(id)` (NULL en reservas manuales de clientes sin cuenta de usuario).
- `client_name`: Nombre del cliente (obligatorio, 2 a 100 caracteres).
- `client_phone`: Teléfono de contacto.
- `client_email`: Email de contacto.
- `branch_id`: UUID referencia a `public.branches(id)`.
- `barber_id`: UUID referencia al barbero `public.profiles(id)`.
- `service_id`: UUID referencia al catálogo `public.service_catalog(id)`.
- `starts_at` / `ends_at`: Instantes con zona horaria (`timestamptz`).
- `status`: Estado del turno (`confirmed`, `completed`, `cancelled`, `no_show`).
- **Instantáneas históricas (Snapshots)**:
  - `branch_name`: Nombre de la sucursal al momento de la reserva.
  - `barber_name`: Nombre del barbero al momento de la reserva.
  - `service_name`: Nombre del servicio al momento de la reserva.
  - `price_cents`: Tarifa acordada en centavos (bigint).
  - `duration_minutes`: Duración en minutos del servicio.
- **Trazabilidad**:
  - `notes`: Notas adicionales de la reserva.
  - `cancellation_reason`: Motivo en caso de anulación.
  - `cancelled_at` / `cancelled_by`: Fecha y autor de la anulación.
  - `created_by`: Usuario que originó el registro (el propio cliente o staff).
  - `created_at` / `updated_at`: Marcas de tiempo auditadas.

### 2.3 Prevención Atómica de Superposiciones (PostgreSQL)

Para evitar que dos clientes o recepcionistas reserven el mismo horario del mismo barbero simultáneamente:

1. **Restricción de Exclusión a nivel de motor (PostgreSQL Range Exclusion Constraint)**:
   ```sql
   ALTER TABLE public.appointments ADD CONSTRAINT no_overlapping_confirmed_appointments
   EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
   WHERE (status = 'confirmed');
   ```
2. **Bloqueo Consultivo Transaccional (Advisory Lock)** en los procedimientos de reserva y reprogramación (`book_appointment` y `reschedule_appointment`) para serializar solicitudes concurrentes sobre el mismo barbero y devolver mensajes limpios y amigables.
3. **Reprogramación atómica**: Si la validación o el nuevo horario de una reprogramación falla, la transacción de PostgreSQL aborta sin alterar el turno original.

### 2.4 Tabla `public.booking_settings`

Configuración centralizada editable exclusivamente por administradores:

- `min_advance_hours`: Horas mínimas de anticipación requeridas para solicitar un turno (por defecto: 2 horas).
- `max_future_days`: Ventana máxima en días hacia el futuro para reservar (por defecto: 30 días).
- `cancel_limit_hours`: Límite de horas previas al turno para permitir cancelar o reprogramar por parte del cliente (por defecto: 2 horas).
- `max_active_per_client`: Cantidad máxima de reservas futuras activas simultáneas por cliente (por defecto: 3).

---

## 3. Integración con Servicios y Caja (Sin Duplicación de Trabajos)

1. En `public.employee_services` se incorpora la columna opcional `appointment_id uuid REFERENCES public.appointments(id)`.
2. Índice único parcial:
   ```sql
   CREATE UNIQUE INDEX employee_services_active_appointment
   ON public.employee_services(appointment_id) WHERE voided_at IS NULL;
   ```
3. Cuando un cliente es atendido, Recepción o Administración registra la atención vinculada al turno:
   - Se crea el registro oficial de servicio en `employee_services` con su comisión calculada una única vez según la regla de remuneración vigente del barbero.
   - Si se cobra en el momento (efectivo o transferencia), se asienta el cobro en `cash_payments` mediante `register_cash_sale` o `collect_service_payment`.
   - El turno pasa a estado `'completed'`.
   - Si se anula el cobro en caja o el servicio, las reglas existentes preservan la auditoría sin alterar la integridad.
   - Las ventas directas sin turno previo continúan funcionando con `appointment_id IS NULL`.

---

## 4. Portales y Control de Acceso (RLS)

| Rol                | Alcance de Turnos                                           | Acciones Permitidas                                                                                                                                                                |
| :----------------- | :---------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cliente**        | Únicamente sus turnos (`client_id = auth.uid()`)            | Crear reservas propias, consultar historial, cancelar o reprogramar dentro del plazo permitido. Modificar sus datos de perfil (nombre, teléfono).                                  |
| **Barbero**        | Únicamente turnos asignados a él (`barber_id = auth.uid()`) | Consultar su agenda, horario, servicio y datos de contacto indispensables del cliente. No accede a agendas de colegas ni a finanzas.                                               |
| **Recepción**      | Exclusivamente turnos de su sucursal activa (`branch_id`)   | Consultar agenda de la sucursal, crear reservas manuales (con o sin cuenta de cliente), marcar llegada, completar servicio vinculando a Caja, registrar ausencias o cancelaciones. |
| **Administración** | Global (todas las sucursales)                               | Visualización completa, filtrado multidimensional, reservas manuales, anulación, reprogramación y configuración de reglas de negocio (`booking_settings`).                         |

---

## 5. Experiencia Mobile y Directivas de Usabilidad

- Interfaz adaptada desde 320 px de ancho sin scroll horizontal indeseado ni solapamiento de teclados.
- Paginación estricta de 20 registros por página en todos los listados de turnos (cliente, barbero, recepción y administración).
- Zona horaria de Argentina (`America/Argentina/Buenos_Aires`) para todas las representaciones de fechas y franjas horarias.
