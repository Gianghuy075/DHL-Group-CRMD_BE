import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

const numeric = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null || v === undefined ? v : parseFloat(v)),
};

// Partial mapping — only the columns the app reads through relations.
@Entity('business_types')
export class BusinessType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'numeric', default: 0, transformer: numeric })
  price_per_month: number;
}
