import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ContactRoleType } from '../common/enums';
import { Contact } from './contact.entity';

@Entity('contact_roles')
export class ContactRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ContactRoleType,
    enumName: 'contact_role_type',
  })
  role: ContactRoleType;

  @ManyToOne(() => Contact, (contact) => contact.roles, { onDelete: 'CASCADE' })
  contact: Contact;
}
