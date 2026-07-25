import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get()
  async check() {
    let db = 'down';
    let error: string | undefined;
    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    return {
      status: db === 'up' ? 'ok' : 'error',
      db,
      ...(error ? { error } : {}),
      timestamp: new Date().toISOString(),
    };
  }
}
