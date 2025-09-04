import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Find or create user by Telegram ID
   */
  async findOrCreate(telegramId: number, userData?: Partial<User>): Promise<UserDocument> {
    let user = await this.userModel.findOne({ telegramId });
    
    if (!user) {
      user = new this.userModel({
        telegramId,
        ...userData,
      });
      await user.save();
    } else {
      // Update last activity
      user.lastActivity = new Date();
      await user.save();
    }
    
    return user;
  }

  /**
   * Find user by Telegram ID
   */
  async findByTelegramId(telegramId: number): Promise<UserDocument | null> {
    return this.userModel.findOne({ telegramId });
  }

  /**
   * Update user information
   */
  async updateUser(telegramId: number, updateData: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { telegramId },
      { ...updateData, lastActivity: new Date() },
      { new: true }
    );
  }
}
