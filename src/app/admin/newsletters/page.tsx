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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Send, FileText, Calendar, Eye } from "lucide-react";
import Link from "next/link";

export default function NewslettersPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewNewsletter, setViewNewsletter] = useState<any>(null);
  const [formData, setFormData] = useState({
    universityId: "",
    aiPrompt: "",
    title: "",
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      
      const [newslettersRes, universitiesRes] = await Promise.all([
        fetch("/api/newsletters?limit=100", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/universities?limit=100"),
      ]);

      if (newslettersRes.ok) {
        const data = await newslettersRes.json();
        setNewsletters(Array.isArray(data) ? data : []);
      }
      
      if (universitiesRes.ok) {
        const data = await universitiesRes.json();
        setUniversities(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load newsletters");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user || !formData.universityId || !formData.aiPrompt) {
      toast.error("Please fill all required fields");
      return;
    }

    setGenerating(true);
    try {
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch("/api/newsletters/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          universityId: parseInt(formData.universityId),
          createdBy: session.user.id,
          aiPrompt: formData.aiPrompt,
          title: formData.title || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Newsletter generated successfully!");
        setIsDialogOpen(false);
        setFormData({ universityId: "", aiPrompt: "", title: "" });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to generate newsletter");
      }
    } catch (error) {
      console.error("Error generating newsletter:", error);
      toast.error("Failed to generate newsletter");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (id: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch(`/api/newsletters?id=${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "published",
          publishDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success("Newsletter published!");
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to publish newsletter");
      }
    } catch (error) {
      console.error("Error publishing newsletter:", error);
      toast.error("Failed to publish newsletter");
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
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              AI Newsletter Generation
            </h1>
            <p className="text-muted-foreground">
              Create personalized newsletters using AI
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Newsletter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Generate AI Newsletter</DialogTitle>
                <DialogDescription>
                  Provide a prompt and let AI generate engaging content
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleGenerateNewsletter} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="university">University *</Label>
                  <Select
                    value={formData.universityId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, universityId: value })
                    }
                  >
                    <SelectTrigger id="university">
                      <SelectValue placeholder="Select university" />
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

                <div className="space-y-2">
                  <Label htmlFor="title">Title (Optional)</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Leave empty for auto-generated title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aiPrompt">AI Prompt *</Label>
                  <Textarea
                    id="aiPrompt"
                    value={formData.aiPrompt}
                    onChange={(e) => setFormData({ ...formData, aiPrompt: e.target.value })}
                    placeholder="E.g., 'Create a newsletter about recent alumni achievements, upcoming events, and networking opportunities'"
                    rows={5}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI will generate content based on this prompt
                  </p>
                </div>

                <Button type="submit" disabled={generating} className="w-full">
                  {generating ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Newsletter
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          {newsletters.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No newsletters yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate your first AI-powered newsletter
                </p>
              </CardContent>
            </Card>
          ) : (
            newsletters.map((newsletter) => (
              <Card key={newsletter.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {newsletter.title}
                        <Badge
                          variant={
                            newsletter.status === "published"
                              ? "default"
                              : newsletter.status === "scheduled"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {newsletter.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        University ID: {newsletter.universityId}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {newsletter.aiPrompt && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-xs font-medium mb-1">AI Prompt Used:</p>
                      <p className="text-sm text-muted-foreground">
                        {newsletter.aiPrompt}
                      </p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Created: {new Date(newsletter.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {newsletter.publishDate && (
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Published: {new Date(newsletter.publishDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Recipients:</span>
                      <span>{newsletter.recipientCount}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewNewsletter(newsletter)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Content
                    </Button>
                    {newsletter.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => handlePublish(newsletter.id)}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Publish
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* View Newsletter Dialog */}
        <Dialog open={!!viewNewsletter} onOpenChange={() => setViewNewsletter(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewNewsletter?.title}</DialogTitle>
              <DialogDescription>
                Generated newsletter content
              </DialogDescription>
            </DialogHeader>
            <div className="prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap">{viewNewsletter?.content}</div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}