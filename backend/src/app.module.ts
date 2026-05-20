import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { SessionsModule } from './sessions/sessions.module';

import { Category } from './entities/category.entity';
import { Site } from './entities/site.entity';
import { Session } from './entities/session.entity';

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
      entities: [Category, Site, Session],
      synchronize: true,
    }),

    SessionsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}