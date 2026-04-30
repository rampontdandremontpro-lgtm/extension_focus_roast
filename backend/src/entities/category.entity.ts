import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Site } from './site.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @OneToMany(() => Site, (site) => site.category)
  sites!: Site[];
}