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

  private getStartDate(since?: string): Date {
    if (!since) {
      return this.getTodayDate();
    }

    const parsedDate = new Date(since);

    if (Number.isNaN(parsedDate.getTime())) {
      return this.getTodayDate();
    }

    return parsedDate;
  }

  private getEmptyStats(): CategoryStats {
    return {
      Productif: 0,
      Distraction: 0,
      'E-commerce': 0,
      Neutre: 0,
    };
  }

  private calculatePercentages(stats: CategoryStats): CategoryStats {
    const total =
      stats.Productif + stats.Distraction + stats['E-commerce'] + stats.Neutre;

    if (total === 0) {
      return this.getEmptyStats();
    }

    return {
      Productif: Math.round((stats.Productif / total) * 100),
      Distraction: Math.round((stats.Distraction / total) * 100),
      'E-commerce': Math.round((stats['E-commerce'] / total) * 100),
      Neutre: Math.round((stats.Neutre / total) * 100),
    };
  }

  private getDominantCategory(stats: CategoryStats): keyof CategoryStats {
    return Object.entries(stats).sort((a, b) => b[1] - a[1])[0][0] as keyof CategoryStats;
  }

  private getGlobalMessage(stats: CategoryStats): string {
    const total =
      stats.Productif + stats.Distraction + stats['E-commerce'] + stats.Neutre;

    if (total === 0) {
      return 'Aucune session enregistrée pour cette session Chrome.';
    }

    const dominantCategory = this.getDominantCategory(stats);

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

  private async getSessionsFromDate(startDate: Date) {
    return this.sessionRepository.find({
      where: {
        createdAt: MoreThanOrEqual(startDate),
      },
      relations: {
        site: {
          category: true,
        },
      },
    });
  }

  async getTodayStats(since?: string) {
    const startDate = this.getStartDate(since);
    const sessions = await this.getSessionsFromDate(startDate);

    const stats = this.getEmptyStats();

    for (const session of sessions) {
      const categoryName = session.site?.category?.name as keyof CategoryStats;

      if (categoryName in stats) {
        stats[categoryName] += session.durationSeconds || 0;
      }
    }

    return {
      ...stats,
      percentages: this.calculatePercentages(stats),
      globalMessage: this.getGlobalMessage(stats),
    };
  }

  async getStatsByCategory(since?: string) {
    return this.getTodayStats(since);
  }

  async getStatsBySite(since?: string) {
    const startDate = this.getStartDate(since);
    const sessions = await this.getSessionsFromDate(startDate);

    const stats: Record<string, number> = {};

    for (const session of sessions) {
      const siteName = session.site?.name || session.site?.domain || 'Site inconnu';

      if (!stats[siteName]) {
        stats[siteName] = 0;
      }

      stats[siteName] += session.durationSeconds || 0;
    }

    return stats;
  }

  async getTopDistractions(since?: string) {
    const startDate = this.getStartDate(since);
    const sessions = await this.getSessionsFromDate(startDate);

    const stats: Record<string, number> = {};

    for (const session of sessions) {
      const categoryName = session.site?.category?.name;

      if (categoryName === 'Distraction') {
        const siteName = session.site?.name || session.site?.domain || 'Site inconnu';

        if (!stats[siteName]) {
          stats[siteName] = 0;
        }

        stats[siteName] += session.durationSeconds || 0;
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