// LinkedIn OAuth Integration for UniLink
export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  summary?: string;
  industry?: string;
  location?: string;
  profilePicture?: string;
  positions?: LinkedInPosition[];
  educations?: LinkedInEducation[];
  skills?: string[];
}

export interface LinkedInPosition {
  title: string;
  companyName: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
}

export interface LinkedInEducation {
  schoolName: string;
  fieldOfStudy?: string;
  degree?: string;
  startDate: string;
  endDate?: string;
}

export class LinkedInService {
  private static readonly CLIENT_ID = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
  private static readonly REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL + '/auth/linkedin/callback';
  private static readonly SCOPE = 'r_liteprofile r_emailaddress w_member_social';

  /**
   * Generate LinkedIn OAuth URL
   */
  static getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID || '',
      redirect_uri: this.REDIRECT_URI,
      scope: this.SCOPE,
      state: state || Math.random().toString(36).substring(7)
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async getAccessToken(code: string): Promise<string> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.REDIRECT_URI,
        client_id: this.CLIENT_ID || '',
        client_secret: this.CLIENT_SECRET || '',
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`LinkedIn OAuth error: ${data.error_description || data.error}`);
    }

    return data.access_token;
  }

  /**
   * Get LinkedIn profile information
   */
  static async getProfile(accessToken: string): Promise<LinkedInProfile> {
    try {
      // Get basic profile
      const profileResponse = await fetch(
        'https://api.linkedin.com/v2/people/~:(id,firstName,lastName,headline,summary,industry,location,profilePicture(displayImage~:playableStreams))',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch LinkedIn profile');
      }

      const profile = await profileResponse.json();

      // Get email address
      const emailResponse = await fetch(
        'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let email = '';
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        email = emailData.elements?.[0]?.['handle~']?.emailAddress || '';
      }

      // Transform LinkedIn profile to our format
      return {
        id: profile.id,
        firstName: profile.firstName?.localized?.en_US || '',
        lastName: profile.lastName?.localized?.en_US || '',
        headline: profile.headline?.localized?.en_US || '',
        summary: profile.summary?.localized?.en_US || '',
        industry: profile.industry?.localized?.en_US || '',
        location: profile.location?.name || '',
        profilePicture: this.extractProfilePicture(profile.profilePicture),
        // Note: Positions and educations require additional API calls with proper permissions
        positions: [],
        educations: [],
        skills: []
      };
    } catch (error) {
      console.error('Error fetching LinkedIn profile:', error);
      throw error;
    }
  }

  /**
   * Sync LinkedIn profile with UniLink profile
   */
  static async syncProfile(accessToken: string, userId: string): Promise<void> {
    try {
      const linkedInProfile = await this.getProfile(accessToken);
      
      // Update user profile in database
      const { db } = await import('@/db');
      const { userProfiles } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');

      await db.update(userProfiles)
        .set({
          bio: linkedInProfile.summary || linkedInProfile.headline,
          currentPosition: linkedInProfile.headline,
          location: linkedInProfile.location,
          linkedinUrl: `https://linkedin.com/in/${linkedInProfile.id}`,
          updatedAt: new Date().toISOString()
        })
        .where(eq(userProfiles.userId, userId));

      console.log('LinkedIn profile synced successfully');
    } catch (error) {
      console.error('Error syncing LinkedIn profile:', error);
      throw error;
    }
  }

  /**
   * Import LinkedIn connections (requires additional permissions)
   */
  static async importConnections(accessToken: string, userId: string): Promise<number> {
    try {
      // Note: This requires r_network permission which is restricted
      // For demo purposes, we'll simulate importing connections
      
      console.log('LinkedIn connections import simulated');
      return 0; // Return number of imported connections
    } catch (error) {
      console.error('Error importing LinkedIn connections:', error);
      throw error;
    }
  }

  /**
   * Post to LinkedIn (requires w_member_social permission)
   */
  static async sharePost(accessToken: string, content: string, imageUrl?: string): Promise<void> {
    try {
      const postData = {
        author: `urn:li:person:${await this.getCurrentUserId(accessToken)}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      if (imageUrl) {
        // Add image sharing logic here
        postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
      }

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        throw new Error('Failed to post to LinkedIn');
      }

      console.log('Successfully posted to LinkedIn');
    } catch (error) {
      console.error('Error posting to LinkedIn:', error);
      throw error;
    }
  }

  /**
   * Get current user ID from LinkedIn
   */
  private static async getCurrentUserId(accessToken: string): Promise<string> {
    const response = await fetch('https://api.linkedin.com/v2/people/~:(id)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get LinkedIn user ID');
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Extract profile picture URL from LinkedIn response
   */
  private static extractProfilePicture(profilePicture: any): string {
    try {
      const displayImage = profilePicture?.displayImage?.elements?.[0];
      const identifiers = displayImage?.identifiers;
      
      if (identifiers && identifiers.length > 0) {
        return identifiers[0].identifier;
      }
      
      return '';
    } catch (error) {
      console.warn('Could not extract profile picture:', error);
      return '';
    }
  }

  /**
   * Validate LinkedIn access token
   */
  static async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.linkedin.com/v2/people/~:(id)', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Revoke LinkedIn access token
   */
  static async revokeToken(accessToken: string): Promise<void> {
    try {
      await fetch('https://api.linkedin.com/oauth/v2/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: accessToken,
          client_id: this.CLIENT_ID || '',
          client_secret: this.CLIENT_SECRET || '',
        }),
      });
    } catch (error) {
      console.error('Error revoking LinkedIn token:', error);
    }
  }
}

// Utility functions for LinkedIn integration
export function isLinkedInConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID && 
    process.env.LINKEDIN_CLIENT_SECRET
  );
}

export function formatLinkedInUrl(profileId: string): string {
  return `https://www.linkedin.com/in/${profileId}`;
}

export function extractLinkedInId(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
  return match ? match[1] : null;
}
