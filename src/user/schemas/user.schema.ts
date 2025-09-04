import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  telegramId: number;

  @Prop()
  username?: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ default: Date.now })
  lastActivity: Date;

  @Prop({ default: Date.now, optional: true })
  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);