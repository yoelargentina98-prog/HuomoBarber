import { SaveForm } from '../../../shared/components/SaveForm';
import { field } from '../../../shared/lib/form';
import { SERVICE_CATEGORIES } from '../../employees/model/types';
import { saveCatalog, type CatalogService } from '../services/catalog-service';

export function CatalogForm({
  service,
  onSaved,
  onCancel,
}: {
  service?: CatalogService;
  onSaved: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="management-card">
      <div className="section-heading">
        <h2>{service ? 'Editar servicio' : 'Nuevo servicio'}</h2>
        <button className="text-button" onClick={onCancel}>
          Cerrar
        </button>
      </div>
      <SaveForm
        label={service ? 'Guardar servicio' : 'Crear servicio'}
        onSaved={onSaved}
        save={data =>
          saveCatalog(
            {
              name: field(data, 'name'),
              description: field(data, 'description'),
              category: field(data, 'category'),
              duration_minutes: Number(field(data, 'duration')),
            },
            service?.id
          )
        }
      >
        <label>
          Nombre del servicio
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            placeholder="Ej. Perfilado de cejas"
            defaultValue={service?.name ?? ''}
          />
        </label>
        <label>
          Categoría para estadísticas
          <select name="category" defaultValue={service?.category ?? 'other'}>
            {Object.entries(SERVICE_CATEGORIES).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Duración (minutos)
          <input
            name="duration"
            type="number"
            min={5}
            max={1440}
            step={1}
            required
            defaultValue={service?.duration_minutes ?? 30}
          />
        </label>
        <label className="form-wide">
          Descripción
          <textarea
            name="description"
            maxLength={1000}
            rows={3}
            defaultValue={service?.description ?? ''}
          />
        </label>
      </SaveForm>
      <p className="employee-help">
        La categoría organiza las estadísticas. Todos los servicios usan la misma comisión del
        barbero.
      </p>
    </section>
  );
}
