import { z } from 'zod';
import { claudeAvailable } from './cruce/claude.js';

const environment = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default('0.0.0.0'),
  TRAILBASE_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  EXA_API_KEY: z.string().trim().default(''),
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
    // The agent runs on the local Claude Code CLI (`claude -p`, Haiku 5.5).
    ai: claudeAvailable(),
    exaApiKey: values.EXA_API_KEY,
  };
}

export type Config = ReturnType<typeof loadConfig>;
