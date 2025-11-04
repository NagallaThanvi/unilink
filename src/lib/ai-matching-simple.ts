import { db } from '@/db';
import { user, userProfiles, jobPostings } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface MatchingScore {
  userId: string;
  score: number;
  reasons: string[];
  matchType: 'job' | 'mentor' | 'connection';
}

/**
 * Simple AI matching service that works with current schema
 */
export class SimpleAIMatchingService {
  
  /**
   * Find job recommendations for a user
   */
  static async findJobMatches(userId: string, limit: number = 10): Promise<MatchingScore[]> {
    try {
      // Get user profile
      const userResult = await db.select({
        user: user,
        profile: userProfiles
      })
        .from(user)
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .where(eq(user.id, userId))
        .limit(1);

      if (!userResult.length) return [];

      const currentUser = userResult[0];
      
      // Get user skills safely
      let userSkills: string[] = [];
      try {
        if (currentUser.profile?.skills && typeof currentUser.profile.skills === 'string') {
          userSkills = JSON.parse(currentUser.profile.skills);
        }
      } catch (e) {
        console.warn('Failed to parse user skills:', e);
        userSkills = [];
      }

      // Get all active job postings
      const jobs = await db.select()
        .from(jobPostings)
        .where(and(
          eq(jobPostings.status, 'active'),
          sql`${jobPostings.postedById} != ${userId}` // Exclude user's own jobs
        ));

      const matches: MatchingScore[] = [];

      for (const job of jobs) {
        let score = 0;
        const reasons: string[] = [];

        // Skills match (40% weight)
        let jobSkills: string[] = [];
        try {
          if (job.skills && typeof job.skills === 'string') {
            jobSkills = JSON.parse(job.skills);
          }
        } catch (e) {
          jobSkills = [];
        }

        if (jobSkills.length > 0 && userSkills.length > 0) {
          const matchingSkills = userSkills.filter(userSkill => 
            jobSkills.some(jobSkill => 
              jobSkill.toLowerCase().includes(userSkill.toLowerCase()) ||
              userSkill.toLowerCase().includes(jobSkill.toLowerCase())
            )
          );
          
          if (matchingSkills.length > 0) {
            const skillMatchPercentage = matchingSkills.length / jobSkills.length;
            score += skillMatchPercentage * 40;
            reasons.push(`${matchingSkills.length} matching skills`);
          }
        }

        // Location match (30% weight)
        if (job.isRemote) {
          score += 30;
          reasons.push('Remote work available');
        } else if (currentUser.profile?.location && job.location === currentUser.profile.location) {
          score += 30;
          reasons.push('Location matches');
        }

        // University connection (20% weight)
        if (currentUser.profile?.universityId && job.universityId === currentUser.profile.universityId) {
          score += 20;
          reasons.push('Same university');
        }

        // Job type preference (10% weight)
        if (job.jobType === 'full-time') {
          score += 10;
          reasons.push('Full-time position');
        }

        // Only include jobs with some match
        if (score > 10) {
          matches.push({
            userId: job.id.toString(),
            score: Math.round(score),
            reasons,
            matchType: 'job'
          });
        }
      }

      return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      console.error('Error finding job matches:', error);
      return [];
    }
  }

  /**
   * Find mentor recommendations (alumni who can mentor)
   */
  static async findMentorMatches(userId: string, limit: number = 10): Promise<MatchingScore[]> {
    try {
      // Get current user profile
      const currentUserResult = await db.select({
        user: user,
        profile: userProfiles
      })
        .from(user)
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .where(eq(user.id, userId))
        .limit(1);

      if (!currentUserResult.length) return [];
      const currentUser = currentUserResult[0];

      // Find potential mentors (alumni)
      const potentialMentors = await db.select({
        user: user,
        profile: userProfiles
      })
        .from(user)
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .where(and(
          eq(userProfiles.role, 'alumni'),
          sql`${user.id} != ${userId}`
        ));

      const matches: MatchingScore[] = [];

      for (const mentor of potentialMentors) {
        let score = 0;
        const reasons: string[] = [];

        // Same university (40% weight)
        if (currentUser.profile?.universityId && mentor.profile?.universityId === currentUser.profile.universityId) {
          score += 40;
          reasons.push('Same university alumni');
        }

        // Similar field/major (30% weight)
        if (currentUser.profile?.major && mentor.profile?.major === currentUser.profile.major) {
          score += 30;
          reasons.push('Same field of study');
        }

        // Has company experience (20% weight)
        if (mentor.profile?.company) {
          score += 20;
          reasons.push(`Works at ${mentor.profile.company}`);
        }

        // Recent graduate (more relatable) (10% weight)
        if (mentor.profile?.graduationYear && mentor.profile.graduationYear >= 2015) {
          score += 10;
          reasons.push('Recent graduate');
        }

        if (score > 20) {
          matches.push({
            userId: mentor.user.id,
            score: Math.round(score),
            reasons,
            matchType: 'mentor'
          });
        }
      }

      return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      console.error('Error finding mentor matches:', error);
      return [];
    }
  }

  /**
   * Find connection recommendations
   */
  static async findConnectionRecommendations(userId: string, limit: number = 10): Promise<MatchingScore[]> {
    try {
      // Get current user profile
      const currentUserResult = await db.select({
        user: user,
        profile: userProfiles
      })
        .from(user)
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .where(eq(user.id, userId))
        .limit(1);

      if (!currentUserResult.length) return [];
      const currentUser = currentUserResult[0];

      // Find potential connections
      const potentialConnections = await db.select({
        user: user,
        profile: userProfiles
      })
        .from(user)
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .where(sql`${user.id} != ${userId}`)
        .limit(50); // Limit to avoid too much processing

      const matches: MatchingScore[] = [];

      for (const connection of potentialConnections) {
        let score = 0;
        const reasons: string[] = [];

        // Same university (30% weight)
        if (currentUser.profile?.universityId && connection.profile?.universityId === currentUser.profile.universityId) {
          score += 30;
          reasons.push('Same university');
        }

        // Same location (25% weight)
        if (currentUser.profile?.location && connection.profile?.location === currentUser.profile.location) {
          score += 25;
          reasons.push('Same location');
        }

        // Similar graduation year (20% weight)
        if (currentUser.profile?.graduationYear && connection.profile?.graduationYear) {
          const yearDiff = Math.abs(currentUser.profile.graduationYear - connection.profile.graduationYear);
          if (yearDiff <= 2) {
            score += 20;
            reasons.push('Similar graduation year');
          }
        }

        // Same major (15% weight)
        if (currentUser.profile?.major && connection.profile?.major === currentUser.profile.major) {
          score += 15;
          reasons.push('Same field of study');
        }

        // Same company (10% weight)
        if (currentUser.profile?.company && connection.profile?.company === currentUser.profile.company) {
          score += 10;
          reasons.push('Same company');
        }

        if (score > 25) {
          matches.push({
            userId: connection.user.id,
            score: Math.round(score),
            reasons,
            matchType: 'connection'
          });
        }
      }

      return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      console.error('Error finding connection recommendations:', error);
      return [];
    }
  }
}

// Export utility functions
export async function getJobRecommendations(userId: string, limit?: number) {
  return SimpleAIMatchingService.findJobMatches(userId, limit);
}

export async function getMentorRecommendations(userId: string, limit?: number) {
  return SimpleAIMatchingService.findMentorMatches(userId, limit);
}

export async function getConnectionRecommendations(userId: string, limit?: number) {
  return SimpleAIMatchingService.findConnectionRecommendations(userId, limit);
}
