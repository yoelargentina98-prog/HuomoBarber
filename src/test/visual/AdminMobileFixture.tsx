import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AdminShell } from '../../features/admin/components/AdminShell';
import { StaffList } from '../../features/staff/components/StaffList';
import { WeekResults } from '../../features/staff/dashboard/WeekResults';
import { PaymentList } from '../../features/cash/PaymentList';
import { ExpenseList } from '../../features/branches/finance/ExpenseList';
import { BalanceCards } from '../../features/branches/finance/BalanceCards';
import { BalanceChart } from '../../features/branches/finance/BalanceChart';
import { CompensationPanel } from '../../features/employees/components/CompensationPanel';
import { EmployeeOverview } from '../../features/employees/components/EmployeeOverview';
import { SaveForm } from '../../shared/components/SaveForm';
import { person, payment, record, balances, expense } from './admin-fixtures';
import '../../styles/index.css';
import '../../features/admin/admin.css';
import '../../features/employees/styles/employee.css';
import '../../features/staff/dashboard/dashboard.css';
import '../../features/cash/cash.css';
import '../../features/branches/finance/finance.css';
import '../../features/catalog/styles/catalog.css';

const noop = () => {};
export function FormFields() {
  return (
    <SaveForm label="Guardar prueba local" save={async () => {}} onSaved={noop}>
      <label>
        Nombre completo
        <input defaultValue={person.full_name} />
      </label>
      <label>
        Sucursal
        <select>
          <option>Irigoyen</option>
          <option>Mosconi</option>
        </select>
      </label>
      <label>
        Servicio
        <select>
          <option>{payment.service_name}</option>
        </select>
      </label>
      <label>
        Importe (ARS)
        <input inputMode="decimal" defaultValue="125000.00" />
      </label>
      <label className="form-wide">
        Notas
        <textarea defaultValue={payment.notes ?? ''} />
      </label>
    </SaveForm>
  );
}
export function Fixture() {
  const { pathname } = useLocation();
  const modal = useRef<HTMLDialogElement>(null);
  const section = pathname.includes('/caja')
    ? 'Caja'
    : pathname.includes('/servicios')
      ? 'Servicios'
      : pathname.includes('/sucursales')
        ? 'Sucursales'
        : pathname.includes('/personal')
          ? 'Equipo'
          : 'Resumen';
  return (
    <AdminShell leaving={false} logoutError="" onLogout={noop}>
      <div className="dashboard-stack">
        <div className="page-heading">
          <div>
            <span className="eyebrow">VISTA LOCAL DE PRUEBA</span>
            <h1>{section}</h1>
            <p>Gestión de Huomo Barber. Datos de prueba para revisar pantallas chicas.</p>
          </div>
          <button className="action-primary" onClick={() => modal.current?.showModal()}>
            Nueva venta de prueba
          </button>
        </div>
        {section === 'Resumen' && (
          <>
            <section className="dashboard-welcome">
              <div>
                <span className="eyebrow">TU NEGOCIO, EN ORDEN</span>
                <h2>
                  Todo tu equipo.
                  <br />
                  Un mismo lugar.
                </h2>
                <p>Administrá tus sucursales, empleados y cobros.</p>
                <Link className="action-primary" to="/admin/personal">
                  Ver equipo
                </Link>
              </div>
            </section>
            <div className="metrics-grid">
              {['Personas en el equipo', 'Barberos', 'Recepcionistas'].map(label => (
                <article className="metric-card" key={label}>
                  <div>
                    <span>{label}</span>
                  </div>
                  <strong>12</strong>
                  <p>Cuentas registradas</p>
                </article>
              ))}
            </div>
            <section className="management-card">
              <h2>Equipo</h2>
              <StaffList members={[person]} />
            </section>
          </>
        )}
        {section === 'Equipo' && (
          <>
            <section className="management-card team-week">
              <h2>Desempeño semanal</h2>
              <div className="team-week-filters">
                <button className="action-secondary">←</button>
                <label>
                  Semana del
                  <input type="date" defaultValue="2026-10-19" />
                </label>
                <button className="action-secondary">→</button>
                <button className="text-button">Esta semana</button>
                <label>
                  Sucursal
                  <select>
                    <option>Todas las sucursales</option>
                  </select>
                </label>
              </div>
              <WeekResults
                rows={[
                  {
                    employee_id: person.id,
                    full_name: person.full_name,
                    username: person.username,
                    service_count: 12,
                    revenue_cents: 12500000,
                    commission_cents: 3750000,
                  },
                ]}
              />
            </section>
            <section className="management-card">
              <div className="staff-toolbar">
                <label className="staff-search">
                  <input
                    type="search"
                    aria-label="Buscar personal"
                    placeholder="Buscar personal…"
                  />
                </label>
                <select aria-label="Rol">
                  <option>Todos los roles</option>
                </select>
              </div>
              <StaffList members={[person]} />
            </section>
            <nav className="employee-tabs" aria-label="Secciones del empleado">
              {[
                'Resumen',
                'Servicios',
                'Servicios habilitados',
                'Horarios',
                'Remuneración',
                'Extras y bonos',
                'Datos y acceso',
                'Actividad',
              ].map(tab => (
                <button key={tab}>{tab}</button>
              ))}
            </nav>
            <EmployeeOverview record={record} month="2026-10" onConfigure={noop} />
            <CompensationPanel record={record} month="2026-10" onSaved={noop} />
          </>
        )}
        {section === 'Servicios' && (
          <>
            <section className="management-card">
              <h2>Nuevo servicio</h2>
              <FormFields />
            </section>
            <section className="management-card">
              <table role="table" className="staff-table">
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Precio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td data-label="Servicio">{payment.service_name}</td>
                    <td data-label="Precio">$ 125.000,00</td>
                    <td data-label="Acciones">
                      <button className="text-button">Precios por sucursal</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </>
        )}
        {section === 'Sucursales' && (
          <>
            <div className="metrics-grid">
              {['Irigoyen', 'Mosconi'].map(name => (
                <article key={name} className="management-card">
                  <h2>{name}</h2>
                  <p className="employee-help">Dirección y teléfono de la sucursal</p>
                  <div className="form-actions">
                    <button className="text-button">Ver balance y gastos</button>
                    <button className="text-button">Editar</button>
                  </div>
                </article>
              ))}
            </div>
            <section className="management-card">
              <h2>Balance del mes</h2>
              <BalanceCards rows={balances} />
              <BalanceChart rows={balances} />
            </section>
            <ExpenseList expenses={[expense]} onSaved={noop} />
          </>
        )}
        {section === 'Caja' && (
          <>
            <section className="management-card">
              <div className="cash-filters">
                <label>
                  Fecha de Caja
                  <input type="date" defaultValue="2026-10-21" />
                </label>
                <label>
                  Sucursal
                  <select>
                    <option>Todas las sucursales</option>
                  </select>
                </label>
                <button className="text-button">Hoy</button>
              </div>
              <div className="cash-totals">
                {['Total cobrado', 'Efectivo', 'Transferencias'].map(label => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>$ 1.250.000,00</strong>
                    <small>40 cobros</small>
                  </article>
                ))}
              </div>
            </section>
            <section className="management-card">
              <div className="section-heading">
                <h2>Cobros registrados</h2>
                <label className="cash-medium">
                  Medio de pago
                  <select>
                    <option>Transferencia</option>
                  </select>
                </label>
              </div>
              <PaymentList payments={[payment]} onSaved={noop} canVoid={false} />
            </section>
          </>
        )}
        <dialog className="sale-modal" ref={modal}>
          <section className="management-card">
            <div className="section-heading">
              <h2>Nueva venta</h2>
              <button className="text-button" onClick={() => modal.current?.close()}>
                Cerrar formulario
              </button>
            </div>
            <p className="employee-help">Formulario de prueba, sin conexión a datos reales.</p>
            <FormFields />
          </section>
        </dialog>
      </div>
    </AdminShell>
  );
}
