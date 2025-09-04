import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Card, CardSchema } from './schemas/card.schema';
import { CardService } from './card.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Card.name, schema: CardSchema }]),
  ],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
