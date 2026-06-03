import type { Config } from './config.interface';
import { SWAGGER_PATH } from './api-paths';

function parseBoolean(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }
  return value === 'true' || value === '1';
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const port = Number.parseInt(value, 10);
  return Number.isNaN(port) ? fallback : port;
}

export default (): Config => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  nest: {
    port: parsePort(process.env.PORT, 3000),
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  cors: {
    enabled: true,
  },
  swagger: {
    // Enabled in all environments (including production) unless SWAGGER_ENABLED=false.
    enabled: parseBoolean(process.env.SWAGGER_ENABLED, true),
    title: 'Wallet Transaction Processing',
    description:
      'Wallet and merchant transaction processing API — merchants, wallets, charges, refunds, and ledger entries.',
    version: '0.0.1',
    path: process.env.SWAGGER_PATH ?? SWAGGER_PATH,
  },
});
