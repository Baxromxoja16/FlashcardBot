import { Injectable } from '@nestjs/common';
import { CardService } from '../card/card.service';
import { DeckService } from '../deck/deck.service';

@Injectable()
export class StatsService {
  constructor(
    private cardService: CardService,
    private deckService: DeckService,
  ) {}

  /**
   * Get overall statistics for a user
   */
  async getUserStats(telegramId: number): Promise<{
    totalDecks: number;
    totalCards: number;
    newCards: number;
    learningCards: number;
    youngCards: number;
    matureCards: number;
  }> {
    const decks = await this.deckService.findByTelegramId(telegramId);
    
    let totalCards = 0;
    let newCards = 0;
    let learningCards = 0;
    let youngCards = 0;
    let matureCards = 0;

    for (const deck of decks) {
      const stats = await this.cardService.getCardStats((deck as any)._id.toString());
      totalCards += stats.total;
      newCards += stats.new;
      learningCards += stats.learning;
      youngCards += stats.young;
      matureCards += stats.mature;
    }

    return {
      totalDecks: decks.length,
      totalCards,
      newCards,
      learningCards,
      youngCards,
      matureCards,
    };
  }

  /**
   * Get deck-specific statistics
   */
  async getDeckStats(deckId: string) {
    return this.cardService.getCardStats(deckId);
  }
}
