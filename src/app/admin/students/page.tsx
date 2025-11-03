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

interface StudentProfile {
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

export default function AdminStudentsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [formData, setFormData] = useState({
    userId: "",
    bio: "",
    location: "",
    major: "",
    enrollmentYear: "",
    isVerified: false,
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    fetchStudents();
  }, [session]);

  async function fetchStudents() {
    if (!session?.user) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/profiles?role=student&limit=1000", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  const handleAddStudent = async (e: React.FormEvent) => {
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
          role: "student",
          bio: formData.bio || null,
          location: formData.location || null,
          major: formData.major || null,
          graduationYear: formData.enrollmentYear ? parseInt(formData.enrollmentYear) : null,
          currentPosition: null,
          company: null,
          isVerified: formData.isVerified,
        }),
      });

      if (response.ok) {
        toast.success("Student added successfully!");
        setIsAddDialogOpen(false);
        resetForm();
        fetchStudents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add student");
      }
    } catch (error) {
      console.error("Error adding student:", error);
      toast.error("Failed to add student");
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/profiles/${selectedStudent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio: formData.bio || null,
          location: formData.location || null,
          major: formData.major || null,
          graduationYear: formData.enrollmentYear ? parseInt(formData.enrollmentYear) : null,
          currentPosition: null,
          company: null,
          isVerified: formData.isVerified,
        }),
      });

      if (response.ok) {
        toast.success("Student updated successfully!");
        setIsEditDialogOpen(false);
        setSelectedStudent(null);
        resetForm();
        fetchStudents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update student");
      }
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("Failed to update student");
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm("Are you sure you want to delete this student profile?")) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/profiles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Student deleted successfully!");
        fetchStudents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete student");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student");
    }
  };

  const openEditDialog = (studentProfile: StudentProfile) => {
    setSelectedStudent(studentProfile);
    setFormData({
      userId: studentProfile.userId,
      bio: studentProfile.bio || "",
      location: studentProfile.location || "",
      major: studentProfile.major || "",
      enrollmentYear: studentProfile.graduationYear?.toString() || "",
      isVerified: studentProfile.isVerified,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      userId: "",
      bio: "",
      location: "",
      major: "",
      enrollmentYear: "",
      isVerified: false,
    });
  };

  const filteredStudents = students.filter((person) =>
    person.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.major?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.location?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold mb-2">Student Management</h1>
          <p className="text-muted-foreground">
            Add, edit, and manage student profiles for the KLH network
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search students by name, major, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Directory ({filteredStudents.length})</CardTitle>
            <CardDescription>
              All student profiles registered in the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm ? "No students found matching your search." : "No students added yet. Click 'Add Student' to get started."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Major</TableHead>
                      <TableHead>Enrollment Year</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell className="font-medium">{person.userId}</TableCell>
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
                              onClick={() => handleDeleteStudent(person.id)}
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

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Create a new student profile for the KLH network
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudent}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID (Email) *</Label>
                <Input
                  id="userId"
                  type="email"
                  placeholder="student@klh.edu.in"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
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
                  <Label htmlFor="enrollmentYear">Enrollment Year</Label>
                  <Input
                    id="enrollmentYear"
                    type="number"
                    placeholder="2024"
                    value={formData.enrollmentYear}
                    onChange={(e) => setFormData({ ...formData, enrollmentYear: e.target.value })}
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
                  placeholder="Tell us about this student..."
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
              <Button type="submit">Add Student</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student Profile</DialogTitle>
            <DialogDescription>
              Update student information for {selectedStudent?.userId}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditStudent}>
            <div className="space-y-4 py-4">
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
                  <Label htmlFor="edit-enrollmentYear">Enrollment Year</Label>
                  <Input
                    id="edit-enrollmentYear"
                    type="number"
                    placeholder="2024"
                    value={formData.enrollmentYear}
                    onChange={(e) => setFormData({ ...formData, enrollmentYear: e.target.value })}
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
                  placeholder="Tell us about this student..."
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
                setSelectedStudent(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Update Student</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}