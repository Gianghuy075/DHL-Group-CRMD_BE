import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

const numeric = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null || v === undefined ? v : parseFloat(v)),
};

// Maps DHL-Group-CRM.task_submissions. The unique (task_id, worker_id) pair
// (created by synchronize) stops a worker submitting the same task twice.
@Entity('task_submissions')
@Unique('uq_task_submissions_task_worker', ['task_id', 'worker_id'])
export class TaskSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  task_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  worker_id: string | null;

  @Column({ type: 'text', nullable: true })
  proof_image_url: string | null;

  @Column({ type: 'jsonb', nullable: true })
  proof_data: Record<string, unknown> | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'numeric', transformer: numeric })
  reward_amount: number;

  @Column({ type: 'boolean', default: false })
  verified_via_api: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
