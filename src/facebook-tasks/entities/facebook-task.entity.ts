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

// Maps DHL-Group-CRM.facebook_tasks. status CHECK: active|completed|cancelled|rejected_by_admin.
@Entity('facebook_tasks')
export class FacebookTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  creator_id: string | null;

  @Column({ type: 'varchar' })
  task_type: string;

  @Column({ type: 'text' })
  post_url: string;

  @Column({ type: 'varchar', nullable: true })
  facebook_target_id: string | null;

  @Column({ type: 'int' })
  target_quantity: number;

  @Column({ type: 'int', default: 0 })
  completed_quantity: number;

  @Column({ type: 'numeric', transformer: numeric })
  unit_price: number;

  @Column({ type: 'numeric', transformer: numeric })
  total_cost: number;

  @Column({ type: 'varchar', default: 'active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
