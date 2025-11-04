import { db } from '@/db';
import { user, userProfiles, jobPostings, mentorshipPrograms, skills, userSkills } from '@/db/schema';
import { eq, and, or, like, desc, sql } from 'drizzle-orm';

export interface MatchingScore {
  userId: string;
  score: number;
  reasons: string[];
  matchType: 'job' | 'mentor' | 'mentee' | 'connection';
}

export class AIMatchingService {
  
  /**
   * Calculate similarity between two users based on multiple factors
   */
  static calculateUserSimilarity(user1: any, user2: any): number {
    let score = 0;

    // Company similarity (30% weight)
    if (user1.profile?.company && user2.profile?.company && user1.profile.company === user2.profile.company) {
      score += 30;
    }

    // Skills overlap (25% weight) - using skills from profile
    const user1Skills = user1.profile?.skills ? JSON.parse(user1.profile.skills) : [];
    const user2Skills = user2.profile?.skills ? JSON.parse(user2.profile.skills) : [];
    const commonSkills = this.getCommonSkills(user1Skills, user2Skills);
    const skillScore = (commonSkills.length / Math.max(user1Skills.length || 1, user2Skills.length || 1)) * 25;
    score += skillScore;

    // Location proximity (15% weight)
    if (user1.profile?.location && user2.profile?.location && user1.profile.location === user2.profile.location) {
      score += 15;
    }

    // University connection (20% weight)
    if (user1.profile?.universityId && user2.profile?.universityId && user1.profile.universityId === user2.profile.universityId) {
      score += 20;
    }

    // Graduation year proximity (10% weight)
    if (user1.profile?.graduationYear && user2.profile?.graduationYear) {
      const yearDiff = Math.abs(user1.profile.graduationYear - user2.profile.graduationYear);
      if (yearDiff <= 3) {
        score += 10;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Find job matches for a user
   */
  static async findJobMatches(userId: string, limit: number = 10): Promise<MatchingScore[]> {
    try {
      // Get user profile
      const userProfile = await db.select({
        user: user,
        profile: userProfiles
      })
        .from(user)
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .where(eq(user.id, userId))
        .limit(1);

      if (!userProfile.length) return [];

      const currentUser = userProfile[0];
      const userSkillsList = currentUser.profile?.skills ? JSON.parse(currentUser.profile.skills) : [];

      // Get all active job postings
      const jobs = await db.select({
        job: jobPostings,
        poster: user
      })
        .from(jobPostings)
        .leftJoin(user, eq(jobPostings.postedById, user.id))
        .where(and(
          eq(jobPostings.status, 'active'),
          sql`${jobPostings.postedById} != ${userId}` // Exclude user's own jobs
        ));

      const matches: MatchingScore[] = [];

      for (const jobData of jobs) {
        const job = jobData.job;
        let score = 0;
        const reasons: string[] = [];

        // Required skills match (50% weight)
        const requiredSkills = job.skills ? JSON.parse(job.skills) : [];
        const matchingSkills = userSkillsList.filter((skill: string) => 
          requiredSkills.some((req: string) => req.toLowerCase().includes(skill.toLowerCase()))
        );
        
        if (matchingSkills.length > 0) {
          const skillMatchPercentage = matchingSkills.length / Math.max(requiredSkills.length, 1);
          score += skillMatchPercentage * 50;
          reasons.push(`${matchingSkills.length}/${requiredSkills.length} skills match`);
        }

        // Location preference (25% weight)
        if (job.isRemote || currentUser.profile?.location === job.location) {
          score += 25;
          reasons.push(job.isRemote ? 'Remote work available' : 'Location matches');
        }

        // University connection (15% weight)
        if (currentUser.profile?.universityId === job.universityId) {
          score += 15;
          reasons.push('Same university');
        }

        // Company match (10% weight)
        if (currentUser.profile?.company === job.company) {
          score += 10;
          reasons.push('Same company');
        }

        if (score > 15) { // Only include jobs with reasonable match
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
   * Find mentor matches for a user (students looking for mentors)
   */
  static async findMentorMatches(userId: string, limit: number = 10): Promise<MatchingScore[]> {
    try {
      // Get current user (student/mentee)
      const currentUser = await this.getUserWithSkills(userId);
      if (!currentUser) return [];

      // Find potential mentors (alumni with experience)
      const potentialMentors = await db.select({
        user: user,
        profile: userProfiles,
        skills: sql`GROUP_CONCAT(${skills.name})`.as('skills')
      })
        .from(user)
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .leftJoin(userSkills, eq(user.id, userSkills.userId))
        .leftJoin(skills, eq(userSkills.skillId, skills.id))
        .where(and(
          eq(userProfiles.role, 'alumni'),
          sql`${userProfiles.experienceYears} > 2`,
          sql`${user.id} != ${userId}`
        ))
        .groupBy(user.id);

      const matches: MatchingScore[] = [];

      for (const mentor of potentialMentors) {
        const score = this.calculateMentorScore(currentUser, mentor);
        
        if (score.score > 30) {
          matches.push({
            userId: mentor.user.id,
            score: score.score,
            reasons: score.reasons,
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
      const currentUser = await this.getUserWithSkills(userId);
      if (!currentUser) return [];

      // Find users with similar profiles
      const potentialConnections = await db.select({
        user: user,
        profile: userProfiles,
        skills: sql`GROUP_CONCAT(${skills.name})`.as('skills')
      })
        .from(user)
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .leftJoin(userSkills, eq(user.id, userSkills.userId))
        .leftJoin(skills, eq(userSkills.skillId, skills.id))
        .where(sql`${user.id} != ${userId}`)
        .groupBy(user.id)
        .limit(50); // Get more candidates to filter from

      const matches: MatchingScore[] = [];

      for (const candidate of potentialConnections) {
        const similarity = this.calculateUserSimilarity(currentUser, candidate);
        
        if (similarity > 40) {
          matches.push({
            userId: candidate.user.id,
            score: Math.round(similarity),
            reasons: [`${similarity}% profile similarity`],
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

  // Helper methods
  private static getCommonSkills(skills1: string[], skills2: string[]): string[] {
    return skills1.filter(skill => 
      skills2.some(s => s.toLowerCase() === skill.toLowerCase())
    );
  }

  private static async getUserWithSkills(userId: string) {
    const result = await db.select({
      user: user,
      profile: userProfiles,
      skills: sql`GROUP_CONCAT(${skills.name})`.as('skills')
    })
      .from(user)
      .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
      .leftJoin(userSkills, eq(user.id, userSkills.userId))
      .leftJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(user.id, userId))
      .groupBy(user.id)
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  private static calculateMentorScore(mentee: any, mentor: any): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Industry alignment (30%)
    if (mentee.profile?.industry === mentor.profile?.industry) {
      score += 30;
      reasons.push('Same industry experience');
    }

    // Skill overlap (25%)
    const menteeSkills = mentee.skills ? mentee.skills.split(',') : [];
    const mentorSkills = mentor.skills ? mentor.skills.split(',') : [];
    const commonSkills = this.getCommonSkills(menteeSkills, mentorSkills);
    
    if (commonSkills.length > 0) {
      score += (commonSkills.length / mentorSkills.length) * 25;
      reasons.push(`${commonSkills.length} relevant skills`);
    }

    // Experience gap (20%) - mentor should have significantly more experience
    const expGap = (mentor.profile?.experienceYears || 0) - (mentee.profile?.experienceYears || 0);
    if (expGap >= 3) {
      score += 20;
      reasons.push(`${expGap} years more experience`);
    }

    // University connection (15%)
    if (mentee.profile?.universityId === mentor.profile?.universityId) {
      score += 15;
      reasons.push('Same university alumni');
    }

    // Company prestige (10%)
    if (mentor.profile?.company) {
      score += 10;
      reasons.push(`Works at ${mentor.profile.company}`);
    }

    return { score: Math.round(score), reasons };
  }
}

// Export utility functions for API usage
export async function getJobRecommendations(userId: string, limit?: number) {
  return AIMatchingService.findJobMatches(userId, limit);
}

export async function getMentorRecommendations(userId: string, limit?: number) {
  return AIMatchingService.findMentorMatches(userId, limit);
}

export async function getConnectionRecommendations(userId: string, limit?: number) {
  return AIMatchingService.findConnectionRecommendations(userId, limit);
}
