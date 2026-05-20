import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      message: 'Focus Roast API is running',
      status: 'OK',
    };
  }
}