import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Category } from './category.entity';
import { Session } from './session.entity';

@Entity('sites')
export class Site {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  domain!: string;

  @Column()
  name!: string;

  @ManyToOne(() => Category, (category) => category.sites, {
    nullable: false,
    eager: true,
  })
  category!: Category;

  @Column()
  classificationSource!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Session, (session) => session.site)
  sessions!: Session[];
}