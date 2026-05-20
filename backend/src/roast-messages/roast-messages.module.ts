import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoastMessagesController } from './roast-messages.controller';
import { RoastMessagesService } from './roast-messages.service';

import { RoastMessage } from '../entities/roast-message.entity';
import { Category } from '../entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoastMessage, Category])],
  controllers: [RoastMessagesController],
  providers: [RoastMessagesService],
})
export class RoastMessagesModule {}