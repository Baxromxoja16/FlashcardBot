import { Injectable } from '@nestjs/common';
import { Start, Update, On, Hears, Context } from 'nestjs-telegraf';
import { BotService } from './bot.service';

@Update()
@Injectable()
export class BotUpdate {
  constructor(private readonly botService: BotService) {}

  /**
   * Handle /start command
   */
  @Start()
  async start(@Context() ctx: any) {
    await this.botService.handleStart(ctx);
  }

  /**
   * Handle text messages
   */
  @On('text')
  async handleText(@Context() ctx: any) {
    const text = ctx.message.text;
    await this.botService.handleTextMessage(ctx, text);
  }

  /**
   * Handle callback queries (if needed for inline keyboards in future)
   */
  @On('callback_query')
  async handleCallbackQuery(@Context() ctx: any) {
    await ctx.answerCbQuery();
    // Handle callback data if needed
  }
}

