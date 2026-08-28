function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export default () => {
  const cookieSecret = requireEnv('COOKIE_SECRET');

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.API_PORT ?? '4000', 10),
    corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    database: {
      url: requireEnv('DATABASE_URL'),
    },
    redis: {
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    },
    auth: {
      accessSecret: requireEnv('JWT_ACCESS_SECRET'),
      refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
      accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
      refreshTtlDays: 30,
      cookieSecret,
    },
    ai: {
      provider: process.env.AI_PROVIDER ?? 'gemini',
      apiKey: process.env.AI_API_KEY ?? '',
      model: process.env.AI_MODEL ?? 'gemini-flash-latest',
    },
    storage: {
      // 'local' in every environment today; production deployments should
      // point this at an S3-compatible provider by binding StorageProvider
      // (apps/api/src/documents/storage) to a new implementation — no schema
      // or API changes required.
      provider: process.env.STORAGE_PROVIDER || 'local',
      localDir: process.env.STORAGE_LOCAL_DIR || './storage',
      maxUploadMb: parseInt(process.env.STORAGE_MAX_UPLOAD_MB ?? '20', 10),
      signedUrlTtlSeconds: parseInt(process.env.STORAGE_SIGNED_URL_TTL_SECONDS ?? '300', 10),
      signingSecret: process.env.STORAGE_SIGNING_SECRET || cookieSecret,
    },
  };
};
