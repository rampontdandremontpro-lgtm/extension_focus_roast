import { Test, TestingModule } from '@nestjs/testing';
import { DailyStatsController } from './daily-stats.controller';

describe('DailyStatsController', () => {
  let controller: DailyStatsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyStatsController],
    }).compile();

    controller = module.get<DailyStatsController>(DailyStatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
