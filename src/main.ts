import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyAppConfig } from './app-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  applyAppConfig(app);

  const port = process.env.PORT ?? 4567;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 DHL Group CRM API listening on http://localhost:${port}`);
}
bootstrap();
