import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegrafModule } from 'nestjs-telegraf';
// import { UserModule } from './user/user.module';
// import { DeckModule } from './deck/deck.module';
// import { CardModule } from './card/card.module';
// import { BotModule } from './bot/bot.module';
// import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    // Configuration module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // MongoDB connection
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/flashcardbot',
    ),

    // Telegram bot configuration
    TelegrafModule.forRoot({
      token: process.env.TELEGRAM_BOT_TOKEN ?? (() => { throw new Error('TELEGRAM_BOT_TOKEN is not defined'); })(),
    }),

    // Feature modules
    // UserModule,
    // DeckModule,
    // CardModule,
    // BotModule,
    // StatsModule,
  ],
})
export class AppModule {}
