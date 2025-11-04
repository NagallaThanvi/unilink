"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Star, 
  Target, 
  TrendingUp, 
  Award,
  Crown,
  Zap,
  Flame,
  Users,
  Medal
} from "lucide-react";
import { GamificationService, UserStats, Achievement, getRarityColor, formatPoints } from "@/lib/gamification";
import { useSession } from "@/lib/auth-client";

export function GamificationWidget() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGamificationData = async () => {
      if (!session?.user?.id) return;
      
      setLoading(true);
      try {
        const [userStats, leaderboardData] = await Promise.all([
          GamificationService.getUserStats(session.user.id),
          GamificationService.getLeaderboard(10)
        ]);
        
        setStats(userStats);
        setLeaderboard(leaderboardData);
      } catch (error) {
        console.error('Failed to load gamification data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGamificationData();
  }, [session]);

  if (loading || !stats) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const levelProgress = ((stats.totalPoints - (stats.currentLevelPoints - (stats.nextLevelPoints - stats.currentLevelPoints))) / (stats.nextLevelPoints - (stats.currentLevelPoints - (stats.nextLevelPoints - stats.currentLevelPoints)))) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Your Progress
        </CardTitle>
        <CardDescription>
          Track your achievements and compete with fellow alumni
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Level and Points */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold">Level {stats.level}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatPoints(stats.totalPoints)} points
                </div>
              </div>
              
              <Progress value={levelProgress} className="h-2" />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatPoints(stats.currentLevelPoints)} points</span>
                <span>{formatPoints(stats.nextLevelPoints - stats.totalPoints)} to next level</span>
              </div>
            </div>

            {/* Current Streak */}
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Current Streak</p>
                  <p className="text-sm text-orange-700">{stats.streak.current} days</p>
                </div>
              </div>
              <Badge className="bg-orange-100 text-orange-800">
                🔥 {stats.streak.current}
              </Badge>
            </div>

            {/* Recent Badges */}
            {stats.badges.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Medal className="h-4 w-4" />
                  Recent Badges
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {stats.badges.slice(0, 3).map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      style={{ backgroundColor: badge.color + '20', color: badge.color }}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4 mt-4">
            <div className="grid gap-3">
              {stats.achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{achievement.title}</h4>
                      <Badge 
                        style={{ 
                          backgroundColor: getRarityColor(achievement.rarity) + '20',
                          color: getRarityColor(achievement.rarity)
                        }}
                      >
                        {achievement.rarity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    {achievement.unlockedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Star className="h-4 w-4" />
                      <span className="font-medium">{achievement.points}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {stats.achievements.length === 0 && (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No achievements yet</p>
                  <p className="text-sm text-muted-foreground">Start networking and engaging to unlock achievements!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4 mt-4">
            <div className="space-y-2">
              {leaderboard.map((user, index) => (
                <div
                  key={user.userId}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    user.userId === session?.user?.id ? 'bg-blue-50 border-blue-200' : 'bg-card'
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    {index < 3 ? (
                      <span className="text-lg">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="text-sm font-medium">#{user.rank}</span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">Level {user.level}</p>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Star className="h-4 w-4" />
                      <span className="font-medium">{formatPoints(user.points)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center pt-4">
              <Button variant="outline" size="sm">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Full Leaderboard
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
