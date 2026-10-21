import './google-access.css';

export function GoogleAccessButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <div className="google-access">
      <button type="button" className="google-access__button" disabled={busy} onClick={onClick}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
          <path
            fill="#4285F4"
            d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z"
          />
          <path
            fill="#34A853"
            d="M24 44c5.5 0 10.1-1.8 13.5-4.6l-6.6-5a12.2 12.2 0 0 1-18.2-6.3H5.9v5.2A20.4 20.4 0 0 0 24 44Z"
          />
          <path
            fill="#FBBC05"
            d="M12.7 28.1a12 12 0 0 1 0-8.2v-5.2H5.9a20.3 20.3 0 0 0 0 18.6l6.8-5.2Z"
          />
          <path
            fill="#EA4335"
            d="M24 12a11 11 0 0 1 7.8 3l5.8-5.8A19.5 19.5 0 0 0 24 4 20.4 20.4 0 0 0 5.9 14.7l6.8 5.2A12.1 12.1 0 0 1 24 12Z"
          />
        </svg>
        Continuar con Google
      </button>
      <p className="google-access__separator">o continuá con tus datos</p>
    </div>
  );
}
