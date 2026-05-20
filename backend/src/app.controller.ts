import { Controller, Get } from '@nestjs/common';
import { SessionsService } from './sessions/sessions.service';

@Controller()
export class AppController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  getHello() {
    return {
      message: 'Focus Roast API is running',
      status: 'OK',
    };
  }

  @Get('stats/today')
  getTodayStats() {
    return this.sessionsService.getTodayStats();
  }
}