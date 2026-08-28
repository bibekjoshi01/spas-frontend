import { z } from "zod"

export const loginSchema = z.object({
  persona: z.string().trim().min(1, "Enter your username or email"),
  password: z
    .string()
    .min(1, "Enter your password")
    .min(8, "Password must be at least 8 characters"),
  keepSignedIn: z.boolean(),
})

export type LoginFormValues = z.infer<typeof loginSchema>
