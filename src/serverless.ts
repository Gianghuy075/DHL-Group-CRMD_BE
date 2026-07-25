import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Request, type Response } from 'express';

import { AppModule } from './app.module';
import { applyAppConfig } from './app-config';

// One Express instance per warm Vercel lambda; the heavy Nest bootstrap is done
// once and reused across invocations (cached by the module-scoped promise).
const server = express();
let ready: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  applyAppConfig(app);
  await app.init(); // init() not listen() — Vercel owns the HTTP server
}

export default async function handler(req: Request, res: Response): Promise<void> {
  if (!ready) ready = bootstrap();
  await ready;
  server(req, res);
}
