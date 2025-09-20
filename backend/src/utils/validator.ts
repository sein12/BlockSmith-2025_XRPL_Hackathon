// src/utils/validator.ts
import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(1).max(32),
    username: z
      .string()
      .min(4)
      .max(32)
      .regex(/^[a-zA-Z0-9._-]+$/),
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
    email: z
      .string()
      .email()
      .optional()
      .or(z.literal(""))
      .transform((v) => v || null),

    // ✅ 추가: walletAddr
    walletAddr: z.string().min(1).max(64),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Password mismatch",
  });

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});
