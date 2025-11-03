"use client";

import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MessageSquare, FileCheck, Award, LogOut } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import Feed from "@/components/Feed";

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
            <div className="flex items-center gap-4">
              <Link href="/dashboard/profile">
                <Button variant="ghost">My Profile</Button>
              </Link>
              <Link href="/dashboard/alumni">
                <Button variant="ghost">Alumni Directory</Button>
              </Link>
              <Link href="/dashboard/messages">
                <Button variant="ghost">Messages</Button>
              </Link>
              <Link href="/dashboard/credentials">
                <Button variant="ghost">Credentials</Button>
              </Link>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connections</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.connections}</div>
              <p className="text-xs text-muted-foreground">
                Alumni in your network
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unread Messages
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.messages}</div>
              <p className="text-xs text-muted-foreground">
                New messages waiting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credentials</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.credentials}</div>
              <p className="text-xs text-muted-foreground">
                Verified on blockchain
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Global Feed */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
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
                  Browse Alumni Directory
                </Button>
              </Link>
              <Link href="/dashboard/messages">
                <Button className="w-full justify-start" variant="outline">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send a Message
                </Button>
              </Link>
              <Link href="/dashboard/credentials">
                <Button className="w-full justify-start" variant="outline">
                  <Award className="mr-2 h-4 w-4" />
                  View My Credentials
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
        </div>
      </div>
    </div>
  );
}