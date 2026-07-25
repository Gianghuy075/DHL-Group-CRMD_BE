import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Customer } from '../../customers/entities/customer.entity';
import { Category } from './category.entity';
import { BusinessType } from './business-type.entity';

const numeric = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null || v === undefined ? v : parseFloat(v)),
};

// Relation properties are named to match the keys Supabase returned
// (`customers`, `categories`, `business_types`) so nested JSON stays drop-in.
@Entity('kiosks')
export class Kiosk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  facebook_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  facebook_id: string | null;

  @Column({ type: 'text', nullable: true })
  facebook_link: string | null;

  @Column({ type: 'text', nullable: true })
  facebook_group_link: string | null;

  @Column({ type: 'uuid', nullable: true })
  category_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  business_type_id: string | null;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  end_date: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'boolean', default: false })
  auto_approve: boolean;

  @Column({ type: 'numeric', default: 0, transformer: numeric })
  total_paid: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customers: Customer | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  categories: Category | null;

  @ManyToOne(() => BusinessType, { nullable: true })
  @JoinColumn({ name: 'business_type_id' })
  business_types: BusinessType | null;
}
