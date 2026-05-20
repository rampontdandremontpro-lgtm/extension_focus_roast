import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { Session } from '../entities/session.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  private getTodayDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  async getTodaySessions() {
    return this.sessionRepository.find({
      where: {
        createdAt: MoreThanOrEqual(this.getTodayDate()),
      },
      relations: {
        site: {
          category: true,
        },
      },
    });
  }

  async getTodayStats() {
    const sessions = await this.getTodaySessions();

    const stats = {
      Productif: 0,
      Distraction: 0,
      'E-commerce': 0,
      Neutre: 0,
    };

    for (const session of sessions) {
      const categoryName = session.site.category.name;

      if (categoryName in stats) {
        stats[categoryName as keyof typeof stats] += session.durationSeconds;
      }
    }

    const totalSeconds =
      stats.Productif + stats.Distraction + stats['E-commerce'] + stats.Neutre;

    const percentages = {
      Productif: totalSeconds > 0 ? Math.round((stats.Productif / totalSeconds) * 100) : 0,
      Distraction:
        totalSeconds > 0 ? Math.round((stats.Distraction / totalSeconds) * 100) : 0,
      'E-commerce':
        totalSeconds > 0 ? Math.round((stats['E-commerce'] / totalSeconds) * 100) : 0,
      Neutre: totalSeconds > 0 ? Math.round((stats.Neutre / totalSeconds) * 100) : 0,
    };

    const dominantCategory = Object.entries(stats).sort((a, b) => b[1] - a[1])[0][0];

    let globalMessage = 'Aucune donnée pour aujourd’hui.';

    if (totalSeconds > 0) {
      if (dominantCategory === 'Productif') {
        globalMessage = 'Belle journée, tu as été productif 💪';
      } else if (dominantCategory === 'Distraction') {
        globalMessage = 'Tu t’es un peu trop dispersé aujourd’hui 👀';
      } else if (dominantCategory === 'E-commerce') {
        globalMessage = 'Attention au shopping compulsif 🛒';
      } else {
        globalMessage = 'Journée plutôt neutre, rien d’alarmant.';
      }
    }

    return {
      seconds: stats,
      percentages,
      totalSeconds,
      dominantCategory,
      globalMessage,
    };
  }

  async getStatsByCategory() {
    return this.getTodayStats();
  }

  async getStatsBySite() {
    const sessions = await this.getTodaySessions();

    const stats: Record<string, number> = {};

    for (const session of sessions) {
      const siteName = session.site.name;

      if (!stats[siteName]) {
        stats[siteName] = 0;
      }

      stats[siteName] += session.durationSeconds;
    }

    return stats;
  }

  async getTopDistractions() {
    const sessions = await this.getTodaySessions();

    const stats: Record<string, number> = {};

    for (const session of sessions) {
      const categoryName = session.site.category.name;

      if (categoryName === 'Distraction') {
        const siteName = session.site.name;

        if (!stats[siteName]) {
          stats[siteName] = 0;
        }

        stats[siteName] += session.durationSeconds;
      }
    }

    return Object.entries(stats)
      .map(([site, durationSeconds]) => ({
        site,
        durationSeconds,
      }))
      .sort((a, b) => b.durationSeconds - a.durationSeconds);
  }
}