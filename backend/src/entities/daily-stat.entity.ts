import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('daily_stats')
export class DailyStat {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.dailyStats, {
    nullable: true,
    eager: true,
  })
  user!: User | null;

  @Column({ type: 'date' })
  statDate!: string;

  @Column({ default: 0 })
  productiveSeconds!: number;

  @Column({ default: 0 })
  distractionSeconds!: number;

  @Column({ default: 0 })
  ecommerceSeconds!: number;

  @Column({ default: 0 })
  neutralSeconds!: number;

  @Column({ nullable: true })
  globalMessage!: string;
}