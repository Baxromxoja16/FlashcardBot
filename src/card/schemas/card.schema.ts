import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CardDocument = Card & Document;

export enum CardStatus {
  NEW = 'New',
  LEARNING = 'Learning',
  YOUNG = 'Young',
  MATURE = 'Mature',
}

@Schema({ timestamps: true })
export class Card {
  @Prop({ required: true })
  front: string;

  @Prop({ required: true })
  back: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Deck' })
  deckId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  telegramId: number;

  @Prop({ type: String, enum: CardStatus, default: CardStatus.NEW })
  status: CardStatus;

  @Prop({ default: Date.now })
  dueDate: Date;

  @Prop({ default: 0 })
  timesReviewed: number;

  @Prop({ default: 0 })
  timesCorrect: number;

  @Prop({ default: 1 })
  easeFactor: number;

  @Prop({ default: 0 })
  interval: number; // Days until next review
}

export const CardSchema = SchemaFactory.createForClass(Card);
