import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deck, DeckDocument } from './schemas/deck.schema';

@Injectable()
export class DeckService {
  constructor(
    @InjectModel(Deck.name) private deckModel: Model<DeckDocument>,
  ) {}

  /**
   * Create a new deck
   */
  async create(name: string, userId: Types.ObjectId, telegramId: number): Promise<DeckDocument> {
    const deck = new this.deckModel({
      name,
      userId,
      telegramId,
    });
    return deck.save();
  }

  /**
   * Find all decks for a user
   */
  async findByTelegramId(telegramId: number): Promise<DeckDocument[]> {
    return this.deckModel.find({ telegramId }).sort({ createdAt: -1 });
  }

  /**
   * Find deck by ID
   */
  async findById(deckId: string): Promise<DeckDocument | null> {
    return this.deckModel.findById(deckId);
  }

  /**
   * Update deck name
   */
  async updateName(deckId: string, name: string): Promise<DeckDocument | null> {
    return this.deckModel.findByIdAndUpdate(
      deckId,
      { name },
      { new: true }
    );
  }

  /**
   * Delete deck and its cards
   */
  async delete(deckId: string): Promise<boolean> {
    const result = await this.deckModel.findByIdAndDelete(deckId);
    return !!result;
  }

  /**
   * Update deck statistics
   */
  async updateStats(deckId: string, stats: Partial<Pick<Deck, 'totalCards' | 'newCards' | 'learningCards' | 'matureCards'>>): Promise<void> {
    await this.deckModel.findByIdAndUpdate(deckId, stats);
  }
}
