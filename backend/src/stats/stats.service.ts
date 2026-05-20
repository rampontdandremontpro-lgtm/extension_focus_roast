import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { Session } from '../entities/session.entity';

type CategoryStats = {
  Productif: number;
  Distraction: number;
  'E-commerce': number;
  Neutre: number;
};

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  private getTodayDate(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private getDominantCategory(stats: CategoryStats): keyof CategoryStats {
    return Object.entries(stats).sort((a, b) => b[1] - a[1])[0][0] as keyof CategoryStats;
  }

  private getGlobalMessage(dominantCategory: keyof CategoryStats): string {
    if (dominantCategory === 'Productif') {
      return 'On peut qu’applaudir la performance';
    }

    if (dominantCategory === 'Distraction') {
      return 'Eh ben c’est pas fameux tout ça';
    }

    if (dominantCategory === 'E-commerce') {
      return 'Le panier chauffe un peu trop là';
    }

    return 'Navigation tranquille, rien d’alarmant';
  }

  private calculatePercentages(stats: CategoryStats): CategoryStats {
    const total =
      stats.Productif + stats.Distraction + stats['E-commerce'] + stats.Neutre;

    if (total === 0) {
      return {
        Productif: 0,
        Distraction: 0,
        'E-commerce': 0,
        Neutre: 0,
      };
    }

    return {
      Productif: Math.round((stats.Productif / total) * 100),
      Distraction: Math.round((stats.Distraction / total) * 100),
      'E-commerce': Math.round((stats['E-commerce'] / total) * 100),
      Neutre: Math.round((stats.Neutre / total) * 100),
    };
  }

  async getTodayStats() {
    const sessions = await this.sessionRepository.find({
      where: {
        createdAt: MoreThanOrEqual(this.getTodayDate()),
      },
      relations: {
        site: {
          category: true,
        },
      },
    });

    const stats: CategoryStats = {
      Productif: 0,
      Distraction: 0,
      'E-commerce': 0,
      Neutre: 0,
    };

    for (const session of sessions) {
      const categoryName = session.site.category.name as keyof CategoryStats;

      if (categoryName in stats) {
        stats[categoryName] += session.durationSeconds;
      }
    }

    const percentages = this.calculatePercentages(stats);
    const dominantCategory = this.getDominantCategory(stats);
    const globalMessage = this.getGlobalMessage(dominantCategory);

    return {
      ...stats,
      percentages,
      globalMessage,
    };
  }

  async getStatsByCategory() {
    return this.getTodayStats();
  }

  async getStatsBySite() {
    const sessions = await this.sessionRepository.find({
      where: {
        createdAt: MoreThanOrEqual(this.getTodayDate()),
      },
      relations: {
        site: {
          category: true,
        },
      },
    });

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
    const sessions = await this.sessionRepository.find({
      where: {
        createdAt: MoreThanOrEqual(this.getTodayDate()),
      },
      relations: {
        site: {
          category: true,
        },
      },
    });

    const stats: Record<string, number> = {};

    for (const session of sessions) {
      if (session.site.category.name === 'Distraction') {
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