import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('today')
  getTodayStats() {
    return this.statsService.getTodayStats();
  }

  @Get('categories')
  getStatsByCategory() {
    return this.statsService.getStatsByCategory();
  }

  @Get('sites')
  getStatsBySite() {
    return this.statsService.getStatsBySite();
  }

  @Get('top-distractions')
  getTopDistractions() {
    return this.statsService.getTopDistractions();
  }
}