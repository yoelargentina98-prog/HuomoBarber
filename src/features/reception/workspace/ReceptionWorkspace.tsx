import { useState } from 'react';
import { CashPage } from '../../cash/CashPage';
import type { CashOperator } from '../../cash/sales/service';
import { useBranches } from '../../branches/hooks/useBranches';
import { useReceptionTeam } from './useReceptionTeam';
import { ReceptionTeam } from './ReceptionTeam';
import { ReceptionSummary } from './ReceptionSummary';
import { ReceptionShell } from './ReceptionShell';
import type { ReceptionSection } from './model';
import { ReceptionAgenda } from '../agenda/ReceptionAgenda';
import '../../staff/staff.css';
import '../../../styles/forms.css';
export function ReceptionWorkspace({
  operator,
  busy,
  error,
  onLogout,
}: {
  operator: CashOperator;
  busy: boolean;
  error: string;
  onLogout: () => void;
}) {
  const [section, setSection] = useState<ReceptionSection>('overview');
  const [chosenBranch, setBranch] = useState('');
  const [startSale, setStartSale] = useState(false);
  const branch = operator.role === 'reception' ? (operator.branchId ?? '') : chosenBranch;
  const { branches, error: branchError, refresh: refreshBranches } = useBranches();
  const team = useReceptionTeam(branch);
  function openCash(newSale: boolean) {
    setStartSale(newSale);
    setSection('cash');
  }
  function navigate(next: ReceptionSection) {
    setStartSale(false);
    setSection(next);
  }
  return (
    <ReceptionShell
      operator={operator}
      busy={busy}
      error={error}
      onLogout={onLogout}
      section={section}
      onNavigate={navigate}
    >
      {operator.role === 'admin' && section !== 'cash' && (
        <div className="reception-branch-select">
          <label>
            Sucursal de consulta
            <select value={branch} onChange={event => setBranch(event.target.value)}>
              <option value="">Elegí una sucursal</option>
              {branches.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {branchError && (
            <div role="alert">
              <p>{branchError}</p>
              <button onClick={refreshBranches}>Reintentar sucursales</button>
            </div>
          )}
        </div>
      )}
      {section === 'overview' && (
        <>
          <section className="reception-welcome">
            <div>
              <span className="eyebrow">EL BUEN SERVICIO EMPIEZA ACÁ</span>
              <h1>Hola, {operator.name?.split(' ')[0] || 'equipo'}.</h1>
              <p>
                Tu sucursal, tu equipo y los cobros del día.
                <br />
                Todo a mano para recibir a cada cliente.
              </p>
            </div>
            <div className="reception-welcome-branch">
              <span>HOY EN</span>
              <strong>
                {operator.branchName || branches.find(item => item.id === branch)?.name || 'Huomo'}
              </strong>
              <small>RECEPCIÓN</small>
            </div>
          </section>
          {branch ? (
            <ReceptionSummary
              branch={branch}
              team={team.team}
              activeBarbers={team.activeBarbers}
              teamLoading={team.loading}
              teamError={team.error}
              onCash={openCash}
              onTeam={() => navigate('team')}
            />
          ) : (
            <p className="empty-copy">Elegí una sucursal para consultar su resumen.</p>
          )}
        </>
      )}
      {section === 'cash' && (
        <CashPage
          key={`${operator.role}/${branch}`}
          operator={operator}
          initialBranch={branch}
          startSale={startSale}
        />
      )}
      {section === 'team' && (
        <>
          <div className="page-heading">
            <div>
              <span className="eyebrow">TU SUCURSAL</span>
              <h1>Equipo</h1>
              <p>
                Barberos y recepcionistas de{' '}
                {operator.branchName ||
                  branches.find(item => item.id === branch)?.name ||
                  'la sucursal seleccionada'}
                .
              </p>
            </div>
          </div>
          {branch ? (
            <ReceptionTeam
              source={{ resource: 'reception_team', filters: { branch }, revision: team.revision }}
              team={team.team}
              loading={team.loading}
              error={team.error}
              onRefresh={team.refresh}
            />
          ) : (
            <p>Elegí una sucursal para ver sus empleados.</p>
          )}
        </>
      )}
      {section === 'agenda' && branch && (
        <ReceptionAgenda
          branchId={branch}
          branchName={
            operator.branchName || branches.find(b => b.id === branch)?.name || 'Sucursal'
          }
        />
      )}
    </ReceptionShell>
  );
}
