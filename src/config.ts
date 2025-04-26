import { z } from 'zod';
import fs from 'fs/promises';

// Configuration Schema
export const ConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  apiKeys: z.object({
    jina: z.string().optional()
  }),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

export type Config = z.infer<typeof ConfigSchema>;

export async function loadConfig(configPath: string): Promise<Config> {
  try {
    const configFile = await fs.readFile(configPath, 'utf-8');
    const configData = JSON.parse(configFile);
    const config = ConfigSchema.parse(configData);
    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
    throw error;
  }
} 