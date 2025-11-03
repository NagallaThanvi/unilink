"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Building, Globe, MapPin, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

export default function UniversitiesManagementPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [universities, setUniversities] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    country: "",
    tenantId: "",
    description: "",
    logo: "",
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      const response = await fetch("/api/universities?limit=100");
      if (response.ok) {
        const data = await response.json();
        setUniversities(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching universities:", error);
      toast.error("Failed to load universities");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("bearer_token");
      const url = editingUniversity
        ? `/api/universities?id=${editingUniversity.id}`
        : "/api/universities";
      
      const response = await fetch(url, {
        method: editingUniversity ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          settings: {
            gdprCompliant: true,
            dataRetention: "7years",
            cookieConsent: true,
          },
        }),
      });

      if (response.ok) {
        toast.success(
          editingUniversity ? "University updated!" : "University created!"
        );
        setIsDialogOpen(false);
        setEditingUniversity(null);
        setFormData({
          name: "",
          domain: "",
          country: "",
          tenantId: "",
          description: "",
          logo: "",
        });
        fetchUniversities();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save university");
      }
    } catch (error) {
      console.error("Error saving university:", error);
      toast.error("Failed to save university");
    }
  };

  const handleEdit = (university: any) => {
    setEditingUniversity(university);
    setFormData({
      name: university.name,
      domain: university.domain,
      country: university.country,
      tenantId: university.tenantId,
      description: university.description || "",
      logo: university.logo || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this university?")) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/universities?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("University deleted!");
        fetchUniversities();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete university");
      }
    } catch (error) {
      console.error("Error deleting university:", error);
      toast.error("Failed to delete university");
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Universities Management</h1>
            <p className="text-muted-foreground">
              Manage universities and their tenant configurations
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add University
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingUniversity ? "Edit University" : "Add New University"}
                </DialogTitle>
                <DialogDescription>
                  Configure university details and tenant settings
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">University Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Stanford University"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain *</Label>
                    <Input
                      id="domain"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      placeholder="stanford.edu"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="USA"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenantId">Tenant ID *</Label>
                    <Input
                      id="tenantId"
                      value={formData.tenantId}
                      onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                      placeholder="tenant_stanford"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description..."
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editingUniversity ? "Update University" : "Create University"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {universities.map((university) => (
            <Card key={university.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {university.logo ? (
                      <img
                        src={university.logo}
                        alt={university.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{university.name}</CardTitle>
                      <Badge variant={university.isActive ? "default" : "secondary"}>
                        {university.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{university.domain}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{university.country}</span>
                </div>
                {university.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {university.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Tenant ID:</span> {university.tenantId}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(university)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(university.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {universities.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No universities yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first university to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}