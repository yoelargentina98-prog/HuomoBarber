import { CustomerSelector } from '../../club/CustomerSelector';
import type { ClubClient } from '../../club/service';
import '../../club/club.css';
import { useRef, useState } from 'react';
import { SaveForm } from '../../../shared/components/SaveForm';
import { field } from '../../../shared/lib/form';
import { money } from '../../employees/model/money';
import { registerSale, type SaleInput, type SaleOption } from './service';

export function SaleFields({
  branch,
  options,
  onSaved,
}: {
  branch: string;
  options: SaleOption[];
  onSaved: () => void;
}) {
  const [customerNumber, setCustomerNumber] = useState('');
  const [customer, setCustomer] = useState<ClubClient | null>(null);
  const [employee, setEmployee] = useState('');
  const [service, setService] = useState('');
  const [request] = useState(() => crypto.randomUUID());
  const snapshot = useRef<SaleInput | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [complete, setComplete] = useState(false);
  const barbers = [...new Map(options.map(option => [option.employee_id, option])).values()];
  const available = options.filter(option => option.employee_id === employee);
  const selected = available.find(option => option.service_id === service);
  // Keep the entire attempted sale immutable until the result is reviewed. Changing
  // a sale after an uncertain response must not create a second service/receipt.
  return (
    <SaveForm
      label={complete ? 'Venta registrada' : 'Registrar venta y cobro'}
      onSaved={onSaved}
      save={async data => {
        if (complete) return;
        if (!selected) throw new Error('Seleccioná un barbero y un servicio habilitado.');
        if (customerNumber && customer?.customer_number !== customerNumber)
          throw new Error(
            'Verificá el número de cliente antes de guardar o dejalo vacío para cliente ocasional.'
          );
        setAttempted(true);
        snapshot.current ??= {
          branch,
          customerNumber: customer?.customer_number,
          employee,
          service,
          method: field(data, 'method'),
          price: selected.price_cents,
          reference: field(data, 'reference').trim(),
          notes: field(data, 'notes').trim(),
        };
        await registerSale(snapshot.current, request);
        setComplete(true);
      }}
    >
      <CustomerSelector
        branch={branch}
        disabled={attempted}
        onSelect={setCustomer}
        onNumberChange={setCustomerNumber}
      />
      <fieldset className="form-wide" disabled={attempted}>
        <label>
          Barbero
          <select
            required
            value={employee}
            aria-readonly={attempted}
            onChange={event => {
              if (!attempted) {
                setEmployee(event.target.value);
                setService('');
              }
            }}
          >
            <option value="">Elegí el barbero</option>
            {barbers.map(barber => (
              <option key={barber.employee_id} value={barber.employee_id}>
                {barber.barber_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Servicio
          <select
            required
            value={service}
            aria-readonly={attempted}
            onChange={event => {
              if (!attempted) setService(event.target.value);
            }}
          >
            <option value="">Elegí el servicio</option>
            {available.map(option => (
              <option key={option.service_id} value={option.service_id}>
                {option.service_name} · {money(option.price_cents)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cómo se pagó
          <select
            name="method"
            required
            defaultValue=""
            onPointerDown={event => {
              if (attempted) event.preventDefault();
            }}
          >
            <option value="">Elegí el medio de pago</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
          </select>
        </label>
        <label>
          Importe de la venta
          <input
            readOnly
            value={selected ? money(selected.price_cents) : ''}
            placeholder="Seleccioná un servicio"
          />
        </label>
        <label>
          Referencia de transferencia (opcional)
          <input name="reference" maxLength={200} readOnly={attempted} />
        </label>
        <label>
          Notas de la venta (opcional)
          <input name="notes" maxLength={1000} readOnly={attempted} />
        </label>
      </fieldset>
      {attempted && (
        <p className="employee-help form-wide">
          Si no recibiste confirmación, reintentá esta misma venta o actualizá Caja para revisar si
          quedó registrada. Para corregir un error de validación, cerrá y abrí el formulario.
        </p>
      )}
    </SaveForm>
  );
}
