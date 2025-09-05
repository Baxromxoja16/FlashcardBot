import { Injectable } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { UserService } from '../user/user.service';
import { DeckService } from '../deck/deck.service';
import { CardService } from '../card/card.service';
import { StatsService } from '../stats/stats.service';
import { Types } from 'mongoose';

export interface SessionData {
  step?: string;
  deckId?: string;
  cardId?: string;
  front?: string;
  back?: string;
  currentCardIndex?: number;
  studyCards?: any[];
  editingDeck?: string;
  editingCard?: string;
}

@Injectable()
export class BotService {
  private sessions = new Map<number, SessionData>(); // Simple in-memory session storage

  constructor(
    private userService: UserService,
    private deckService: DeckService,
    private cardService: CardService,
    private statsService: StatsService,
  ) {}

  /**
   * Get or create session for user
   */
  private getSession(telegramId: number): SessionData {
    if (!this.sessions.has(telegramId)) {
      this.sessions.set(telegramId, {});
    }
    return this.sessions.get(telegramId)!;
  }

  /**
   * Clear session for user
   */
  private clearSession(telegramId: number): void {
    this.sessions.set(telegramId, {});
  }

  /**
   * Handle /start command
   */
  async handleStart(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const userData = {
      username: ctx.from!.username,
      firstName: ctx.from!.first_name,
      lastName: ctx.from!.last_name,
    };
    const decks = await this.deckService.findByTelegramId(telegramId);

    if (decks.length === 0) {
      await ctx.reply(
        '❌ You don\'t have any decks yet!\nPlease create a deck first.',
        Markup.keyboard([['📦 New Deck'], ['⬅️ Back to Main Menu']]).resize()
      );
      return;
    }

    await this.userService.findOrCreate(telegramId, userData);
    this.clearSession(telegramId);

    const deckButtons = decks.map(deck => [`📚 ${deck.name}`]);
    deckButtons.push(['❌ Cancel']);

    await ctx.reply(
      '🔍 Browse Decks:\nSelect a deck to manage:',
      Markup.keyboard(deckButtons).resize()
    );

    const session = this.getSession(telegramId);
    session.step = 'browsing_decks';
  }

  /**
   * Handle deck management in browse mode
   */
  async handleBrowseDeck(ctx: Context, deckName: string): Promise<void> {
    const telegramId = ctx.from!.id;
    const decks = await this.deckService.findByTelegramId(telegramId);
    const deck = decks.find(d => d.name === deckName);

    if (!deck) {
      await ctx.reply('❌ Deck not found!');
      return;
    }

    const stats = await this.cardService.getCardStats((deck as any)._id.toString());
    const session = this.getSession(telegramId);
    session.editingDeck = (deck as any)._id.toString();

    await ctx.reply(
      `📂 Deck: ${deck.name}\n` +
      `📊 Cards: ${stats.total}\n` +
      `🆕 New: ${stats.new}\n` +
      `📚 Learning: ${stats.learning}\n` +
      `🎯 Young: ${stats.young}\n` +
      `⭐ Mature: ${stats.mature}\n\n` +
      `What would you like to do?`,
      Markup.keyboard([
        ['✏️ Rename Deck', '🗑️ Delete Deck'],
        ['📋 View Cards', '🃏 Add Card'],
        ['⬅️ Back to Browse']
      ]).resize()
    );
  }

  /**
   * Handle rename deck
   */
  async handleRenameDeck(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);
    session.step = 'renaming_deck';

    await ctx.reply(
      '✏️ Enter the new name for this deck:',
      Markup.keyboard([['❌ Cancel']]).resize()
    );
  }

  /**
   * Handle delete deck
   */
  async handleDeleteDeck(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    await ctx.reply(
      '⚠️ Are you sure you want to delete this deck?\n' +
      'This will permanently delete all cards in it!',
      Markup.keyboard([
        ['🗑️ Yes, Delete', '❌ Cancel']
      ]).resize()
    );

    session.step = 'confirming_deck_delete';
  }

  /**
   * Handle view cards in deck
   */
  async handleViewCards(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    if (!session.editingDeck) {
      await ctx.reply('❌ No deck selected!');
      return;
    }

    const cards = await this.cardService.findByDeckId(session.editingDeck);

    if (cards.length === 0) {
      await ctx.reply(
        '📭 This deck has no cards yet!\nAdd some cards to get started.',
        Markup.keyboard([
          ['🃏 Add Card'],
          ['⬅️ Back to Deck']
        ]).resize()
      );
      return;
    }

    let message = '📋 Cards in this deck:\n\n';
    const cardButtons: string[][] = [];

    cards.forEach((card, index) => {
      const shortFront = card.front.length > 30 
        ? card.front.substring(0, 30) + '...' 
        : card.front;
      
      message += `${index + 1}. ${shortFront}\n`;
      cardButtons.push([`🃏 ${index + 1}: ${shortFront}`]);
    });

    cardButtons.push(['⬅️ Back to Deck']);

    await ctx.reply(message, Markup.keyboard(cardButtons).resize());
    session.step = 'viewing_cards';
  }

  /**
   * Handle card management
   */
  async handleManageCard(ctx: Context, cardIndex: number): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    if (!session.editingDeck) {
      await ctx.reply('❌ No deck selected!');
      return;
    }

    const cards = await this.cardService.findByDeckId(session.editingDeck);
    const card = cards[cardIndex];

    if (!card) {
      await ctx.reply('❌ Card not found!');
      return;
    }

    session.editingCard = (card as any)._id.toString();

    await ctx.reply(
      `🃏 Card Preview:\n\n` +
      `❓ Front: ${card.front}\n\n` +
      `✅ Back: ${card.back}\n\n` +
      `📊 Status: ${card.status}\n` +
      `🔄 Reviewed: ${card.timesReviewed} times\n\n` +
      `What would you like to do?`,
      Markup.keyboard([
        ['✏️ Edit Front', '✏️ Edit Back'],
        ['🗑️ Delete Card'],
        ['⬅️ Back to Cards']
      ]).resize()
    );
  }

  /**
   * Handle Stats menu
   */
  async handleStats(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const stats = await this.statsService.getUserStats(telegramId);
    this.clearSession(telegramId);

    const message = 
      '📊 Your Learning Statistics\n\n' +
      `📚 Total Decks: ${stats.totalDecks}\n` +
      `🃏 Total Cards: ${stats.totalCards}\n\n` +
      `📈 Card Breakdown:\n` +
      `🆕 New: ${stats.newCards}\n` +
      `📚 Learning: ${stats.learningCards}\n` +
      `🎯 Young: ${stats.youngCards}\n` +
      `⭐ Mature: ${stats.matureCards}\n\n` +
      `Keep up the great work! 🎯`;

    await ctx.reply(message, this.getMainMenuKeyboard());
  }

  /**
   * Handle Account menu
   */
  async handleAccount(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const user = await this.userService.findByTelegramId(telegramId);
    this.clearSession(telegramId);

    if (!user) {
      await ctx.reply('❌ User not found!');
      return;
    }

    const message = 
      '👤 Your Account Information\n\n' +
      `🆔 Telegram ID: ${user.telegramId}\n` +
      `👤 Username: ${user.username || 'Not set'}\n` +
      `📝 First Name: ${user.firstName || 'Not set'}\n` +
      `📝 Last Name: ${user.lastName || 'Not set'}\n` +
      `📅 Joined: ${user.createdAt?.toDateString()}\n` +
      `🕐 Last Active: ${user.lastActivity?.toDateString()}`;

    await ctx.reply(message, this.getMainMenuKeyboard());
  }

  /**
   * Handle text messages (for multi-step flows)
   */
  async handleTextMessage(ctx: Context, text: string): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    switch (session.step) {
      case 'awaiting_deck_name':
        await this.createDeck(ctx, text);
        break;

      case 'selecting_deck_for_card':
        if (text.startsWith('📚 ')) {
          const deckName = text.substring(3);
          await this.selectDeckForCard(ctx, deckName);
        }
        break;

      case 'awaiting_card_front':
        session.front = text;
        session.step = 'awaiting_card_back';
        await ctx.reply(
          '🃏 Now enter the back side (answer) of the card:',
          Markup.keyboard([['❌ Cancel']]).resize()
        );
        break;

      case 'awaiting_card_back':
        session.back = text;
        await this.createCard(ctx);
        break;

      case 'renaming_deck':
        await this.renameDeck(ctx, text);
        break;

      case 'editing_card_front':
        await this.editCardFront(ctx, text);
        break;

      case 'editing_card_back':
        await this.editCardBack(ctx, text);
        break;

      default:
        // Handle main menu and other button presses
        await this.handleButtonPress(ctx, text);
        break;
    }
  }

  /**
   * Create deck with given name
   */
  private async createDeck(ctx: Context, name: string): Promise<void> {
    const telegramId = ctx.from!.id;
    const user = await this.userService.findByTelegramId(telegramId);

    if (!user) {
      await ctx.reply('❌ User not found!');
      return;
    }

    try {
      await this.deckService.create(name, (user as any)._id, telegramId);
      await ctx.reply(
        `✅ Deck "${name}" created successfully!\n\n` +
        `What would you like to do next?`,
        Markup.keyboard([
          ['🃏 Add Cards to This Deck'],
          ['📚 View My Decks'],
          ['⬅️ Back to Main Menu']
        ]).resize()
      );
      
      this.clearSession(telegramId);
    } catch (error) {
      await ctx.reply('❌ Error creating deck. Please try again.');
    }
  }

  /**
   * Select deck for adding a card
   */
  private async selectDeckForCard(ctx: Context, deckName: string): Promise<void> {
    const telegramId = ctx.from!.id;
    const decks = await this.deckService.findByTelegramId(telegramId);
    const deck = (decks.filter(d => d.name == deckName))[0];
    if (!deck) {
      await ctx.reply('❌ Deck not found!');
      return;
    }

    const session = this.getSession(telegramId);
    session.deckId = (deck as any)._id.toString();
    session.step = 'awaiting_card_front';

    await ctx.reply(
      `🃏 Adding card to deck: "${deck.name}"\n\n` +
      `Enter the front side (question) of the card:`,
      Markup.keyboard([['❌ Cancel']]).resize()
    );
  }

  /**
   * Create card with stored front and back text
   */
  private async createCard(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);
    const user = await this.userService.findByTelegramId(telegramId);

    if (!user || !session.deckId || !session.front || !session.back) {
      await ctx.reply('❌ Missing required information!');
      return;
    }

    try {
      await this.cardService.create(
        session.front,
        session.back,
        new Types.ObjectId(session.deckId),
        (user as any)._id,
        telegramId
      );

      await ctx.reply(
        `✅ Card created successfully!\n\n` +
        `Front: ${session.front}\n` +
        `Back: ${session.back}\n\n` +
        `What would you like to do next?`,
        Markup.keyboard([
          ['🃏 Add Another Card'],
          ['📚 View My Decks'],
          ['⬅️ Back to Main Menu']
        ]).resize()
      );

      this.clearSession(telegramId);
    } catch (error) {
      await ctx.reply('❌ Error creating card. Please try again.');
    }
  }

  /**
   * Rename deck
   */
  private async renameDeck(ctx: Context, newName: string): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    if (!session.editingDeck) {
      await ctx.reply('❌ No deck selected!');
      return;
    }

    try {
      await this.deckService.updateName(session.editingDeck, newName);
      await ctx.reply(
        `✅ Deck renamed to "${newName}" successfully!`,
        this.getMainMenuKeyboard()
      );
      this.clearSession(telegramId);
    } catch (error) {
      await ctx.reply('❌ Error renaming deck. Please try again.');
    }
  }

  /**
   * Edit card front
   */
  private async editCardFront(ctx: Context, newFront: string): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    if (!session.editingCard) {
      await ctx.reply('❌ No card selected!');
      return;
    }

    try {
      await this.cardService.updateCard(session.editingCard, newFront);
      await ctx.reply(
        `✅ Card front updated successfully!`,
        this.getMainMenuKeyboard()
      );
      this.clearSession(telegramId);
    } catch (error) {
      await ctx.reply('❌ Error updating card. Please try again.');
    }
  }

  /**
   * Edit card back
   */
  private async editCardBack(ctx: Context, newBack: string): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    if (!session.editingCard) {
      await ctx.reply('❌ No card selected!');
      return;
    }

    try {
      await this.cardService.updateCard(session.editingCard, undefined, newBack);
      await ctx.reply(
        `✅ Card back updated successfully!`,
        this.getMainMenuKeyboard()
      );
      this.clearSession(telegramId);
    } catch (error) {
      await ctx.reply('❌ Error updating card. Please try again.');
    }
  }

  /**
   * Handle button presses and navigation
   */
  private async handleButtonPress(ctx: Context, text: string): Promise<void> {
    switch (text) {
      // Main menu buttons
      case '➕ Add':
        await this.handleAdd(ctx);
        break;
      case '📚 Decks':
        await this.handleDecks(ctx);
        break;
      case '🔍 Browse':
        await this.handleBrowse(ctx);
        break;
      case '📊 Stats':
        await this.handleStats(ctx);
        break;
      case '👤 Account':
        await this.handleAccount(ctx);
        break;

      // Add menu buttons
      case '📦 New Deck':
        await this.handleNewDeck(ctx);
        break;
      case '🃏 New Card':
        await this.handleNewCard(ctx);
        break;

      // Study session buttons
      case '👀 Show Answer':
        await this.handleShowAnswer(ctx);
        break;
      case '✅ Yes':
        await this.handleAnswerEvaluation(ctx, true);
        break;
      case '❌ No':
        await this.handleAnswerEvaluation(ctx, false);
        break;

      // Browse deck management buttons
      case '✏️ Rename Deck':
        await this.handleRenameDeck(ctx);
        break;
      case '🗑️ Delete Deck':
        await this.handleDeleteDeck(ctx);
        break;
      case '📋 View Cards':
        await this.handleViewCards(ctx);
        break;

      // Deck deletion confirmation
      case '🗑️ Yes, Delete':
        await this.confirmDeleteDeck(ctx);
        break;

      // Card editing buttons
      case '✏️ Edit Front':
        await this.startEditCardFront(ctx);
        break;
      case '✏️ Edit Back':
        await this.startEditCardBack(ctx);
        break;
      case '🗑️ Delete Card':
        await this.deleteCard(ctx);
        break;

      // Navigation buttons
      case '⬅️ Back to Main Menu':
      case '❌ Cancel':
      case '🔚 End Study':
        await this.handleStart(ctx);
        break;
      case '⬅️ Back to Browse':
        await this.handleBrowse(ctx);
        break;
      case '⬅️ Back to Deck':
        await this.backToDeckManagement(ctx);
        break;
      case '⬅️ Back to Cards':
        await this.handleViewCards(ctx);
        break;

      // Special case buttons
      case '🃏 Add Cards to This Deck':
        await this.handleNewCard(ctx);
        break;
      case '🃏 Add Another Card':
        await this.handleNewCard(ctx);
        break;

      default:
        // Handle study deck selection
        if (text.startsWith('🎯 Study: ')) {
          // const deckName = text.substring(10);
          const deckName = text.split(': ')[1];
          await this.handleStudy(ctx, deckName);
        }
        // Handle browse deck selection
        else if (text.startsWith('📂 ')) {
          const deckName = text.substring(3);
          await this.handleBrowseDeck(ctx, deckName);
        }
        // Handle card selection in browse mode
        else if (text.startsWith('🃏 ') && text.includes(': ')) {
          const cardIndexStr = text.split(':')[0].substring(2).trim();
          const cardIndex = parseInt(cardIndexStr) - 1;
          await this.handleManageCard(ctx, cardIndex);
        }
        else {
          await ctx.reply(
            '❓ I didn\'t understand that command.\nPlease use the menu buttons below:',
            this.getMainMenuKeyboard()
          );
        }
        break;
    }
  }

  /**
   * Confirm deck deletion
   */
  private async confirmDeleteDeck(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    if (!session.editingDeck) {
      await ctx.reply('❌ No deck selected!');
      return;
    }

    try {
      // Delete all cards in the deck first
      const cards = await this.cardService.findByDeckId(session.editingDeck);
      for (const card of cards) {
        await this.cardService.delete((card as any)._id.toString());
      }

      // Delete the deck
      await this.deckService.delete(session.editingDeck);

      await ctx.reply(
        '✅ Deck and all its cards have been deleted successfully!',
        this.getMainMenuKeyboard()
      );
      this.clearSession(telegramId);
    } catch (error) {
      await ctx.reply('❌ Error deleting deck. Please try again.');
    }
  }

  /**
   * Start editing card front
   */
  private async startEditCardFront(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);
    session.step = 'editing_card_front';

    await ctx.reply(
      '✏️ Enter the new front side (question) for this card:',
      Markup.keyboard([['❌ Cancel']]).resize()
    );
  }

  /**
   * Start editing card back
   */
  private async startEditCardBack(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);
    session.step = 'editing_card_back';

    await ctx.reply(
      '✏️ Enter the new back side (answer) for this card:',
      Markup.keyboard([['❌ Cancel']]).resize()
    );
  }

  /**
   * Delete current card
   */
  private async deleteCard(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    if (!session.editingCard) {
      await ctx.reply('❌ No card selected!');
      return;
    }

    try {
      await this.cardService.delete(session.editingCard);
      await ctx.reply(
        '✅ Card deleted successfully!',
        this.getMainMenuKeyboard()
      );
      this.clearSession(telegramId);
    } catch (error) {
      await ctx.reply('❌ Error deleting card. Please try again.');
    }
  }

  /**
   * Go back to deck management
   */
  private async backToDeckManagement(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    if (!session.editingDeck) {
      await this.handleBrowse(ctx);
      return;
    }

    const deck = await this.deckService.findById(session.editingDeck);
    if (!deck) {
      await this.handleBrowse(ctx);
      return;
    }

    await this.handleBrowseDeck(ctx, deck.name);
  }


  /**
   * Get main menu keyboard
   */
  private getMainMenuKeyboard() {
    return Markup.keyboard([
      ['➕ Add', '📚 Decks'],
      ['🔍 Browse', '📊 Stats'],
      ['👤 Account']
    ]).resize();
  }

  /**
   * Handle Add menu
   */
  async handleAdd(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    this.clearSession(telegramId);

    await ctx.reply(
      '➕ What would you like to add?',
      Markup.keyboard([
        ['📦 New Deck', '🃏 New Card'],
        ['⬅️ Back to Main Menu']
      ]).resize()
    );
  }

  /**
   * Handle New Deck creation
   */
  async handleNewDeck(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);
    session.step = 'awaiting_deck_name';

    await ctx.reply(
      '📦 Enter the name for your new deck:',
      Markup.keyboard([['❌ Cancel']]).resize()
    );
  }

  /**
   * Handle New Card creation
   */
  async handleNewCard(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const decks = await this.deckService.findByTelegramId(telegramId);

    if (decks.length === 0) {
      await ctx.reply(
        '❌ You don\'t have any decks yet!\nPlease create a deck first.',
        Markup.keyboard([['📦 New Deck'], ['⬅️ Back to Main Menu']]).resize()
      );
      return;
    }

    const deckButtons = decks.map(deck => [`📚 ${deck.name}`]);
    deckButtons.push(['❌ Cancel']);

    await ctx.reply(
      '🃏 Select a deck to add the card to:',
      Markup.keyboard(deckButtons).resize()
    );

    const session = this.getSession(telegramId);
    session.step = 'selecting_deck_for_card';
  }

  /**
   * Handle Decks menu
   */
  async handleDecks(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const decks = await this.deckService.findByTelegramId(telegramId);
    this.clearSession(telegramId);

    if (decks.length === 0) {
      await ctx.reply(
        '📚 You don\'t have any decks yet!\nCreate your first deck to get started.',
        Markup.keyboard([['➕ Add'], ['⬅️ Back to Main Menu']]).resize()
      );
      return;
    }

    let message = '📚 Your Decks:\n\n';
    const deckButtons: string[][] = [];

    for (const deck of decks) {
      const stats = await this.cardService.getCardStats((deck as any)._id.toString());
      message += `📦 ${deck.name}\n`;
      message += `   Cards: ${stats.total} (${stats.new} new, ${stats.learning} learning)\n\n`;
      
      deckButtons.push([`🎯 Study: ${deck.name}`]);
    }

    deckButtons.push(['⬅️ Back to Main Menu']);

    await ctx.reply(message, Markup.keyboard(deckButtons).resize());
  }

  /**
   * Handle Study session
   */
  async handleStudy(ctx: Context, deckName: string): Promise<void> {
    const telegramId = ctx.from!.id;
    const decks = await this.deckService.findByTelegramId(telegramId);
    const deck = decks.find(d => d.name === deckName);

    if (!deck) {
      await ctx.reply('❌ Deck not found!');
      return;
    }

    const dueCards = await this.cardService.findDueCards((deck as any)._id.toString());

    if (dueCards.length === 0) {
      await ctx.reply(
        '✅ No cards due for review in this deck!\nCome back later.',
        this.getMainMenuKeyboard()
      );
      return;
    }

    const session = this.getSession(telegramId);
    session.step = 'studying';
    session.deckId = (deck as any)._id.toString();
    session.studyCards = dueCards;
    session.currentCardIndex = 0;

    await this.showCurrentCard(ctx);
  }

  /**
   * Show current card in study session
   */
  private async showCurrentCard(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);
    
    if (!session.studyCards || session.currentCardIndex === undefined) {
      await ctx.reply('❌ Study session error!', this.getMainMenuKeyboard());
      return;
    }

    const currentCard = session.studyCards[session.currentCardIndex];
    if (!currentCard) {
      // Study session complete
      await ctx.reply(
        '🎉 Study session complete!\nGreat job!',
        this.getMainMenuKeyboard()
      );
      this.clearSession(telegramId);
      return;
    }

    session.cardId = currentCard._id.toString();

    await ctx.reply(
      `🃏 Card ${session.currentCardIndex + 1} of ${session.studyCards.length}\n\n` +
      `❓ Question:\n${currentCard.front}`,
      Markup.keyboard([
        ['👀 Show Answer'],
        ['✏️ Edit Card', '❌ End Study']
      ]).resize()
    );
  }

  /**
   * Show answer for current card
   */
  async handleShowAnswer(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    if (!session.cardId || !session.studyCards || session.currentCardIndex === undefined) {
      await ctx.reply('❌ No active study session!');
      return;
    }

    const currentCard = session.studyCards[session.currentCardIndex];

    await ctx.reply(
      `✅ Answer:\n${currentCard.back}\n\n` +
      `❓ Did you remember it correctly?`,
      Markup.keyboard([
        ['✅ Yes', '❌ No'],
        ['✏️ Edit Card', '🔚 End Study']
      ]).resize()
    );
  }

  /**
   * Handle answer evaluation
   */
  async handleAnswerEvaluation(ctx: Context, isCorrect: boolean): Promise<void> {
    const telegramId = ctx.from!.id;
    const session = this.getSession(telegramId);

    if (!session.cardId) {
      await ctx.reply('❌ No card to evaluate!');
      return;
    }

    // Update card based on user response
    await this.cardService.reviewCard(session.cardId, isCorrect);

    const resultMessage = isCorrect 
      ? '✅ Correct! Card scheduled for later review.'
      : '❌ Don\'t worry! Card will be shown again soon.';

    await ctx.reply(resultMessage);

    // Move to next card
    session.currentCardIndex = (session.currentCardIndex || 0) + 1;
    
    setTimeout(() => this.showCurrentCard(ctx), 1500);
  }

  /**
   * Handle Browse menu
   */
 async handleBrowse(ctx: Context): Promise<void> {
    const telegramId = ctx.from!.id;
    const decks = await this.deckService.findByTelegramId(telegramId);
    this.clearSession(telegramId);

    if (decks.length === 0) {
      await ctx.reply(
        '📚 Hali hech qanday deck yaratilmagan!\nBirinchi deckingizni yaratish uchun boshlang.',
        this.getMainMenuKeyboard()
      );
      return;
    }

    // Deck tugmalarini yaratish
    const deckButtons: string[][] = [];
    let message = '🔍 Mavjud Decklar:\n\n';

    // Har bir deck uchun ma'lumot va tugma yaratish
    for (let i = 0; i < decks.length; i++) {
      const deck = decks[i];
      const stats = await this.cardService.getCardStats((deck as any)._id.toString());
      
      message += `${i + 1}. 📂 ${deck.name}\n`;
      message += `   📊 Kartalar: ${stats.total}\n`;
      message += `   🆕 Yangi: ${stats.new} | 📚 O'rganilayotgan: ${stats.learning}\n`;
      message += `   🎯 Yosh: ${stats.young} | ⭐ Pishgan: ${stats.mature}\n\n`;
      
      deckButtons.push([`📂 ${deck.name}`]);
    }

    deckButtons.push(['⬅️ Asosiy Menyuga Qaytish']);

    await ctx.reply(
      message + 'Boshqarish uchun deckni tanlang:',
      Markup.keyboard(deckButtons).resize()
    );

    const session = this.getSession(telegramId);
    session.step = 'browsing_decks';
  }
}
