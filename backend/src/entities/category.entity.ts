import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Site } from './site.entity';
import { RoastMessage } from './roast-message.entity';

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

  @OneToMany(() => RoastMessage, (roastMessage) => roastMessage.category)
  roastMessages!: RoastMessage[];
}