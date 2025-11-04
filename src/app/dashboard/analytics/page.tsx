"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  MessageSquare, 
  Briefcase,
  Calendar,
  Award,
  Target,
  Activity,
  Clock,
  MapPin,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AnalyticsData = {
  profileViews: {
    total: number;
    thisWeek: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  networkGrowth: {
    total: number;
    thisMonth: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  jobApplications: {
    total: number;
    thisMonth: number;
    success_rate: number;
    trend: 'up' | 'down' | 'neutral';
  };
  engagement: {
    posts: number;
    likes: number;
    comments: number;
    shares: number;
  };
  topSkills: Array<{
    name: string;
    endorsements: number;
    growth: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  demographics: {
    byLocation: Array<{ location: string; count: number }>;
    byIndustry: Array<{ industry: string; count: number }>;
    byGradYear: Array<{ year: number; count: number }>;
  };
};

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!session?.user?.id) return;
      
      setLoading(true);
      try {
        // Simulate analytics data - in production, this would come from your analytics API
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        setAnalytics({
          profileViews: {
            total: 1247,
            thisWeek: 89,
            change: 12.5,
            trend: 'up'
          },
          networkGrowth: {
            total: 342,
            thisMonth: 23,
            change: 8.2,
            trend: 'up'
          },
          jobApplications: {
            total: 15,
            thisMonth: 4,
            success_rate: 26.7,
            trend: 'up'
          },
          engagement: {
            posts: 8,
            likes: 156,
            comments: 42,
            shares: 18
          },
          topSkills: [
            { name: 'JavaScript', endorsements: 23, growth: 15 },
            { name: 'React', endorsements: 19, growth: 8 },
            { name: 'Node.js', endorsements: 16, growth: 12 },
            { name: 'Python', endorsements: 14, growth: 5 },
            { name: 'Machine Learning', endorsements: 11, growth: 22 }
          ],
          recentActivity: [
            {
              type: 'profile_view',
              description: 'Your profile was viewed by a recruiter from Google',
              timestamp: '2 hours ago',
              impact: 'high'
            },
            {
              type: 'connection',
              description: 'New connection with Sarah Chen (Alumni, 2019)',
              timestamp: '5 hours ago',
              impact: 'medium'
            },
            {
              type: 'skill_endorsement',
              description: 'Received endorsement for React from John Doe',
              timestamp: '1 day ago',
              impact: 'medium'
            },
            {
              type: 'job_application',
              description: 'Applied for Software Engineer at Microsoft',
              timestamp: '2 days ago',
              impact: 'high'
            }
          ],
          demographics: {
            byLocation: [
              { location: 'Hyderabad', count: 89 },
              { location: 'Bangalore', count: 67 },
              { location: 'Mumbai', count: 45 },
              { location: 'Delhi', count: 38 },
              { location: 'Chennai', count: 32 }
            ],
            byIndustry: [
              { industry: 'Technology', count: 156 },
              { industry: 'Finance', count: 78 },
              { industry: 'Healthcare', count: 45 },
              { industry: 'Education', count: 34 },
              { industry: 'Consulting', count: 29 }
            ],
            byGradYear: [
              { year: 2023, count: 45 },
              { year: 2022, count: 67 },
              { year: 2021, count: 89 },
              { year: 2020, count: 78 },
              { year: 2019, count: 63 }
            ]
          }
        });
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [session, timeRange]);

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'down': return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Failed to load analytics data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track your professional growth and network insights
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={timeRange === '7d' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </Button>
          <Button 
            variant={timeRange === '30d' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </Button>
          <Button 
            variant={timeRange === '90d' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeRange('90d')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.profileViews.total}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon(analytics.profileViews.trend)}
              <span>+{analytics.profileViews.change}% this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.networkGrowth.total}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon(analytics.networkGrowth.trend)}
              <span>+{analytics.networkGrowth.change}% this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Job Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{analytics.jobApplications.total}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>{analytics.jobApplications.success_rate}% success rate</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analytics.engagement.likes}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{analytics.engagement.comments} comments</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest platform interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="p-2 rounded-full bg-blue-50">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getImpactColor(activity.impact)}>
                            {activity.impact} impact
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Network Demographics</CardTitle>
                <CardDescription>Where your connections are located</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Top Locations
                    </h4>
                    {analytics.demographics.byLocation.slice(0, 5).map((location, index) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <span className="text-sm">{location.location}</span>
                        <span className="text-sm font-medium">{location.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Skills & Endorsements</CardTitle>
              <CardDescription>Your most endorsed skills and recent growth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {analytics.topSkills.map((skill, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <h4 className="font-medium">{skill.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {skill.endorsements} endorsements
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-medium">+{skill.growth}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Industry Distribution</CardTitle>
                <CardDescription>Industries your connections work in</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.demographics.byIndustry.map((industry, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{industry.industry}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-blue-600 rounded-full"
                            style={{ width: `${(industry.count / 156) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{industry.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Graduation Years</CardTitle>
                <CardDescription>Distribution by graduation year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.demographics.byGradYear.map((year, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{year.year}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-600 rounded-full"
                            style={{ width: `${(year.count / 89) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{year.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{analytics.engagement.posts}</div>
                <p className="text-sm text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Likes Received</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{analytics.engagement.likes}</div>
                <p className="text-sm text-muted-foreground">Total engagement</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{analytics.engagement.comments}</div>
                <p className="text-sm text-muted-foreground">Conversations started</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
