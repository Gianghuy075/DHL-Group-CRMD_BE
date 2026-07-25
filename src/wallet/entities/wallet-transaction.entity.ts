import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

const numeric = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null || v === undefined ? v : parseFloat(v)),
};

// Maps DHL-Group-CRM.wallet_transactions. transaction_type is constrained by a
// DB CHECK to: 'deposit' | 'spending' | 'bonus' | 'refund'.
@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string | null;

  @Column({ type: 'varchar' })
  transaction_type: string;

  @Column({ type: 'numeric', transformer: numeric })
  amount: number;

  @Column({ type: 'numeric', default: 0, transformer: numeric })
  bonus_amount: number;

  @Column({ type: 'bigint', nullable: true, transformer: numeric })
  order_code: number | null;

  @Column({ type: 'varchar', default: 'payos' })
  payment_method: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
