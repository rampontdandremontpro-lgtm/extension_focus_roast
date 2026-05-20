import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { EndSessionDto } from './dto/end-session.dto';

@ApiTags('sessions')
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
}