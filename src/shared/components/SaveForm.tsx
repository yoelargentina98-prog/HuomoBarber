import { useRef, useState, type FormEvent, type ReactNode } from 'react';

export function SaveForm({
  children,
  save,
  onSaved,
  label = 'Guardar cambios',
  resetOnSuccess = false,
}: {
  children: ReactNode;
  save: (data: FormData) => Promise<void>;
  onSaved: () => void;
  label?: string;
  resetOnSuccess?: boolean;
}) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    pending.current = true;
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      await save(data);
      if (resetOnSuccess) form.reset();
      setSuccess(true);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="employee-form" onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>{children}</fieldset>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="employee-success" role="status">
          Guardado correctamente.
        </p>
      )}
      <button type="submit" className="action-primary" disabled={busy}>
        {busy ? 'Guardando…' : label}
      </button>
    </form>
  );
}
