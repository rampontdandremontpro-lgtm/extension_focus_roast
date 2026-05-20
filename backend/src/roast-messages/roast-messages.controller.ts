import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoastMessagesService } from './roast-messages.service';

@ApiTags('roast-messages')
@Controller('roast-messages')
export class RoastMessagesController {
  constructor(private readonly roastMessagesService: RoastMessagesService) {}

  @Post('seed')
  seedMessages() {
    return this.roastMessagesService.seedMessages();
  }

  @Get()
  findAll() {
    return this.roastMessagesService.findAll();
  }

  @Get(':category')
  findByCategory(@Param('category') category: string) {
    return this.roastMessagesService.findByCategory(category);
  }
}