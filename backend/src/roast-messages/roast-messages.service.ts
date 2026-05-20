import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category } from '../entities/category.entity';
import { RoastMessage } from '../entities/roast-message.entity';

@Injectable()
export class RoastMessagesService {
  constructor(
    @InjectRepository(RoastMessage)
    private readonly roastMessageRepository: Repository<RoastMessage>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async seedMessages() {
    const data = [
      {
        category: 'Distraction',
        messages: [
          { triggerSeconds: 1800, message: 'Je te surveille 👀' },
          { triggerSeconds: 5400, message: 'Ça fait long là...' },
          { triggerSeconds: 10800, message: 'Mais fais autre chose de ta vie non ?' },
        ],
      },
      {
        category: 'Productif',
        messages: [
          { triggerSeconds: 0, message: 'Enfin tu bosses 💪' },
          { triggerSeconds: 1800, message: 'Je suis fier de toi, continue.' },
          { triggerSeconds: 7200, message: 'Tu as mérité une pause.' },
        ],
      },
      {
        category: 'E-commerce',
        messages: [
          { triggerSeconds: 300, message: 'J’espère que tu as l’argent pour ça.' },
          { triggerSeconds: 1800, message: 'Tu as acheté un truc au moins ?' },
          { triggerSeconds: 3600, message: 'Bon, soit tu achètes soit tu fermes.' },
        ],
      },
      {
        category: 'Neutre',
        messages: [
          { triggerSeconds: 0, message: 'Site neutre détecté.' },
          { triggerSeconds: 1800, message: 'Pas dramatique, mais reste concentré.' },
        ],
      },
    ];

    for (const item of data) {
      let category = await this.categoryRepository.findOne({
        where: { name: item.category },
      });

      if (!category) {
        category = this.categoryRepository.create({
          name: item.category,
          description: `Catégorie ${item.category}`,
        });

        category = await this.categoryRepository.save(category);
      }

      for (const messageData of item.messages) {
        const exists = await this.roastMessageRepository.findOne({
          where: {
            category: { id: category.id },
            triggerSeconds: messageData.triggerSeconds,
            message: messageData.message,
          },
        });

        if (!exists) {
          const roastMessage = this.roastMessageRepository.create({
            category,
            triggerSeconds: messageData.triggerSeconds,
            message: messageData.message,
          });

          await this.roastMessageRepository.save(roastMessage);
        }
      }
    }

    return {
      message: 'Messages roast ajoutés avec succès',
    };
  }

  findAll() {
    return this.roastMessageRepository.find({
      order: {
        triggerSeconds: 'ASC',
      },
    });
  }

  findByCategory(category: string) {
    return this.roastMessageRepository.find({
      where: {
        category: {
          name: category,
        },
      },
      order: {
        triggerSeconds: 'ASC',
      },
    });
  }
}