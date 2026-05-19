"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"

function suggestSmtpHostFromEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail.includes("@")) return ""

  const domain = normalizedEmail.split("@")[1]
  if (!domain) return ""

  if (domain === "gmail.com") return "smtp.gmail.com"
  if (domain === "aol.com") return "smtp.aol.com"
  if (domain === "yahoo.com" || domain === "yahoo.co.uk") return "smtp.mail.yahoo.com"
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) return "smtp.office365.com"

  return ""
}

export default function LoginPage() {
  const [showOauth, setShowOauth] = useState(false)
  const [imapForm, setImapForm] = useState({
    email: "",
    password: "",
    imapHost: "",
    imapPort: "993",
  })
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const handleImapSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await signIn("credentials", {
      ...imapForm,
      callbackUrl: "/",
    })
    setLoading(false)
  }

  const handleDemoSignIn = async () => {
    setDemoLoading(true)
    await signIn("credentials", {
      email: "demo@example.com",
      password: "demo-mode",
      imapHost: "demo.local",
      imapPort: "993",
      callbackUrl: "/",
    })
    setDemoLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-slate-950/40 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✉️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Email Client</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to access your emails</p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleDemoSignIn}
            disabled={demoLoading}
            className="w-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
          >
            {demoLoading ? "Entering demo..." : "Continue in Demo Mode"}
          </button>

          <form onSubmit={handleImapSignIn} className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Sign in with IMAP/SMTP</h2>
            <div className="space-y-1">
              <label htmlFor="imap-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <input
                id="imap-email"
                name="email"
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={imapForm.email}
                onChange={e =>
                  setImapForm(f => {
                    const email = e.target.value
                    const previousSuggestedHost = suggestSmtpHostFromEmail(f.email)
                    const nextSuggestedHost = suggestSmtpHostFromEmail(email)
                    const shouldUpdateHost =
                      Boolean(nextSuggestedHost) && (!f.imapHost || f.imapHost === previousSuggestedHost)

                    return {
                      ...f,
                      email,
                      imapHost: shouldUpdateHost ? nextSuggestedHost : f.imapHost,
                    }
                  })
                }
                className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="imap-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password / App Password
              </label>
              <input
                id="imap-password"
                name="password"
                type="password"
                placeholder="Password / App Password"
                autoComplete="current-password"
                value={imapForm.password}
                onChange={e => setImapForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <label htmlFor="imap-host" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  IMAP/SMTP host
                </label>
                <input
                  id="imap-host"
                  name="imapHost"
                  type="text"
                  placeholder="IMAP/SMTP Host (e.g. imap.gmail.com or smtp.gmail.com)"
                  value={imapForm.imapHost}
                  onChange={e => setImapForm(f => ({ ...f, imapHost: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="w-24 space-y-1">
                <label htmlFor="imap-port" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Port
                </label>
                <input
                  id="imap-port"
                  name="imapPort"
                  type="number"
                  placeholder="Port"
                  inputMode="numeric"
                  min={1}
                  max={65535}
                  value={imapForm.imapPort}
                  onChange={e => setImapForm(f => ({ ...f, imapPort: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect via IMAP/SMTP"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowOauth(!showOauth)}
            className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-2"
          >
            {showOauth ? "Hide OAuth2 sign-in options" : "Use OAuth2 sign-in options instead"}
          </button>

          {showOauth && (
            <>
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="w-full flex items-center justify-center gap-3 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium text-gray-700 dark:text-gray-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/" })}
                className="w-full flex items-center justify-center gap-3 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium text-gray-700 dark:text-gray-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#F25022" d="M1 1h10v10H1z"/>
                  <path fill="#00A4EF" d="M13 1h10v10H13z"/>
                  <path fill="#7FBA00" d="M1 13h10v10H1z"/>
                  <path fill="#FFB900" d="M13 13h10v10H13z"/>
                </svg>
                Continue with Microsoft
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Use the Continue in Demo Mode option for instant access without external account setup.
        </p>
      </div>
    </div>
  )
}
