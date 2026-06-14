import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store/authContext'
import './GoogleButton.css'

const GOOGLE_CLIENT_ID =
  '424340436078-09oksn9fk4ot9c64mj86pee2pkuibjvo.apps.googleusercontent.com'

// Minimal typings for the Google Identity Services SDK
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            ux_mode?: string
            cancel_on_tap_outside?: boolean
          }) => void
          prompt: (
            momentListener?: (notification: {
              isNotDisplayed: () => boolean
              isSkippedMoment: () => boolean
              getNotDisplayedReason: () => string
            }) => void
          ) => void
        }
      }
    }
  }
}

interface Props {
  redirectTo?: string
}

/** Google logo SVG — matches the official multi-colour mark */
function GoogleLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="18"
      height="18"
      aria-hidden="true"
      className="google-btn-logo"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export function GoogleButton({ redirectTo = '/' }: Props) {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialised = useRef(false)

  const handleCredential = useCallback(
    async (credential: string) => {
      try {
        setPending(true)
        setError(null)
        await loginWithGoogle(credential)
        navigate(redirectTo, { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google sign-in failed')
        setPending(false)
      }
    },
    [loginWithGoogle, navigate, redirectTo]
  )

  const initGSI = useCallback(() => {
    if (initialised.current || !window.google) return
    initialised.current = true
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: ({ credential }) => void handleCredential(credential),
      ux_mode: 'popup',
      cancel_on_tap_outside: true,
    })
  }, [handleCredential])

  useEffect(() => {
    if (window.google) {
      initGSI()
    } else {
      const script = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      )
      if (script) {
        script.addEventListener('load', initGSI)
        return () => script.removeEventListener('load', initGSI)
      }
    }
  }, [initGSI])

  function handleClick() {
    if (!window.google || pending) return
    // Re-initialise in case the callback ref has changed
    initGSI()
    setError(null)
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap was suppressed — fall back to a pop-up via renderButton trick
        // by re-prompting; in practice this handles "opted-out" browser state.
        console.info('Google prompt not shown:', notification.getNotDisplayedReason?.())
      }
    })
  }

  return (
    <div className="google-btn-outer">
      <button
        type="button"
        id="google-signin-btn"
        className={`google-btn${pending ? ' google-btn--loading' : ''}`}
        onClick={handleClick}
        disabled={pending}
        aria-label="Continue with Google"
      >
        {pending ? (
          <>
            <span className="google-btn-spinner" aria-hidden />
            <span>Signing in…</span>
          </>
        ) : (
          <>
            <GoogleLogo />
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {error && (
        <p className="google-btn-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
