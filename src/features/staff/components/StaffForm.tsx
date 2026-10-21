import { useRef, useState, type FormEvent } from 'react';
import { createStaff, type StaffInput, type StaffMember } from '../services/staff-service';
import { Button } from '../../../shared/components/Button';
import { BranchSelect } from '../../branches/components/BranchSelect';

export function StaffForm({ onCreated }: { onCreated: (member: StaffMember) => void }) {
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState('barber');
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    inFlight.current = true;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const member = await createStaff({
        username: String(fields.get('username')),
        password: String(fields.get('password')),
        full_name: String(fields.get('full_name')),
        phone: String(fields.get('phone')),
        role: String(fields.get('role')) as StaffInput['role'],
        branch_id: String(fields.get('branch_id') ?? '') || null,
      });
      form.reset();
      setSuccess(`Empleado ${member.full_name ?? member.username} creado correctamente.`);
      onCreated(member);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el empleado.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="card staff-stack">
      <h2>Crear empleado</h2>
      <form className="staff-form" onSubmit={submit} aria-busy={busy}>
        <label>
          Nombre completo
          <input name="full_name" required minLength={2} maxLength={100} autoComplete="name" />
        </label>
        <label>
          Nombre de usuario
          <input
            name="username"
            required
            minLength={3}
            maxLength={40}
            pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]*"
            autoCapitalize="none"
            autoComplete="off"
            aria-describedby="username-help"
          />
        </label>
        <p id="username-help">Único, de 3 a 40 caracteres. Sin espacios ni correo electrónico.</p>
        <label>
          Rol
          <select name="role" required value={role} onChange={event => setRole(event.target.value)}>
            <option value="barber">Barbero</option>
            <option value="reception">Recepcionista</option>
          </select>
        </label>
        <BranchSelect required={role === 'barber'} />
        <label>
          Teléfono (opcional)
          <input name="phone" type="tel" maxLength={30} autoComplete="tel" />
        </label>
        <label>
          Contraseña inicial
          <input
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            aria-describedby="password-help"
          />
        </label>
        <p id="password-help">
          Entre 12 y 128 caracteres. Entregala al empleado por un medio privado.
        </p>
        <Button type="submit" disabled={busy}>
          {busy ? 'Creando…' : 'Crear empleado'}
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </section>
  );
}
