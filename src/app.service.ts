import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'DHL Group CRM API',
      status: 'running',
      docs: '/health',
    };
  }
}
