import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Builds TypeORM options from discrete DB_* env vars.
 *
 * Targets Supabase Postgres via the Transaction Pooler (PgBouncer, port 6543):
 * - SSL is required (rejectUnauthorized: false for Supabase's cert chain).
 * - `synchronize` is force-disabled in production and only honored elsewhere
 *   when DB_SYNCHRONIZE=true — schema changes should go through migrations.
 */
export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const sslEnabled = config.get<string>('DB_SSL') === 'true';
  const synchronize =
    !isProd && config.get<string>('DB_SYNCHRONIZE') === 'true';

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: parseInt(config.get<string>('DB_PORT') ?? '6543', 10),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_DATABASE'),
    schema: config.get<string>('DB_SCHEMA'),
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    synchronize,
    logging: config.get<string>('NODE_ENV') === 'development',
    // PgBouncer transaction mode doesn't keep session state; keep the pool lean.
    extra: {
      max: 10,
    },
  };
}
