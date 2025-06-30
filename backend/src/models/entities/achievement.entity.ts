import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column()
  category: 'progress' | 'streak' | 'mastery' | 'special';

  @Column()
  requirementType: 'xp_total' | 'streak_days' | 'questions_correct' | 'special_event';

  @Column('int')
  requirementValue: number;

  @Column('int', { default: 0 })
  xpBonus: number;

  @Column({ nullable: true })
  badgeUrl: string;

  @Column({ default: 'common' })
  rarity: 'common' | 'rare' | 'epic' | 'legendary';

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}