import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const number = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: number(process.env.PORT, 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};

