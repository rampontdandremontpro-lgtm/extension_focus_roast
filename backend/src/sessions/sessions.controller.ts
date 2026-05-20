import { Body, Controller, Get, Post } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { EndSessionDto } from './dto/end-session.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  startSession(@Body() startSessionDto: StartSessionDto) {
    return this.sessionsService.startSession(startSessionDto);
  }

  @Post('end')
  endSession(@Body() endSessionDto: EndSessionDto) {
    return this.sessionsService.endSession(endSessionDto);
  }

  @Get('/../stats/today')
  getTodayStats() {
    return this.sessionsService.getTodayStats();
  }
}