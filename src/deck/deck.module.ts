import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Deck, DeckSchema } from './schemas/deck.schema';
import { DeckService } from './deck.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Deck.name, schema: DeckSchema }]),
  ],
  providers: [DeckService],
  exports: [DeckService],
})
export class DeckModule {}
