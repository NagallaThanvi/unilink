import { db } from '@/db';
import { user, userProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'networking' | 'career' | 'giving' | 'engagement' | 'learning';
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface UserStats {
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  currentLevelPoints: number;
  achievements: Achievement[];
  badges: Badge[];
  streak: {
    current: number;
    longest: number;
    type: 'login' | 'posting' | 'networking';
  };
  leaderboardRank?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: string;
}

export class GamificationService {
  
  // Point values for different actions
  private static readonly POINT_VALUES = {
    PROFILE_COMPLETE: 100,
    FIRST_CONNECTION: 50,
    CONNECTION_MADE: 10,
    POST_CREATED: 25,
    POST_LIKED: 5,
    COMMENT_MADE: 15,
    SKILL_ENDORSED: 20,
    JOB_APPLIED: 30,
    SCHOLARSHIP_CREATED: 200,
    GUEST_SESSION: 150,
    CURRICULUM_FEEDBACK: 100,
    DAILY_LOGIN: 5,
    PROFILE_VIEWED: 2,
    MESSAGE_SENT: 10,
    EVENT_ATTENDED: 50,
    CREDENTIAL_VERIFIED: 75,
  };

  // Level thresholds
  private static readonly LEVEL_THRESHOLDS = [
    0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 17000, 25000, 35000, 50000, 75000
  ];

  /**
   * Award points to a user for an action
   */
  static async awardPoints(userId: string, action: keyof typeof GamificationService.POINT_VALUES, metadata?: any): Promise<number> {
    try {
      const points = this.POINT_VALUES[action];
      
      // Get current user stats
      const currentStats = await this.getUserStats(userId);
      const newTotalPoints = currentStats.totalPoints + points;
      
      // Check for level up
      const newLevel = this.calculateLevel(newTotalPoints);
      const leveledUp = newLevel > currentStats.level;
      
      // Update user points (this would be stored in a separate gamification table in production)
      console.log(`Awarded ${points} points to user ${userId} for ${action}`);
      
      // Check for new achievements
      await this.checkAchievements(userId, action, metadata);
      
      // If leveled up, award level-up achievement
      if (leveledUp) {
        await this.awardAchievement(userId, `level_${newLevel}`);
      }
      
      return points;
    } catch (error) {
      console.error('Error awarding points:', error);
      return 0;
    }
  }

  /**
   * Get user's gamification stats
   */
  static async getUserStats(userId: string): Promise<UserStats> {
    try {
      // In production, this would query a gamification table
      // For now, we'll return mock data
      const mockStats: UserStats = {
        totalPoints: 1250,
        level: 5,
        nextLevelPoints: 2000,
        currentLevelPoints: 1250,
        achievements: await this.getUserAchievements(userId),
        badges: await this.getUserBadges(userId),
        streak: {
          current: 7,
          longest: 15,
          type: 'login'
        }
      };

      return mockStats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        totalPoints: 0,
        level: 1,
        nextLevelPoints: 100,
        currentLevelPoints: 0,
        achievements: [],
        badges: [],
        streak: { current: 0, longest: 0, type: 'login' }
      };
    }
  }

  /**
   * Calculate level based on total points
   */
  static calculateLevel(totalPoints: number): number {
    for (let i = this.LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalPoints >= this.LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Get all available achievements
   */
  static getAllAchievements(): Achievement[] {
    return [
      {
        id: 'first_connection',
        title: 'Networker',
        description: 'Made your first connection',
        icon: '🤝',
        category: 'networking',
        points: 50,
        rarity: 'common'
      },
      {
        id: 'connection_master',
        title: 'Connection Master',
        description: 'Connected with 50+ alumni',
        icon: '🌐',
        category: 'networking',
        points: 200,
        rarity: 'rare'
      },
      {
        id: 'job_hunter',
        title: 'Job Hunter',
        description: 'Applied to your first job',
        icon: '🎯',
        category: 'career',
        points: 30,
        rarity: 'common'
      },
      {
        id: 'scholarship_creator',
        title: 'Generous Alumni',
        description: 'Created your first scholarship',
        icon: '🎓',
        category: 'giving',
        points: 200,
        rarity: 'epic'
      },
      {
        id: 'mentor',
        title: 'Mentor',
        description: 'Mentored 5+ students',
        icon: '👨‍🏫',
        category: 'giving',
        points: 300,
        rarity: 'epic'
      },
      {
        id: 'influencer',
        title: 'Influencer',
        description: 'Got 100+ likes on a post',
        icon: '⭐',
        category: 'engagement',
        points: 150,
        rarity: 'rare'
      },
      {
        id: 'early_adopter',
        title: 'Early Adopter',
        description: 'One of the first 100 users',
        icon: '🚀',
        category: 'engagement',
        points: 500,
        rarity: 'legendary'
      },
      {
        id: 'blockchain_verified',
        title: 'Blockchain Verified',
        description: 'Verified credentials on blockchain',
        icon: '⛓️',
        category: 'learning',
        points: 75,
        rarity: 'common'
      },
      {
        id: 'skill_master',
        title: 'Skill Master',
        description: 'Received 25+ skill endorsements',
        icon: '💪',
        category: 'learning',
        points: 250,
        rarity: 'rare'
      },
      {
        id: 'level_5',
        title: 'Rising Star',
        description: 'Reached level 5',
        icon: '🌟',
        category: 'engagement',
        points: 100,
        rarity: 'common'
      },
      {
        id: 'level_10',
        title: 'Platform Expert',
        description: 'Reached level 10',
        icon: '👑',
        category: 'engagement',
        points: 300,
        rarity: 'epic'
      }
    ];
  }

  /**
   * Get user's unlocked achievements
   */
  static async getUserAchievements(userId: string): Promise<Achievement[]> {
    // In production, this would query the database
    // For now, return some mock achievements
    const allAchievements = this.getAllAchievements();
    
    return [
      { ...allAchievements[0], unlockedAt: '2024-10-01T10:00:00Z' },
      { ...allAchievements[2], unlockedAt: '2024-10-05T14:30:00Z' },
      { ...allAchievements[7], unlockedAt: '2024-10-10T09:15:00Z' },
      { ...allAchievements[9], unlockedAt: '2024-10-15T16:45:00Z' }
    ];
  }

  /**
   * Get user's badges
   */
  static async getUserBadges(userId: string): Promise<Badge[]> {
    return [
      {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Joined in the first month',
        icon: '🐦',
        color: '#3b82f6',
        earnedAt: '2024-10-01T00:00:00Z'
      },
      {
        id: 'active_member',
        name: 'Active Member',
        description: 'Active for 30+ days',
        icon: '🔥',
        color: '#ef4444',
        earnedAt: '2024-10-30T00:00:00Z'
      }
    ];
  }

  /**
   * Award achievement to user
   */
  static async awardAchievement(userId: string, achievementId: string): Promise<void> {
    try {
      const achievement = this.getAllAchievements().find(a => a.id === achievementId);
      
      if (!achievement) {
        console.warn(`Achievement ${achievementId} not found`);
        return;
      }

      // In production, this would insert into achievements table
      console.log(`Awarded achievement "${achievement.title}" to user ${userId}`);
      
      // Award points for the achievement
      await this.awardPoints(userId, 'PROFILE_COMPLETE'); // Using as placeholder
      
    } catch (error) {
      console.error('Error awarding achievement:', error);
    }
  }

  /**
   * Check if user qualifies for new achievements
   */
  static async checkAchievements(userId: string, action: string, metadata?: any): Promise<void> {
    try {
      // Check various achievement conditions based on the action
      switch (action) {
        case 'CONNECTION_MADE':
          // Check if this is their first connection
          // In production, query the database for connection count
          break;
          
        case 'JOB_APPLIED':
          await this.awardAchievement(userId, 'job_hunter');
          break;
          
        case 'SCHOLARSHIP_CREATED':
          await this.awardAchievement(userId, 'scholarship_creator');
          break;
          
        case 'CREDENTIAL_VERIFIED':
          await this.awardAchievement(userId, 'blockchain_verified');
          break;
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit: number = 10, category?: string): Promise<Array<{
    userId: string;
    name: string;
    points: number;
    level: number;
    rank: number;
  }>> {
    try {
      // In production, this would query the database
      // For now, return mock leaderboard data
      return [
        { userId: '1', name: 'Alice Johnson', points: 5420, level: 8, rank: 1 },
        { userId: '2', name: 'Bob Smith', points: 4890, level: 7, rank: 2 },
        { userId: '3', name: 'Carol Davis', points: 4320, level: 7, rank: 3 },
        { userId: '4', name: 'David Wilson', points: 3850, level: 6, rank: 4 },
        { userId: '5', name: 'Eva Brown', points: 3420, level: 6, rank: 5 }
      ];
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Update daily streak
   */
  static async updateStreak(userId: string, type: 'login' | 'posting' | 'networking'): Promise<number> {
    try {
      // In production, this would update the streak in database
      // For now, just return a mock streak
      const currentStreak = 7;
      
      if (currentStreak > 0 && currentStreak % 7 === 0) {
        // Award streak achievement
        await this.awardPoints(userId, 'DAILY_LOGIN');
      }
      
      return currentStreak;
    } catch (error) {
      console.error('Error updating streak:', error);
      return 0;
    }
  }

  /**
   * Get achievement progress for specific goals
   */
  static async getAchievementProgress(userId: string, achievementId: string): Promise<{ current: number; target: number }> {
    // In production, this would calculate progress based on user's actual data
    return { current: 3, target: 5 };
  }
}

// Utility functions
export function getRarityColor(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common': return '#6b7280';
    case 'rare': return '#3b82f6';
    case 'epic': return '#8b5cf6';
    case 'legendary': return '#f59e0b';
    default: return '#6b7280';
  }
}

export function formatPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toString();
}
