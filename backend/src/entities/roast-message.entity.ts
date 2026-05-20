import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Category } from './category.entity';

@Entity('roast_messages')
export class RoastMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Category, {
    nullable: false,
    eager: true,
  })
  category!: Category;

  @Column()
  triggerSeconds!: number;

  @Column()
  message!: string;
}