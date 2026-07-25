import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Shared runtime config applied to the Nest app in every environment
 * (local `main.ts` and the Vercel serverless entry `src/serverless.ts`),
 * so both stay in sync.
 */
export function applyAppConfig(app: INestApplication): void {
  app.enableCors({
    origin: true, // reflect request origin; tighten to the FE domain later
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
