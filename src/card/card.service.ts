import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { Card, CardDocument, CardStatus } from './schemas/card.schema';

@Injectable()
export class CardService {
  constructor(
    @InjectModel(Card.name) private cardModel: Model<CardDocument>,
  ) {}

  /**
   * Create a new card
   */
  async create(
    front: string,
    back: string,
    deckId: Types.ObjectId,
    userId: Types.ObjectId,
    telegramId: number
  ): Promise<CardDocument> {
    const card = new this.cardModel({
      front,
      back,
      deckId,
      userId,
      telegramId,
    });
    return card.save();
  }

  /**
   * Find all cards in a deck
   */
  async findByDeckId(deckId: Types.ObjectId): Promise<CardDocument[]> {
    return this.cardModel.find({ deckId }).sort({ createdAt: -1 });
  }

  /**
   * Find cards due for review
   */
  async findDueCards(deckId: string): Promise<CardDocument[]> {
    const now = new Date();
    return this.cardModel
      .find({
        deckId,
        dueDate: { $lte: now }
      })
      .sort({ dueDate: 1 })
      .limit(20); // Limit to 20 cards per session
  }

  /**
   * Update card content
   */
  async updateCard(cardId: string, front?: string, back?: string): Promise<CardDocument | null> {
    const updateData: any = {};
    if (front !== undefined) updateData.front = front;
    if (back !== undefined) updateData.back = back;
    
    return this.cardModel.findByIdAndUpdate(cardId, updateData, { new: true });
  }

  /**
   * Delete card
   */
  async delete(cardId: string): Promise<boolean> {
    const result = await this.cardModel.findByIdAndDelete(cardId);
    return !!result;
  }

  /**
   * Review card - update based on user response
   */
  async reviewCard(cardId: string, isCorrect: boolean): Promise<CardDocument | null> {
    const card = await this.cardModel.findById(cardId);
    if (!card) return null;

    // Update review statistics
    card.timesReviewed += 1;
    if (isCorrect) card.timesCorrect += 1;

    // Simple spaced repetition algorithm
    if (isCorrect) {
      // Correct answer - increase interval
      switch (card.status) {
        case CardStatus.NEW:
          card.status = CardStatus.LEARNING;
          card.interval = 1;
          break;
        case CardStatus.LEARNING:
          if (card.timesCorrect >= 2) {
            card.status = CardStatus.YOUNG;
            card.interval = 4;
          } else {
            card.interval = 1;
          }
          break;
        case CardStatus.YOUNG:
          card.status = CardStatus.MATURE;
          card.interval = Math.max(card.interval * 2.5, 10);
          break;
        case CardStatus.MATURE:
          card.interval = Math.max(card.interval * card.easeFactor, card.interval + 1);
          card.easeFactor = Math.max(card.easeFactor + 0.1, 1.3);
          break;
      }
    } else {
      // Wrong answer - reset to learning
      card.status = CardStatus.LEARNING;
      card.interval = 1;
      card.easeFactor = Math.max(card.easeFactor - 0.2, 1.3);
    }

    // Set next due date
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + card.interval);
    card.dueDate = nextDueDate;

    return card.save();
  }

  /**
   * Get card statistics for a deck
   */
 async getCardStats(deckId: string): Promise<any> {
    const objectId = new mongoose.Types.ObjectId(deckId);

    const stats = await this.cardModel.aggregate([
      { $match: { deckId: objectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      total: 0,
      new: 0,
      learning: 0,
      young: 0,
      mature: 0,
    };

    stats.forEach(stat => {
      formattedStats.total += stat.count;
      switch (stat._id) {
        case CardStatus.NEW:
          formattedStats.new = stat.count;
          break;
        case CardStatus.LEARNING:
          formattedStats.learning = stat.count;
          break;
        case CardStatus.YOUNG:
          formattedStats.young = stat.count;
          break;
        case CardStatus.MATURE:
          formattedStats.mature = stat.count;
          break;
      }
    });

    // Agar siz statuslarni emas, boshqa maydonlarni hisoblayotgan bo'lsangiz, o'zgartiring.
    // Yuqoridagi misolda kartalarda 'status' maydoni bor deb faraz qilingan.

    return formattedStats;
  }

  /**
   * Find card by ID
   */
  async findById(cardId: string): Promise<CardDocument | null> {
    return this.cardModel.findById(cardId);
  }
}
