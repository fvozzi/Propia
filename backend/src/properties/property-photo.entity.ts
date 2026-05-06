import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Property } from './property.entity';

@Entity('property_photos')
export class PropertyPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string;

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  caption: string | null;

  @Column({ default: 0 })
  orderIndex: number;

  @ManyToOne(() => Property, (property) => property.photos, { onDelete: 'CASCADE' })
  property: Property;
}
