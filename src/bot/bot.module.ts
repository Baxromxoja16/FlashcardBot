import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { BotService } from './bot.service';
import { UserModule } from '../user/user.module';
import { DeckModule } from '../deck/deck.module';
import { CardModule } from '../card/card.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [UserModule, DeckModule, CardModule, StatsModule],
  providers: [BotUpdate, BotService],
})
export class BotModule {}
