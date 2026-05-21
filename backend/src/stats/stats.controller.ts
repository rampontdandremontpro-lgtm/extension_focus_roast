import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('today')
  getTodayStats(@Query('since') since?: string) {
    return this.statsService.getTodayStats(since);
  }

  @Get('categories')
  getStatsByCategory(@Query('since') since?: string) {
    return this.statsService.getStatsByCategory(since);
  }

  @Get('sites')
  getStatsBySite(@Query('since') since?: string) {
    return this.statsService.getStatsBySite(since);
  }

  @Get('top-distractions')
  getTopDistractions(@Query('since') since?: string) {
    return this.statsService.getTopDistractions(since);
  }
}