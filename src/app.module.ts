import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegrafModule } from 'nestjs-telegraf';
import { UserModule } from './user/user.module';
import { DeckModule } from './deck/deck.module';
import { CardModule } from './card/card.module';
import { BotModule } from './bot/bot.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    // Configuration module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // MongoDB Atlas connection with proper error handling
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        
        if (!uri) {
          throw new Error('MONGODB_URI .env faylida topilmadi!');
        }

        console.log('🔗 MongoDB ga ulanmoqda...');
        
        return {
          uri,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log('✅ MongoDB Atlas ga muvaffaqiyatli ulandi!');
            });
            
            connection.on('disconnected', () => {
              console.log('🔌 MongoDB ulanish uzildi');
            });
            
            connection.on('error', (error) => {
              console.error('❌ MongoDB xatoligi:', error.message);
            });
            
            return connection;
          },
          // Atlas uchun muhim sozlamalar
          serverSelectionTimeoutMS: 5000, // 5 soniya timeout
          heartbeatFrequencyMS: 2000,
          retryWrites: true,
        };
      },
      inject: [ConfigService],
    }),
    
    // Telegram bot configuration with validation
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const token = configService.get<string>('TELEGRAM_BOT_TOKEN');
        
        if (!token) {
          throw new Error('TELEGRAM_BOT_TOKEN .env faylida topilmadi!');
        }

        console.log('🤖 Telegram bot sozlanmoqda...');
        
        return {
          token,
          launchOptions: {
            webhook: undefined, // Polling rejimida ishlash
          },
        };
      },
      inject: [ConfigService],
    }),
    
    // Feature modules
    UserModule,
    DeckModule,
    CardModule,
    BotModule,
    StatsModule,
  ],
})
export class AppModule {
  constructor() {
    console.log('🚀 FlashcardBot moduli yuklandi');
  }
}