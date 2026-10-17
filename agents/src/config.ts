import { z } from 'zod';

const environment = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default('0.0.0.0'),
  TRAILBASE_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  AI_API_KEY: z.string().trim().default(''),
  AI_BASE_URL: z.url().default('https://openrouter.ai/api/v1'),
  AI_MODEL: z.string().trim().min(1).default('liquid/lfm-2.5-2.6b:free'),
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const values = environment.parse(env);
  if (values.PORT === values.TRAILBASE_PORT) {
    throw new Error('PORT and TRAILBASE_PORT must be different.');
  }
  return {
    port: values.PORT,
    host: values.HOST,
    trailbaseUrl: `http://127.0.0.1:${values.TRAILBASE_PORT}`,
    apiKey: values.AI_API_KEY,
    baseURL: values.AI_BASE_URL,
    model: values.AI_MODEL,
  };
}

export type Config = ReturnType<typeof loadConfig>;
