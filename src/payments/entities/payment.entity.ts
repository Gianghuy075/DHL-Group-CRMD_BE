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
import { Kiosk } from '../../kiosks/entities/kiosk.entity';

const numeric = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null || v === undefined ? v : parseFloat(v)),
};

// Relation properties are named `customers`/`kiosks` to match the keys Supabase
// returned, so nested JSON stays drop-in for the FE.
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  kiosk_id: string | null;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  end_date: string | null;

  @Column({ type: 'int', default: 1 })
  months: number;

  @Column({ type: 'numeric', default: 0, transformer: numeric })
  price_per_month: number;

  @Column({ type: 'numeric', default: 0, transformer: numeric })
  discount: number;

  @Column({ type: 'text', nullable: true })
  discount_reason: string | null;

  @Column({ type: 'numeric', default: 0, transformer: numeric })
  total_amount: number;

  @Column({ type: 'varchar', nullable: true, default: 'transfer' })
  payment_method: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  payment_status: string;

  @Column({ type: 'text', nullable: true })
  confirmed_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customers: Customer | null;

  @ManyToOne(() => Kiosk, { nullable: true })
  @JoinColumn({ name: 'kiosk_id' })
  kiosks: Kiosk | null;
}
