import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';

import { SessionsModule } from './sessions/sessions.module';
import { StatsModule } from './stats/stats.module';
import { SitesModule } from './sites/sites.module';
import { RoastMessagesModule } from './roast-messages/roast-messages.module';
import { DailyStatsModule } from './daily-stats/daily-stats.module';
import { UsersModule } from './users/users.module';

import { Category } from './entities/category.entity';
import { Site } from './entities/site.entity';
import { Session } from './entities/session.entity';
import { RoastMessage } from './entities/roast-message.entity';
import { DailyStat } from './entities/daily-stat.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Category, Site, Session, RoastMessage, DailyStat, User],
      synchronize: true,
    }),

    SessionsModule,
    StatsModule,
    SitesModule,
    RoastMessagesModule,
    DailyStatsModule,
    UsersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}