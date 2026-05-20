import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Site } from './site.entity';
import { User } from './user.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.sessions, {
    nullable: true,
    eager: true,
  })
  user!: User | null;

  @ManyToOne(() => Site, (site) => site.sessions, {
    nullable: false,
    eager: true,
  })
  site!: Site;

  @Column()
  pageUrl!: string;

  @Column()
  pageTitle!: string;

  @Column()
  startTime!: Date;

  @Column({ nullable: true })
  endTime!: Date;

  @Column({ default: 0 })
  durationSeconds!: number;

  @CreateDateColumn()
  createdAt!: Date;
}