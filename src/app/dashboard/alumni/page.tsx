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
import { Search, UserPlus, ArrowLeft, MapPin, Briefcase, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function AlumniDirectoryPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAlumni, setFilteredAlumni] = useState<any[]>([]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    async function fetchAlumni() {
      if (!session?.user) return;

      try {
        const token = localStorage.getItem("bearer_token");
        
        // Fetch all alumni profiles
        const response = await fetch("/api/profiles?role=alumni&limit=100", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setAlumni(Array.isArray(data) ? data : []);
          setFilteredAlumni(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching alumni:", error);
        toast.error("Failed to load alumni directory");
      } finally {
        setLoading(false);
      }
    }

    fetchAlumni();
  }, [session]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = alumni.filter(
        (person) =>
          person.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.currentPosition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.major?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAlumni(filtered);
    } else {
      setFilteredAlumni(alumni);
    }
  }, [searchTerm, alumni]);

  const handleConnect = async (alumniUserId: string) => {
    if (!session?.user) return;

    try {
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch("/api/connections/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requesterId: session.user.id,
          recipientId: alumniUserId,
          connectionType: "networking",
          message: "I'd like to connect with you!",
        }),
      });

      if (response.ok) {
        toast.success("Connection request sent!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send connection request");
      }
    } catch (error) {
      console.error("Error sending connection request:", error);
      toast.error("Failed to send connection request");
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Alumni Directory</h1>
              <p className="text-muted-foreground">
                Connect with fellow alumni from your university
              </p>
            </div>
            <Link href="/dashboard/students">
              <Button variant="outline">View Student Directory</Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by position, company, major, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Alumni Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlumni.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No alumni found matching your search.</p>
            </div>
          ) : (
            filteredAlumni.map((person) => (
              <Card key={person.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={person.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.userId}`} />
                      <AvatarFallback>
                        {(person.name?.substring(0, 2) || person.userId?.substring(0, 2) || 'UN').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{person.name || person.userId}</CardTitle>
                      {person.isVerified && (
                        <Badge variant="default" className="mt-1">Verified</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {person.currentPosition && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{person.currentPosition}</span>
                    </div>
                  )}
                  {person.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{person.company}</span>
                    </div>
                  )}
                  {person.major && (
                    <div className="flex items-center gap-2 text-sm">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {person.major} ({person.graduationYear})
                      </span>
                    </div>
                  )}
                  {person.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{person.location}</span>
                    </div>
                  )}
                  {person.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {person.bio}
                    </p>
                  )}
                  <Button
                    onClick={() => handleConnect(person.userId)}
                    className="w-full"
                    variant="outline"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Connect
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}