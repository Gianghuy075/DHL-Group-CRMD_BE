import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Maps DHL-Group-CRM.user_roles — links a Supabase auth user_id to an app role
// ('admin' | 'reviewer' | 'user'). Used to authorize admin-only endpoints.
@Entity('user_roles')
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  @Column({ type: 'varchar', nullable: true })
  display_name: string | null;

  @Column({ type: 'varchar', default: 'user' })
  role: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
