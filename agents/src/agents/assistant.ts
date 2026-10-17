import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { isStepCount, ToolLoopAgent } from 'ai';
import type { Config } from '../config.js';

export function createAssistantAgent(config: Config) {
  const provider = createOpenAICompatible({
    name: 'assistant-provider',
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  return new ToolLoopAgent({
    model: provider.chatModel(config.model),
    instructions: [
      'You are a concise and constructively critical AI assistant.',
      'Reply in the language of the user. Keep the answer under 100 words.',
      'Identify one risky assumption and suggest one concrete validation action.',
      'Acknowledge uncertainty. Do not invent evidence or claim to have searched the web.',
    ].join(' '),
    stopWhen: isStepCount(3),
    // Reasoning models count their hidden reasoning against this budget too.
    maxOutputTokens: 2048,
    maxRetries: 1,
  });
}
