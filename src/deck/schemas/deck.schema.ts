import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeckDocument = Deck & Document;

@Schema({ timestamps: true })
export class Deck {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  telegramId: number;

  @Prop({ default: 0 })
  totalCards: number;

  @Prop({ default: 0 })
  newCards: number;

  @Prop({ default: 0 })
  learningCards: number;

  @Prop({ default: 0 })
  matureCards: number;
}

export const DeckSchema = SchemaFactory.createForClass(Deck);
