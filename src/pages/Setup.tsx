/** Shown when .env.local has no Firebase config — keeps `npm run dev` useful before setup. */
export default function Setup() {
  return (
    <div className="login">
      <div className="login-card">
        <div className="login-mark" aria-hidden>
          🔌
        </div>
        <h1>Connect Firebase</h1>
        <p className="muted">
          Create <code>.env.local</code> in the project root with your web app config, then restart{' '}
          <code>npm run dev</code>.
        </p>
        <pre className="code-block">{`VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=…
VITE_FIREBASE_PROJECT_ID=…
VITE_FIREBASE_STORAGE_BUCKET=…
VITE_FIREBASE_MESSAGING_SENDER_ID=…
VITE_FIREBASE_APP_ID=…`}</pre>
        <p className="muted small">
          Firebase console → Project settings → Your apps → Web app → SDK setup and configuration.
        </p>
      </div>
    </div>
  )
}
