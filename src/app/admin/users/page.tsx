"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, Search, Mail, User, Shield } from "lucide-react";
import Link from "next/link";

export default function UsersManagementPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.profile?.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch("/api/admin/users?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
        setFilteredUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <Link href="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Users Management</h1>
          <p className="text-muted-foreground">
            View and manage all registered users
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} />
                      <AvatarFallback>
                        {user.name?.substring(0, 2).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{user.name || "Unknown"}</CardTitle>
                      {user.profile && (
                        <Badge variant={
                          user.profile.role === "university_admin" ? "default" :
                          user.profile.role === "alumni" ? "secondary" : "outline"
                        }>
                          {user.profile.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  
                  {user.emailVerified && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Shield className="h-4 w-4" />
                      <span>Email Verified</span>
                    </div>
                  )}

                  {user.profile && (
                    <>
                      {user.profile.universityId && (
                        <div className="text-sm">
                          <span className="font-medium">University ID:</span> {user.profile.universityId}
                        </div>
                      )}
                      {user.profile.major && (
                        <div className="text-sm">
                          <span className="font-medium">Major:</span> {user.profile.major}
                        </div>
                      )}
                      {user.profile.graduationYear && (
                        <div className="text-sm">
                          <span className="font-medium">Graduation:</span> {user.profile.graduationYear}
                        </div>
                      )}
                      {user.profile.currentPosition && (
                        <div className="text-sm">
                          <span className="font-medium">Position:</span> {user.profile.currentPosition}
                        </div>
                      )}
                      {user.profile.company && (
                        <div className="text-sm">
                          <span className="font-medium">Company:</span> {user.profile.company}
                        </div>
                      )}
                      <div className="pt-2">
                        <Badge variant={
                          user.profile.verificationStatus === "verified" ? "default" :
                          user.profile.verificationStatus === "rejected" ? "destructive" : "secondary"
                        }>
                          {user.profile.verificationStatus || "pending"}
                        </Badge>
                      </div>
                    </>
                  )}

                  <div className="text-xs text-muted-foreground pt-2">
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}