import { useEffect, useRef, useState } from "react"
import axios from "axios"
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClassmatesLogo } from "@/pages/auth/login/components/classmates-logo"
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
} from "@/pages/auth/redux/auth.api"

type Step = "identify" | "verify" | "reset" | "success"

const PERSONA_KEY = "spas:password-reset:persona"
const TOKEN_KEY = "spas:password-reset:token"

function readError(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback
  const data = error.response?.data as Record<string, unknown> | undefined
  if (!data) return fallback
  for (const key of [
    "code",
    "newPassword",
    "new_password",
    "resetToken",
    "reset_token",
    "detail",
  ]) {
    const value = data[key]
    if (typeof value === "string") return value
    if (Array.isArray(value) && typeof value[0] === "string") return value[0]
  }
  return fallback
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const savedToken = sessionStorage.getItem(TOKEN_KEY) ?? ""
  const [step, setStep] = useState<Step>(savedToken ? "reset" : "identify")
  const [persona, setPersona] = useState(
    sessionStorage.getItem(PERSONA_KEY) ?? ""
  )
  const [code, setCode] = useState("")
  const [resetToken, setResetToken] = useState(savedToken)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [resendSeconds, setResendSeconds] = useState(0)
  const codeInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === "verify") codeInput.current?.focus()
  }, [step])

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setInterval(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000
    )
    return () => window.clearInterval(timer)
  }, [resendSeconds])

  async function sendCode() {
    const normalizedPersona = persona.trim()
    if (!normalizedPersona) {
      setError("Enter your username or email address.")
      return
    }
    setIsSubmitting(true)
    setError("")
    try {
      await requestPasswordReset(normalizedPersona)
      sessionStorage.setItem(PERSONA_KEY, normalizedPersona)
      setPersona(normalizedPersona)
      setCode("")
      setStep("verify")
      setResendSeconds(60)
    } catch (requestError) {
      setError(
        readError(
          requestError,
          "We couldn't send a code right now. Please try again."
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit verification code.")
      return
    }
    setIsSubmitting(true)
    setError("")
    try {
      const token = await verifyPasswordResetCode(persona, code)
      sessionStorage.setItem(TOKEN_KEY, token)
      setResetToken(token)
      setStep("reset")
    } catch (requestError) {
      setError(
        readError(
          requestError,
          "That code is invalid or expired. Request a new code."
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function savePassword() {
    if (newPassword.length < 8) {
      setError("Use at least 8 characters for your new password.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.")
      return
    }
    setIsSubmitting(true)
    setError("")
    try {
      await confirmPasswordReset(resetToken, newPassword)
      sessionStorage.removeItem(PERSONA_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
      setStep("success")
    } catch (requestError) {
      setError(
        readError(
          requestError,
          "Your reset session expired. Request a new code."
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function startOver() {
    sessionStorage.removeItem(TOKEN_KEY)
    setResetToken("")
    setCode("")
    setError("")
    setStep("identify")
  }

  const stepNumber = step === "identify" ? 1 : step === "verify" ? 2 : 3

  return (
    <div className="flex min-h-screen w-full flex-col bg-background px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="bg-card px-6 py-8 sm:px-9 sm:py-10">
          <ClassmatesLogo className="mb-8" />

          {step !== "success" && (
            <div
              className="mb-7 flex items-center gap-2"
              aria-label={`Step ${stepNumber} of 3`}
            >
              {[1, 2, 3].map((number) => (
                <div
                  key={number}
                  className={`h-1 flex-1 rounded-full ${number <= stepNumber ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
          )}

          {step === "identify" && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void sendCode()
              }}
            >
              <Mail className="mb-4 size-5 text-primary" />
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                Reset Your Password
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Enter the username or email connected to your SPAS account.
                We’ll email a six-digit code if the account is active.
              </p>
              <div className="mt-6 space-y-[5px]">
                <Label htmlFor="reset-persona">Username or email</Label>
                <Input
                  id="reset-persona"
                  value={persona}
                  onChange={(event) => setPersona(event.target.value)}
                  autoComplete="username"
                  placeholder="teacher01 or you@college.edu.np"
                  disabled={isSubmitting}
                />
              </div>
              {error && (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="mt-5 h-10 w-full rounded-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending code…" : "Send verification code"}
              </Button>
            </form>
          )}

          {step === "verify" && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void verifyCode()
              }}
            >
              <KeyRound className="mb-4 size-5 text-primary" />
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                Enter Verification Code
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                If an active account matches{" "}
                <strong className="font-medium text-foreground">
                  {persona}
                </strong>
                , a code was sent to its email. It expires in 10 minutes.
              </p>
              <div className="mt-6 space-y-[5px]">
                <Label htmlFor="reset-code">Six-digit code</Label>
                <Input
                  ref={codeInput}
                  id="reset-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="h-12 text-center font-mono text-xl tracking-[0.35em]"
                  disabled={isSubmitting}
                />
              </div>
              {error && (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="mt-5 h-10 w-full rounded-sm"
                disabled={isSubmitting || code.length !== 6}
              >
                {isSubmitting ? "Checking code…" : "Verify code"}
              </Button>
              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={startOver}
                >
                  Use another account
                </button>
                <button
                  type="button"
                  className="font-medium text-primary disabled:text-muted-foreground"
                  disabled={isSubmitting || resendSeconds > 0}
                  onClick={() => void sendCode()}
                >
                  {resendSeconds > 0
                    ? `Resend in ${resendSeconds}s`
                    : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void savePassword()
              }}
            >
              <ShieldCheck className="mb-4 size-5 text-primary" />
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                Choose A New Password
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use a strong password you haven’t used before. All existing SPAS
                sessions will be signed out.
              </p>
              <div className="mt-6 space-y-[5px]">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </div>
              <div className="mt-4 space-y-[5px]">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                Use 8 or more characters. Avoid common passwords and personal
                information.
              </p>
              {error && (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="mt-5 h-10 w-full rounded-sm"
                disabled={isSubmitting || !newPassword || !confirmPassword}
              >
                {isSubmitting ? "Updating password…" : "Reset password"}
              </Button>
              <button
                type="button"
                className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={startOver}
              >
                Request another code
              </button>
            </form>
          )}

          {step === "success" && (
            <div className="text-center">
              <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-success-soft text-success">
                <CheckCircle2 className="size-6" />
              </span>
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                Password Updated
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your password was reset successfully. Sign in again on all
                devices using the new password.
              </p>
              <Button
                className="mt-6 h-10 w-full rounded-sm"
                onClick={() => navigate("/login", { replace: true })}
              >
                Return to sign in
              </Button>
            </div>
          )}

          {step === "identify" && (
            <Link
              to="/login"
              className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Back to sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
