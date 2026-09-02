import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  modelsPath: process.env.AI_MODELS_PATH || './models',
}));
