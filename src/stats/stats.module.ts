import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { CardModule } from '../card/card.module';
import { DeckModule } from '../deck/deck.module';

@Module({
  imports: [CardModule, DeckModule],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
