import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';

import { Category } from '../entities/category.entity';
import { Site } from '../entities/site.entity';
import { Session } from '../entities/session.entity';

import { StartSessionDto } from './dto/start-session.dto';
import { EndSessionDto } from './dto/end-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(Site)
    private readonly siteRepository: Repository<Site>,

    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async startSession(startSessionDto: StartSessionDto) {
    let category = await this.categoryRepository.findOne({
      where: { name: startSessionDto.category },
    });

    if (!category) {
      category = this.categoryRepository.create({
        name: startSessionDto.category,
        description: `Catégorie ${startSessionDto.category}`,
      });

      category = await this.categoryRepository.save(category);
    }

    let site = await this.siteRepository.findOne({
      where: { domain: startSessionDto.domain },
    });

    if (!site) {
      site = this.siteRepository.create({
        domain: startSessionDto.domain,
        name: startSessionDto.name,
        category,
        classificationSource: startSessionDto.classificationSource,
      });

      site = await this.siteRepository.save(site);
    }

    const session = this.sessionRepository.create({
      site,
      pageUrl: startSessionDto.pageUrl,
      pageTitle: startSessionDto.pageTitle,
      startTime: new Date(),
      durationSeconds: 0,
    });

    const savedSession = await this.sessionRepository.save(session);

    return {
      sessionId: savedSession.id,
    };
  }

  async endSession(endSessionDto: EndSessionDto) {
    const session = await this.sessionRepository.findOne({
      where: { id: endSessionDto.sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable');
    }

    session.endTime = new Date();
    session.durationSeconds = endSessionDto.durationSeconds;

    await this.sessionRepository.save(session);

    return {
      message: 'Session terminée',
      durationSeconds: session.durationSeconds,
    };
  }

  async getTodayStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await this.sessionRepository.find({
      where: {
        createdAt: MoreThanOrEqual(today),
      },
      relations: {
        site: {
          category: true,
        },
      },
    });

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

    return stats;
  }
}