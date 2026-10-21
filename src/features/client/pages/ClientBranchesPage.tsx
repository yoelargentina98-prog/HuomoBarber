import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAvailableBranches,
  getAvailableServices,
  getAvailableBarbers,
} from '../../appointments/services/appointments-service';
import { formatCurrency } from '../../../shared/utils/currency';

interface BranchViewData {
  id: string;
  name: string;
  address: string;
  phone: string;
  services: Array<{
    id: string;
    name: string;
    description: string;
    priceCents: number;
    durationMinutes: number;
  }>;
  barbers: Array<{
    barberId: string;
    barberName: string;
    serviceNames: string[];
  }>;
}

export function ClientBranchesPage() {
  const [branchData, setBranchData] = useState<BranchViewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const branches = await getAvailableBranches();
        const fullData: BranchViewData[] = [];

        for (const branch of branches) {
          const services = await getAvailableServices(branch.id);

          // Cargar barberos y mapear qué servicios ofrece cada uno
          const barberMap = new Map<
            string,
            { barberId: string; barberName: string; serviceNames: string[] }
          >();

          for (const svc of services) {
            const barbersForSvc = await getAvailableBarbers(branch.id, svc.id);
            for (const b of barbersForSvc) {
              if (!barberMap.has(b.barberId)) {
                barberMap.set(b.barberId, {
                  barberId: b.barberId,
                  barberName: b.barberName,
                  serviceNames: [svc.name],
                });
              } else {
                barberMap.get(b.barberId)!.serviceNames.push(svc.name);
              }
            }
          }

          fullData.push({
            id: branch.id,
            name: branch.name,
            address: branch.address,
            phone: branch.phone,
            services,
            barbers: Array.from(barberMap.values()),
          });
        }

        if (active) setBranchData(fullData);
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : 'No se pudieron cargar las sucursales.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Sucursales y Profesionales
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
          Conocé nuestras casas, nuestro equipo de barberos y los servicios disponibles en cada
          sede.
        </p>
      </div>

      {loading && <p style={{ color: '#9ca3af' }}>Cargando información de sucursales…</p>}
      {error && (
        <div className="welcome-alert-error" role="alert">
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {branchData.map(b => (
          <section
            key={b.id}
            style={{
              padding: '2rem',
              background: '#15181e',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                paddingBottom: '1.25rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Sucursal {b.name}
                </h2>
                <p style={{ color: '#9ca3af', fontSize: '0.95rem', margin: '0.35rem 0 0' }}>
                  {b.address ? `📍 ${b.address}` : 'Dirección oficial'}
                  {b.phone ? ` • 📞 ${b.phone}` : ''}
                </p>
              </div>
              <Link
                to="/cliente/reservar"
                className="client-cta-button"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
              >
                Reservar en {b.name} →
              </Link>
            </div>

            {/* Barberos de la sucursal */}
            <div style={{ marginBottom: '2rem' }}>
              <h3
                style={{
                  fontSize: '1.1rem',
                  color: '#c59b27',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 700,
                }}
              >
                Equipo de Barberos
              </h3>
              {b.barbers.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  No hay barberos asignados temporalmente a esta sucursal.
                </p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {b.barbers.map(barber => (
                    <div
                      key={barber.barberId}
                      style={{
                        padding: '1rem',
                        background: '#0e1013',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                      }}
                    >
                      <strong
                        style={{
                          color: '#fff',
                          display: 'block',
                          fontSize: '1.05rem',
                          marginBottom: '0.35rem',
                        }}
                      >
                        {barber.barberName}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          display: 'block',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Servicios que realiza:
                      </span>
                      <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
                        {barber.serviceNames.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Servicios y Tarifas de la sucursal */}
            <div>
              <h3
                style={{
                  fontSize: '1.1rem',
                  color: '#d1d5db',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 700,
                }}
              >
                Servicios y Tarifas en {b.name}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {b.services.map(svc => (
                  <div
                    key={svc.id}
                    style={{
                      padding: '0.85rem 1rem',
                      background: '#0e1013',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          color: '#fff',
                          fontWeight: 600,
                          display: 'block',
                          fontSize: '0.92rem',
                        }}
                      >
                        {svc.name}
                      </span>
                      <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                        {svc.durationMinutes} min
                      </span>
                    </div>
                    <span style={{ color: '#c59b27', fontWeight: 700, fontSize: '0.95rem' }}>
                      {formatCurrency(svc.priceCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
