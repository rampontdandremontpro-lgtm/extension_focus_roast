import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

import { Category } from '../entities/category.entity';
import { Site } from '../entities/site.entity';
import { Session } from '../entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Site, Session])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}