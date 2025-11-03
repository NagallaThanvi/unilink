"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft, Search } from "lucide-react";
import Link from "next/link";

interface AlumniProfile {
  id: number;
  userId: string;
  role: string;
  bio: string | null;
  location: string | null;
  major: string | null;
  graduationYear: number | null;
  currentPosition: string | null;
  company: string | null;
  isVerified: boolean;
  createdAt: string;
}

export default function AdminAlumniPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniProfile | null>(null);
  const [formData, setFormData] = useState({
    userId: "",
    bio: "",
    location: "",
    major: "",
    graduationYear: "",
    currentPosition: "",
    company: "",
    isVerified: false,
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    fetchAlumni();
  }, [session]);

  async function fetchAlumni() {
    if (!session?.user) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/profiles?role=alumni&limit=1000", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAlumni(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching alumni:", error);
      toast.error("Failed to load alumni");
    } finally {
      setLoading(false);
    }
  }

  const handleAddAlumni = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: formData.userId,
          role: "alumni",
          bio: formData.bio || null,
          location: formData.location || null,
          major: formData.major || null,
          graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
          currentPosition: formData.currentPosition || null,
          company: formData.company || null,
          isVerified: formData.isVerified,
        }),
      });

      if (response.ok) {
        toast.success("Alumni added successfully!");
        setIsAddDialogOpen(false);
        resetForm();
        fetchAlumni();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add alumni");
      }
    } catch (error) {
      console.error("Error adding alumni:", error);
      toast.error("Failed to add alumni");
    }
  };

  const handleEditAlumni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlumni) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/profiles/${selectedAlumni.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio: formData.bio || null,
          location: formData.location || null,
          major: formData.major || null,
          graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
          currentPosition: formData.currentPosition || null,
          company: formData.company || null,
          isVerified: formData.isVerified,
        }),
      });

      if (response.ok) {
        toast.success("Alumni updated successfully!");
        setIsEditDialogOpen(false);
        setSelectedAlumni(null);
        resetForm();
        fetchAlumni();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update alumni");
      }
    } catch (error) {
      console.error("Error updating alumni:", error);
      toast.error("Failed to update alumni");
    }
  };

  const handleDeleteAlumni = async (id: number) => {
    if (!confirm("Are you sure you want to delete this alumni profile?")) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/profiles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Alumni deleted successfully!");
        fetchAlumni();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete alumni");
      }
    } catch (error) {
      console.error("Error deleting alumni:", error);
      toast.error("Failed to delete alumni");
    }
  };

  const openEditDialog = (alumniProfile: AlumniProfile) => {
    setSelectedAlumni(alumniProfile);
    setFormData({
      userId: alumniProfile.userId,
      bio: alumniProfile.bio || "",
      location: alumniProfile.location || "",
      major: alumniProfile.major || "",
      graduationYear: alumniProfile.graduationYear?.toString() || "",
      currentPosition: alumniProfile.currentPosition || "",
      company: alumniProfile.company || "",
      isVerified: alumniProfile.isVerified,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      userId: "",
      bio: "",
      location: "",
      major: "",
      graduationYear: "",
      currentPosition: "",
      company: "",
      isVerified: false,
    });
  };

  const filteredAlumni = alumni.filter((person) =>
    person.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.currentPosition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.major?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
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
            Back to Admin Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Alumni Management</h1>
          <p className="text-muted-foreground">
            Add, edit, and manage alumni profiles for the KLH network
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search alumni by name, position, company, or major..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Alumni
          </Button>
        </div>

        {/* Alumni Table */}
        <Card>
          <CardHeader>
            <CardTitle>Alumni Directory ({filteredAlumni.length})</CardTitle>
            <CardDescription>
              All alumni profiles registered in the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAlumni.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm ? "No alumni found matching your search." : "No alumni added yet. Click 'Add Alumni' to get started."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Major</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlumni.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell className="font-medium">{person.userId}</TableCell>
                        <TableCell>{person.currentPosition || "-"}</TableCell>
                        <TableCell>{person.company || "-"}</TableCell>
                        <TableCell>{person.major || "-"}</TableCell>
                        <TableCell>{person.graduationYear || "-"}</TableCell>
                        <TableCell>{person.location || "-"}</TableCell>
                        <TableCell>
                          {person.isVerified ? (
                            <Badge variant="default">Verified</Badge>
                          ) : (
                            <Badge variant="secondary">Unverified</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(person)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAlumni(person.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Alumni Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Alumni</DialogTitle>
            <DialogDescription>
              Create a new alumni profile for the KLH network
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAlumni}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID (Email) *</Label>
                <Input
                  id="userId"
                  type="email"
                  placeholder="alumni@klh.edu.in"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPosition">Current Position</Label>
                <Input
                  id="currentPosition"
                  placeholder="Software Engineer"
                  value={formData.currentPosition}
                  onChange={(e) => setFormData({ ...formData, currentPosition: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Google"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="major">Major</Label>
                  <Input
                    id="major"
                    placeholder="Computer Science"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="graduationYear">Graduation Year</Label>
                  <Input
                    id="graduationYear"
                    type="number"
                    placeholder="2020"
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Bangalore, India"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about this alumni..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isVerified"
                  checked={formData.isVerified}
                  onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isVerified" className="cursor-pointer">
                  Mark as verified
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Add Alumni</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Alumni Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Alumni Profile</DialogTitle>
            <DialogDescription>
              Update alumni information for {selectedAlumni?.userId}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAlumni}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-currentPosition">Current Position</Label>
                <Input
                  id="edit-currentPosition"
                  placeholder="Software Engineer"
                  value={formData.currentPosition}
                  onChange={(e) => setFormData({ ...formData, currentPosition: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-company">Company</Label>
                <Input
                  id="edit-company"
                  placeholder="Google"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-major">Major</Label>
                  <Input
                    id="edit-major"
                    placeholder="Computer Science"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-graduationYear">Graduation Year</Label>
                  <Input
                    id="edit-graduationYear"
                    type="number"
                    placeholder="2020"
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  placeholder="Bangalore, India"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea
                  id="edit-bio"
                  placeholder="Tell us about this alumni..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-isVerified"
                  checked={formData.isVerified}
                  onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="edit-isVerified" className="cursor-pointer">
                  Mark as verified
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedAlumni(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Update Alumni</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}