import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEmployeeRecord } from '../hooks/useEmployeeRecord';
import { currentMonth } from '../model/period';
import { EmployeeOverview } from '../components/EmployeeOverview';
import { CompensationPanel } from '../components/CompensationPanel';
import { ServicesPanel } from '../components/ServicesPanel';
import { AdjustmentsPanel } from '../components/AdjustmentsPanel';
import { PersonalPanel } from '../components/PersonalPanel';
import { ActivityPanel } from '../components/ActivityPanel';
import { BarberServicesPanel } from '../../catalog/components/BarberServicesPanel';
import { SchedulePanel } from '../../schedules/SchedulePanel';
import { useStaffData } from '../../staff/hooks/staff-context';
import '../styles/employee.css';

const tabs = {
  overview: 'Resumen',
  services: 'Servicios',
  assignments: 'Servicios habilitados',
  schedule: 'Horarios',
  compensation: 'Remuneración',
  adjustments: 'Extras y bonos',
  personal: 'Datos y acceso',
  activity: 'Actividad',
} as const;
type Tab = keyof typeof tabs;
export function EmployeePage() {
  const { employeeId = '' } = useParams();
  const [month, setMonth] = useState(currentMonth);
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const requested = params.get('tab');
    return requested && requested in tabs ? (requested as Tab) : 'overview';
  });
  const { record, loading, error, refresh } = useEmployeeRecord(employeeId, month);
  const staff = useStaffData();
  function saved() {
    refresh();
    staff.refresh();
  }
  return (
    <div className="dashboard-stack">
      <Link className="text-link" to="/admin/personal">
        ← Volver al equipo
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FICHA INDIVIDUAL</span>
          <h1>
            {record
              ? `Empleado #${String(record.details.employee_number).padStart(4, '0')}`
              : 'Ficha del empleado'}
          </h1>
          <p>
            {record
              ? 'Historial, desempeño y condiciones de trabajo.'
              : 'Consultando información del empleado.'}
          </p>
        </div>
        <label className="employee-period">
          Período
          <input
            type="month"
            value={month}
            required
            onChange={event => {
              if (event.target.value) setMonth(event.target.value);
            }}
          />
        </label>
      </div>
      {error && (
        <div className="data-error" role="alert">
          <p>{error}</p>
          <button className="action-secondary" onClick={refresh}>
            Reintentar
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="employee-help">
          {record ? 'Actualizando ficha…' : 'Cargando ficha…'}
        </p>
      )}
      {record && (
        <>
          <section className="employee-identity">
            <span className="employee-photo">
              {(record.profile.full_name ?? record.profile.username ?? '?')
                .slice(0, 1)
                .toUpperCase()}
            </span>
            <div>
              <h2>{record.profile.full_name ?? record.profile.username}</h2>
              <p>
                {record.profile.role === 'barber' ? 'Barbero' : 'Recepcionista'} · @
                {record.profile.username ?? 'sin usuario'}
              </p>
              <p>Sucursal: {record.profile.branch_name ?? 'Pendiente de asignación'}</p>
              <small>ID completo: {record.profile.id}</small>
            </div>
            <span
              className={`role-tag ${record.details.active ? 'role-barber' : 'role-reception'}`}
            >
              {record.details.active ? 'Activo' : 'Inactivo'}
            </span>
          </section>
          <nav className="employee-tabs" aria-label="Secciones de la ficha">
            {Object.entries(tabs)
              .filter(
                ([key]) =>
                  !['assignments', 'schedule'].includes(key) || record.profile.role === 'barber'
              )
              .map(([key, label]) => (
                <button
                  key={key}
                  aria-current={tab === key ? 'page' : undefined}
                  onClick={() => setTab(key as Tab)}
                >
                  {label}
                </button>
              ))}
          </nav>
          {tab === 'overview' && (
            <EmployeeOverview
              record={record}
              month={month}
              onConfigure={() => setTab('compensation')}
            />
          )}
          {tab === 'services' && (
            <ServicesPanel record={record} onSaved={saved} onAssign={() => setTab('assignments')} />
          )}
          {tab === 'assignments' && record.profile.role === 'barber' && (
            <BarberServicesPanel
              employeeId={record.profile.id}
              onSaved={saved}
              onChooseBranch={() => setTab('personal')}
            />
          )}
          {tab === 'compensation' && (
            <CompensationPanel record={record} month={month} onSaved={saved} />
          )}
          {tab === 'schedule' && record.profile.role === 'barber' && (
            <SchedulePanel employeeId={record.profile.id} onSaved={saved} />
          )}
          {tab === 'adjustments' && (
            <AdjustmentsPanel record={record} month={month} onSaved={saved} />
          )}
          {tab === 'personal' && <PersonalPanel record={record} onSaved={saved} />}
          {tab === 'activity' && (
            <ActivityPanel
              audit={record.audit}
              source={
                record.period
                  ? {
                      resource: 'employee_audit',
                      filters: { employee: record.profile.id },
                      revision: record.version,
                    }
                  : undefined
              }
            />
          )}
        </>
      )}
    </div>
  );
}
