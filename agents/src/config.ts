import { z } from 'zod';
import { claudeAvailable } from './cruce/claude.js';

const environment = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default('0.0.0.0'),
  TRAILBASE_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  EXA_API_KEY: z.string().trim().default(''),
  MEMORY_PORT: z.coerce.number().int().min(1).max(65535).default(4010),
  VAPID_SUBJECT: z.string().trim().default('mailto:cruce@example.com'),
  OPENAI_API_KEY: z.string().trim().default(''),
  OPENAI_REALTIME_MODEL: z.string().trim().min(1).default('gpt-realtime-2.1'),
  OPENAI_REALTIME_VOICE: z.string().trim().min(1).default('marin'),
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
    // Graphiti + FalkorDB network memory (memory/service.py), private to this host.
    memoryUrl: `http://127.0.0.1:${values.MEMORY_PORT}`,
    vapidSubject: values.VAPID_SUBJECT,
    // The assistant bar runs on OpenAI GPT-Realtime (WebRTC from the browser).
    openaiApiKey: values.OPENAI_API_KEY,
    realtimeModel: values.OPENAI_REALTIME_MODEL,
    realtimeVoice: values.OPENAI_REALTIME_VOICE,
  };
}

export type Config = ReturnType<typeof loadConfig>;
