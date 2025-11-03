"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, Save, Award, Briefcase, GraduationCap, MapPin, Upload, Camera } from "lucide-react";
import Link from "next/link";
import Feed from "@/components/Feed";

export default function ProfilePage() {
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [universities, setUniversities] = useState<any[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [feedScope, setFeedScope] = useState<"everyone" | "mine">("everyone");

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return;

      try {
        const token = localStorage.getItem("bearer_token");

        // Set initial profile photo from session
        if (session.user.image) {
          setProfilePhoto(session.user.image);
        }

        // Fetch universities
        const univRes = await fetch("/api/universities?limit=100");
        const univData = await univRes.json();
        setUniversities(Array.isArray(univData) ? univData : []);

        // Fetch user profile
        const profileRes = await fetch(`/api/profiles?userId=${session.user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
        } else {
          // Create empty profile
          setProfile({
            userId: session.user.id,
            role: "student",
            universityId: null,
            graduationYear: new Date().getFullYear(),
            major: "",
            degree: "",
            currentPosition: "",
            company: "",
            location: "",
            bio: "",
            skills: [],
            interests: [],
            linkedinUrl: "",
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setProfilePhoto(base64String);

        // Update user image in database
        const token = localStorage.getItem("bearer_token");
        const response = await fetch("/api/profiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...profile,
            image: base64String,
          }),
        });

        if (response.ok) {
          toast.success("Profile photo updated successfully!");
          // Refetch session to update photo in navbar
          await refetch();
        } else {
          toast.error("Failed to update profile photo");
          setProfilePhoto(session?.user?.image || null);
        }
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!session?.user) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        toast.success("Profile updated successfully!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-4xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!session?.user || !profile) return null;

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

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your professional information and credentials
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Photo Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Profile Photo
                </CardTitle>
                <CardDescription>
                  Upload your photo for identification and verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-32 w-32">
                      <AvatarImage src={profilePhoto || session.user.image || ""} alt={session.user.name || "Profile"} />
                      <AvatarFallback className="text-3xl">
                        {session.user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="text-sm font-medium">{session.user.name}</p>
                      <p className="text-xs text-muted-foreground">{session.user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="photo-upload" className="cursor-pointer">
                        <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors">
                          <div className="flex flex-col items-center justify-center gap-2 text-center">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Click to upload photo</p>
                              <p className="text-sm text-muted-foreground">
                                PNG, JPG or JPEG (max. 5MB)
                              </p>
                            </div>
                          </div>
                        </div>
                        <Input
                          id="photo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                          disabled={uploadingPhoto}
                        />
                      </Label>
                    </div>
                    
                    {uploadingPhoto && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Uploading photo...
                      </div>
                    )}
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Why upload a photo?</strong>
                        <br />
                        A profile photo helps other alumni and students identify you, making connections more personal and trustworthy. It's also used for verification purposes.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your details to connect with other alumni
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={profile.role}
                onValueChange={(value: string) => setProfile({ ...profile, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="alumni">Alumni</SelectItem>
                  <SelectItem value="university_admin">University Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* University */}
            <div className="space-y-2">
              <Label htmlFor="university">University</Label>
              <Select
                value={profile.universityId?.toString() || ""}
                onValueChange={(value: string) =>
                  setProfile({ ...profile, universityId: parseInt(value) })
                }
              >
                <SelectTrigger id="university">
                  <SelectValue placeholder="Select your university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((uni) => (
                    <SelectItem key={uni.id} value={uni.id.toString()}>
                      {uni.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Major */}
              <div className="space-y-2">
                <Label htmlFor="major">
                  <GraduationCap className="inline h-4 w-4 mr-1" />
                  Major
                </Label>
                <Input
                  id="major"
                  value={profile.major || ""}
                  onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                  placeholder="Computer Science"
                />
              </div>

              {/* Degree */}
              <div className="space-y-2">
                <Label htmlFor="degree">
                  <Award className="inline h-4 w-4 mr-1" />
                  Degree
                </Label>
                <Input
                  id="degree"
                  value={profile.degree || ""}
                  onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
                  placeholder="Bachelor of Science"
                />
              </div>
            </div>

            {/* Graduation Year */}
            <div className="space-y-2">
              <Label htmlFor="graduationYear">Graduation Year</Label>
              <Input
                id="graduationYear"
                type="number"
                value={profile.graduationYear || ""}
                onChange={(e) =>
                  setProfile({ ...profile, graduationYear: parseInt(e.target.value) })
                }
                placeholder="2024"
              />
            </div>

            {/* Current Position */}
            {profile.role === "alumni" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="currentPosition">
                    <Briefcase className="inline h-4 w-4 mr-1" />
                    Current Position
                  </Label>
                  <Input
                    id="currentPosition"
                    value={profile.currentPosition || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, currentPosition: e.target.value })
                    }
                    placeholder="Software Engineer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={profile.company || ""}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                    placeholder="Google"
                  />
                </div>
              </>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">
                <MapPin className="inline h-4 w-4 mr-1" />
                Location
              </Label>
              <Input
                id="location"
                value={profile.location || ""}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                placeholder="San Francisco, CA"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio || ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>

            {/* Verification Status */}
            {profile.id && (
              <div className="flex items-center gap-2">
                <Label>Verification Status:</Label>
                <Badge
                  variant={
                    profile.verificationStatus === "verified"
                      ? "default"
                      : profile.verificationStatus === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {profile.verificationStatus || "pending"}
                </Badge>
              </div>
            )}

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Posts</CardTitle>
                <CardDescription>Latest updates</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={feedScope} onValueChange={(v: string) => setFeedScope(v as "everyone" | "mine") }>
                  <TabsList className="mb-4">
                    <TabsTrigger value="everyone">Everyone</TabsTrigger>
                    <TabsTrigger value="mine">My Posts</TabsTrigger>
                  </TabsList>
                  <TabsContent value="everyone">
                    <Feed showComposer={false} />
                  </TabsContent>
                  <TabsContent value="mine">
                    <Feed userIdFilter={session.user.id} showComposer={false} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}