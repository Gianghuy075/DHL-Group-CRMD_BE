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
  try {
    if (!ready) ready = bootstrap();
    await ready;
  } catch (err) {
    // Reset so the next invocation retries a cold boot instead of reusing the
    // rejected promise; rethrow so the real stack lands in Vercel's logs.
    ready = null;
    throw err;
  }
  server(req, res);
}
