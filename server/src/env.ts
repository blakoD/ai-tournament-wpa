import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH ?? ".env"
});

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("*")
});

export const env = EnvSchema.parse(process.env);
