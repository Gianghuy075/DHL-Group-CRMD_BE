import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Partial mapping — only the columns the app reads through relations.
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;
}
