import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Site } from '../entities/site.entity';

@Injectable()
export class SitesService {
  constructor(
    @InjectRepository(Site)
    private readonly siteRepository: Repository<Site>,
  ) {}

  findAll() {
    return this.siteRepository.find({
      relations: {
        category: true,
        sessions: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number) {
    const site = await this.siteRepository.findOne({
      where: { id },
      relations: {
        category: true,
        sessions: true,
      },
    });

    if (!site) {
      throw new NotFoundException('Site introuvable');
    }

    return site;
  }
}