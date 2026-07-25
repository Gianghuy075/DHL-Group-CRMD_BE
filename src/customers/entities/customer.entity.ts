import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// numeric columns come back from pg as strings; convert to number to match
// the shape the frontend previously got from Supabase/PostgREST.
const numeric = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null || v === undefined ? v : parseFloat(v)),
};

// Property names are intentionally snake_case to mirror the DB columns exactly,
// so the JSON returned here is a drop-in match for what the FE read from Supabase.
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  facebook_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  facebook_id: string | null;

  @Column({ type: 'text', nullable: true })
  facebook_link: string | null;

  @Column({ type: 'text', nullable: true })
  facebook_group_link: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', default: 'potential' })
  status: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'numeric', default: 0, transformer: numeric })
  total_paid: number;

  @Column({ type: 'int', default: 0 })
  total_kiosks: number;

  @Column({ type: 'numeric', default: 0, transformer: numeric })
  wallet_balance: number;

  @Column({ type: 'numeric', default: 0, transformer: numeric })
  bonus_balance: number;

  @Column({ type: 'boolean', default: false })
  facebook_verified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  facebook_verified_at: Date | null;

  @Column({ type: 'int', default: 0 })
  friend_count: number;

  @Column({ type: 'int', default: 0 })
  follower_count: number;

  @Column({ type: 'boolean', default: false })
  is_public_profile: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
