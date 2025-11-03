"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Building, FileText, Award, TrendingUp, Activity, GraduationCap, Calendar } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAlumni: 0,
    totalUniversities: 0,
    totalCredentials: 0,
    totalNewsletters: 0,
    totalEvents: 0,
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

        // Fetch all stats
        const [usersRes, alumniRes, universitiesRes, credentialsRes, newslettersRes, eventsRes] = await Promise.all([
          fetch("/api/admin/users?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/profiles?role=alumni&limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/universities?limit=1000"),
          fetch("/api/credentials?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/newsletters?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/events?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const users = await usersRes.json();
        const alumni = await alumniRes.json();
        const universities = await universitiesRes.json();
        const credentials = await credentialsRes.json();
        const newsletters = await newslettersRes.json();
        const events = await eventsRes.json();

        setStats({
          totalUsers: Array.isArray(users) ? users.length : 0,
          totalAlumni: Array.isArray(alumni) ? alumni.length : 0,
          totalUniversities: Array.isArray(universities) ? universities.length : 0,
          totalCredentials: Array.isArray(credentials) ? credentials.length : 0,
          totalNewsletters: Array.isArray(newsletters) ? newsletters.length : 0,
          totalEvents: Array.isArray(events) ? events.length : 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [session]);

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Skeleton className="h-32" />
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
              UniLink Admin
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/admin/alumni">
                <Button variant="ghost">Alumni</Button>
              </Link>
              <Link href="/admin/universities">
                <Button variant="ghost">Universities</Button>
              </Link>
              <Link href="/admin/users">
                <Button variant="ghost">Users</Button>
              </Link>
              <Link href="/admin/events">
                <Button variant="ghost">Events</Button>
              </Link>
              <Link href="/admin/newsletters">
                <Button variant="ghost">Newsletters</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage alumni, universities, users, and platform content
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alumni</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlumni}</div>
              <p className="text-xs text-muted-foreground">Alumni profiles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Universities</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUniversities}</div>
              <p className="text-xs text-muted-foreground">Active institutions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">Scheduled events</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Alumni Management</CardTitle>
              <CardDescription>Add and manage alumni profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/alumni">
                <Button className="w-full">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Manage Alumni
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>University Management</CardTitle>
              <CardDescription>Add and manage universities</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/universities">
                <Button className="w-full">
                  <Building className="mr-2 h-4 w-4" />
                  Manage Universities
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage user accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/users">
                <Button className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Events Management</CardTitle>
              <CardDescription>Create and organize events</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/events">
                <Button className="w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  Manage Events
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Platform Activity
            </CardTitle>
            <CardDescription>Recent system events and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">System Status: Operational</p>
                  <p className="text-xs text-muted-foreground">
                    All systems running normally
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Building className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Multi-tenant Architecture</p>
                  <p className="text-xs text-muted-foreground">
                    Each university has isolated data
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">GDPR Compliant</p>
                  <p className="text-xs text-muted-foreground">
                    Data protection and privacy enabled
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}