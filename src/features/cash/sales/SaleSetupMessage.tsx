import { Paginated } from '../../../shared/components/Paginated';
import { Link } from 'react-router-dom';
import type { SaleSetup } from './service';
export function SaleSetupMessage({
  setup,
  admin,
  onClose,
}: {
  setup: SaleSetup;
  admin: boolean;
  onClose: () => void;
}) {
  const active = setup.barbers.filter(barber => barber.active);
  return (
    <div className="sale-setup" role="status">
      <h3>Falta completar la configuración</h3>
      {!setup.branchActive ? (
        <p>Esta sucursal está inactiva.</p>
      ) : (
        <>
          {!active.length && <p>No hay barberos activos asignados a esta sucursal.</p>}
          {setup.serviceCount === 0 && (
            <p>No hay servicios activos con precio mayor a cero habilitados en esta sucursal.</p>
          )}
          {active.length > 0 && setup.serviceCount > 0 && (
            <p>
              La sucursal tiene servicios con precio, pero sus barberos todavía no tienen ninguno de
              esos servicios habilitado.
            </p>
          )}
          <Paginated items={active}>
            {pageRows => (
              <>
                {pageRows.map(barber => (
                  <div key={barber.id} className="sale-setup-barber">
                    <p>
                      <strong>{barber.name}</strong> · {barber.enabledCount} servicios disponibles
                      para vender.
                    </p>
                    {admin && (
                      <Link
                        className="text-link"
                        to={`/admin/personal/${barber.id}?tab=assignments`}
                        onClick={onClose}
                      >
                        Asignar servicios a {barber.name} →
                      </Link>
                    )}
                  </div>
                ))}
              </>
            )}
          </Paginated>
        </>
      )}
      {admin ? (
        <div className="form-actions">
          <Link className="text-link" to="/admin/servicios" onClick={onClose}>
            Revisar servicios y precios
          </Link>
          {!active.length && (
            <Link className="text-link" to="/admin/personal" onClick={onClose}>
              Revisar equipo
            </Link>
          )}
        </div>
      ) : (
        <p>
          Pedile al administrador que complete las asignaciones y precios. Recepción no puede
          modificar esa configuración.
        </p>
      )}
    </div>
  );
}
