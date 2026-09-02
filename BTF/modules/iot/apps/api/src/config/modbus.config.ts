import { registerAs } from '@nestjs/config';

export default registerAs('modbus', () => ({
  defaultTimeout: parseInt(process.env.MODBUS_DEFAULT_TIMEOUT, 10) || 5000,
}));
