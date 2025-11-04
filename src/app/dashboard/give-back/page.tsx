"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  GraduationCap, 
  Users, 
  BookOpen, 
  Lightbulb, 
  Briefcase,
  Calendar,
  DollarSign,
  Award,
  MessageSquare,
  TrendingUp,
  Target,
  Gift,
  Handshake,
  Presentation,
  Code,
  Plus,
  ArrowRight,
  Star
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type GiveBackStats = {
  totalDonated: number;
  scholarshipsCreated: number;
  studentsHelped: number;
  sessionsDelivered: number;
  feedbackSubmitted: number;
  projectsSponsored: number;
};

type RecentActivity = {
  id: string;
  type: 'scholarship' | 'donation' | 'session' | 'feedback' | 'project';
  title: string;
  description: string;
  amount?: number;
  date: string;
  status: string;
};

export default function GiveBackPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<GiveBackStats>({
    totalDonated: 0,
    scholarshipsCreated: 0,
    studentsHelped: 0,
    sessionsDelivered: 0,
    feedbackSubmitted: 0,
    projectsSponsored: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) return;
      
      setLoading(true);
      try {
        // Load stats and recent activity
        // This would be real API calls in production
        setStats({
          totalDonated: 150000,
          scholarshipsCreated: 3,
          studentsHelped: 25,
          sessionsDelivered: 8,
          feedbackSubmitted: 12,
          projectsSponsored: 2,
        });

        setRecentActivity([
          {
            id: '1',
            type: 'scholarship',
            title: 'Merit Scholarship for AI Students',
            description: 'Created a scholarship for top AI/ML students',
            amount: 50000,
            date: '2024-10-15',
            status: 'active'
          },
          {
            id: '2',
            type: 'session',
            title: 'Industry Trends in Software Development',
            description: 'Guest lecture for final year students',
            date: '2024-10-10',
            status: 'completed'
          },
          {
            id: '3',
            type: 'feedback',
            title: 'Curriculum Update for Data Science',
            description: 'Suggested modern tools and frameworks',
            date: '2024-10-05',
            status: 'under_review'
          }
        ]);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [session]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'scholarship': return <GraduationCap className="h-4 w-4" />;
      case 'donation': return <Heart className="h-4 w-4" />;
      case 'session': return <Presentation className="h-4 w-4" />;
      case 'feedback': return <MessageSquare className="h-4 w-4" />;
      case 'project': return <Code className="h-4 w-4" />;
      default: return <Gift className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'scholarship': return 'text-blue-600 bg-blue-50';
      case 'donation': return 'text-red-600 bg-red-50';
      case 'session': return 'text-green-600 bg-green-50';
      case 'feedback': return 'text-purple-600 bg-purple-50';
      case 'project': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Heart className="h-8 w-8 text-red-500" />
          Give Back to Your Alma Mater
        </h1>
        <p className="text-muted-foreground">
          Help shape the future of KL University students through mentorship, funding, and knowledge sharing.
        </p>
      </div>

      {/* Impact Stats */}
      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{stats.totalDonated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Lifetime contribution</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scholarships</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scholarshipsCreated}</div>
            <p className="text-xs text-muted-foreground">Created & funded</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Helped</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.studentsHelped}</div>
            <p className="text-xs text-muted-foreground">Direct beneficiaries</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Presentation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.sessionsDelivered}</div>
            <p className="text-xs text-muted-foreground">Lectures & workshops</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{stats.feedbackSubmitted}</div>
            <p className="text-xs text-muted-foreground">Curriculum insights</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{stats.projectsSponsored}</div>
            <p className="text-xs text-muted-foreground">Sponsored & mentored</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="opportunities" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="opportunities">Give Back Opportunities</TabsTrigger>
          <TabsTrigger value="my-contributions">My Contributions</TabsTrigger>
          <TabsTrigger value="impact">Impact Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Scholarship Funding */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Create Scholarships</CardTitle>
                    <CardDescription>Fund student education</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Create merit-based or need-based scholarships to support deserving students in their academic journey.
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">High Impact</Badge>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/scholarships/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Guest Lectures */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                    <Presentation className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Guest Sessions</CardTitle>
                    <CardDescription>Share your expertise</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Conduct guest lectures, workshops, or seminars to share industry knowledge and experience.
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Knowledge Sharing</Badge>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/guest-sessions/create">
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Curriculum Feedback */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Curriculum Feedback</CardTitle>
                    <CardDescription>Shape the future</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Provide insights on industry trends and suggest curriculum improvements based on current market needs.
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Strategic Impact</Badge>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/curriculum-feedback/create">
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Suggest
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Project Mentorship */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-100 transition-colors">
                    <Code className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Project Mentorship</CardTitle>
                    <CardDescription>Guide student projects</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Mentor student projects, provide funding, or collaborate on research initiatives.
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Hands-on</Badge>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/projects/mentor">
                      <Handshake className="mr-2 h-4 w-4" />
                      Mentor
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Career Guidance */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Career Guidance</CardTitle>
                    <CardDescription>One-on-one mentoring</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Provide personalized career guidance, resume reviews, and interview preparation for students.
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Personal Growth</Badge>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/career-guidance/offer">
                      <Users className="mr-2 h-4 w-4" />
                      Guide
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Direct Donations */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 group-hover:bg-red-100 transition-colors">
                    <Heart className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Direct Donations</CardTitle>
                    <CardDescription>Support university initiatives</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Make direct donations to support infrastructure, research, emergency funds, or general university needs.
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Immediate Impact</Badge>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/donations/create">
                      <Gift className="mr-2 h-4 w-4" />
                      Donate
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="my-contributions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest contributions and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{activity.title}</h4>
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{new Date(activity.date).toLocaleDateString()}</span>
                        {activity.amount && (
                          <span className="font-medium text-green-600">₹{activity.amount.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Impact Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Students Reached</span>
                    <span className="font-bold text-blue-600">25 ↗️</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Investment</span>
                    <span className="font-bold text-green-600">₹1,50,000 ↗️</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Success Stories</span>
                    <span className="font-bold text-purple-600">8 ↗️</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Recognition & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm italic">"The scholarship helped me focus on studies without financial stress. Thank you!"</p>
                    <p className="text-xs text-muted-foreground mt-1">- Priya, CSE Student</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm italic">"Your guest lecture on AI trends was incredibly insightful and motivating."</p>
                    <p className="text-xs text-muted-foreground mt-1">- Rahul, Final Year</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
