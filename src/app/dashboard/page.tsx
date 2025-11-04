"use client";

import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MessageSquare, FileCheck, Award, LogOut, Briefcase, Calendar, TrendingUp, Bell, Heart } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import Feed from "@/components/Feed";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { GamificationWidget } from "@/components/GamificationWidget";

export default function DashboardPage() {
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    connections: 0,
    messages: 0,
    credentials: 0,
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    async function fetchStats() {
      if (!session?.user) return;

      try {
        const token = localStorage.getItem("bearer_token");
        
        // Fetch connections
        const connectionsRes = await fetch(`/api/connections?userId=${session.user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const connections = await connectionsRes.json();
        
        // Fetch messages
        const messagesRes = await fetch(`/api/messages?receiverId=${session.user.id}&isRead=false`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const messages = await messagesRes.json();
        
        // Fetch credentials
        const credentialsRes = await fetch(`/api/credentials?userId=${session.user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const credentials = await credentialsRes.json();

        setStats({
          connections: Array.isArray(connections) ? connections.filter((c: any) => c.status === 'accepted').length : 0,
          messages: Array.isArray(messages) ? messages.length : 0,
          credentials: Array.isArray(credentials) ? credentials.length : 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, [session]);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      refetch();
      router.push("/");
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-primary">
              UniLink
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/profile">
                <Button variant="ghost" size="sm">My Profile</Button>
              </Link>
              <Link href="/dashboard/alumni">
                <Button variant="ghost" size="sm">Network</Button>
              </Link>
              <Link href="/dashboard/jobs">
                <Button variant="ghost" size="sm">Jobs</Button>
              </Link>
              <Link href="/dashboard/messages">
                <Button variant="ghost" size="sm">Messages</Button>
              </Link>
              <Link href="/dashboard/events">
                <Button variant="ghost" size="sm">Events</Button>
              </Link>
              <Link href="/dashboard/give-back">
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                  Give Back
                </Button>
              </Link>
              <Link href="/dashboard/analytics">
                <Button variant="ghost" size="sm">Analytics</Button>
              </Link>
              <NotificationDropdown />
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {session.user.name}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your alumni network today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.connections}</div>
              <p className="text-xs text-muted-foreground">
                Alumni connections
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.messages}</div>
              <p className="text-xs text-muted-foreground">
                Unread messages
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credentials</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.credentials}</div>
              <p className="text-xs text-muted-foreground">
                Blockchain verified
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">--</div>
              <p className="text-xs text-muted-foreground">
                This week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Global Feed + Gamification */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/alumni">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Explore Network
                </Button>
              </Link>
              <Link href="/dashboard/jobs">
                <Button className="w-full justify-start" variant="outline">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Browse Jobs
                </Button>
              </Link>
              <Link href="/dashboard/events">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Upcoming Events
                </Button>
              </Link>
              <Link href="/dashboard/credentials">
                <Button className="w-full justify-start" variant="outline">
                  <Award className="mr-2 h-4 w-4" />
                  My Credentials
                </Button>
              </Link>
              <Link href="/dashboard/give-back">
                <Button className="w-full justify-start" variant="outline" style={{borderColor: '#dc2626', color: '#dc2626'}}>
                  <Heart className="mr-2 h-4 w-4" />
                  Give Back to KLU
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Global Feed</CardTitle>
              <CardDescription>
                Share updates and see posts from everyone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Feed />
            </CardContent>
          </Card>

          {/* Gamification Widget */}
          <GamificationWidget />
        </div>
      </div>
    </div>
  );
}