import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Mínimo 3 caracteres")
  .max(30, "Máximo 30 caracteres")
  .regex(/^[a-zA-Z0-9_]+$/, "Apenas letras, números e _");

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(72, "Máximo 72 caracteres");

export const authSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  steam_id: z.string().trim().min(3, "Obrigatório").max(64).optional(),
});
export type AuthInput = z.infer<typeof authSchema>;

export const stalkerSchema = z.object({
  name: z.string().trim().min(1, "Obrigatório").max(80),
  steam_id: z.string().trim().min(3, "Inválido").max(64),
  photo_url: z.string().url().max(500).optional().or(z.literal("")),
  reputation: z.number().int().min(0).max(4000),
  notes: z.string().max(2000).optional(),
});
export type StalkerInput = z.infer<typeof stalkerSchema>;

export const missionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional(),
  reward_money: z.number().int().min(0).max(10_000_000),
  reward_reputation: z.number().int().min(0).max(4000),
  difficulty: z.enum(["low", "medium", "high", "extreme"]),
  assigned_stalker_id: z.string().uuid().optional().nullable(),
});
export type MissionInput = z.infer<typeof missionSchema>;

export const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  image_url: z.string().url().max(500).optional().or(z.literal("")),
  price: z.number().int().min(0).max(10_000_000),
});
export type ItemInput = z.infer<typeof itemSchema>;
