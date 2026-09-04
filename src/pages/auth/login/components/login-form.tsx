"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

import { loginSchema, type LoginFormValues } from "../redux/login-schema"
import { useAppDispatch } from "@/lib/redux/hooks"
import { useNavigate } from "react-router-dom"
import { loginSuccess } from "../../redux/auth.slice"
import { loginRequest } from "../../redux/auth.api"
import { notifier } from "@/lib/utils/notifier"
import { apiErrorMessage } from "@/lib/api"
import { landingPathFor } from "@/routes/route-config"

export function LoginForm() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      persona: "",
      password: "",
      keepSignedIn: true,
    },
  })

  async function onSubmit(values: LoginFormValues) {
    try {
      // Real login against the Express backend (POST /api/v1/auth/login)
      const response = await loginRequest({
        persona: values.persona,
        password: values.password,
      })

      dispatch(
        loginSuccess({
          tokens: {
            access: response.tokens.access,
            refresh: response.tokens.refresh,
          },
          isAuthenticated: true,
          isSuperUser: response.isSuperuser,
          profile: response,
          keepSignedIn: values.keepSignedIn,
        })
      )

      navigate(
        landingPathFor(
          response.permissions,
          response.isSuperuser,
          response.roles.map((role) => role.codename)
        )
      )
    } catch (error) {
      notifier.error(
        apiErrorMessage(error, "Could not sign in. Please try again.")
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-[8px]">
        <Label htmlFor="persona">Username or Email</Label>
        <Input
          id="persona"
          type="text"
          autoComplete="username"
          aria-invalid={!!errors.persona}
          {...register("persona")}
        />
        {errors.persona && (
          <p className="text-xs text-destructive">{errors.persona.message}</p>
        )}
      </div>

      <div className="space-y-[8px]">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            to="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2.5 py-1">
        <Controller
          name="keepSignedIn"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="keepSignedIn"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />
        <Label
          htmlFor="keepSignedIn"
          className="font-normal text-muted-foreground"
        >
          Keep me signed in on this device
        </Label>
      </div>

      <Button
        type="submit"
        className="mt-1 h-10 w-full rounded-sm"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
