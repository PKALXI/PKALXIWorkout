import { useState } from 'react'
import { useAuth } from '../auth'

export default function Login() {
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSignIn() {
    setBusy(true)
    setError(null)
    try {
      await signIn()
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError(null)
      } else {
        setError((e as Error).message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-mark" aria-hidden>
          🏋️
        </div>
        <h1>Workout Tracker</h1>
        <p className="muted">
          Build your split, log every set, and watch the numbers go up.
        </p>
        <button className="btn btn-primary btn-lg" onClick={handleSignIn} disabled={busy}>
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
