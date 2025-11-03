"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

type Post = {
  id: number;
  userId: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  createdAt: string;
  author?: { id?: string; name?: string | null; image?: string | null };
};

type FeedProps = {
  userIdFilter?: string;
  showComposer?: boolean;
};

export default function Feed({ userIdFilter, showComposer = true }: FeedProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);

  const load = async () => {
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "20");
      if (userIdFilter) qs.set("userId", userIdFilter);
      const res = await fetch(`/api/posts?${qs.toString()}`);
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Only images or videos are allowed");
      return;
    }
    if (isImage && file.size > 5 * 1024 * 1024) {
      toast.error("Image must be <= 5MB");
      return;
    }
    if (isVideo && file.size > 50 * 1024 * 1024) {
      toast.error("Video must be <= 50MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaDataUrl(reader.result as string);
      setMediaType(isImage ? "image" : "video");
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!session?.user) return;
    if (!content && !mediaDataUrl) {
      toast.error("Write something or add media");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          content: content || null,
          mediaDataUrl,
          mediaType,
        }),
      });
      if (!res.ok) throw new Error("Failed to post");
      setContent("");
      setMediaDataUrl(null);
      setMediaType(null);
      await load();
      toast.success("Posted");
    } catch (e) {
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      {showComposer && (
        <Card>
          <CardHeader>
            <CardTitle>Share an update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback>
                  {(session?.user?.name?.substring(0,2) || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Write a post..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*,video/*" onChange={onFileChange} />
                  <Button onClick={submit} disabled={posting}>
                    {posting ? "Posting..." : "Post"}
                  </Button>
                </div>
                {mediaDataUrl && (
                  <div className="rounded border p-2">
                    {mediaType === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaDataUrl} alt="preview" className="max-h-64 object-contain" />
                    ) : (
                      <video src={mediaDataUrl} controls className="max-h-64" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <Card><CardContent className="p-6">Loading feed...</CardContent></Card>
        ) : posts.length === 0 ? (
          <Card><CardContent className="p-6">No posts yet</CardContent></Card>
        ) : (
          posts.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.author?.image || undefined} />
                    <AvatarFallback>
                      {(p.author?.name?.substring(0,2) || p.userId.substring(0,2)).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{p.author?.name || p.userId}</div>
                    <div className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                {p.content && <div className="whitespace-pre-wrap">{p.content}</div>}
                {p.mediaUrl && (
                  <div className="rounded overflow-hidden">
                    {p.mediaType === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.mediaUrl} alt="media" className="max-h-[480px] w-full object-contain" />
                    ) : (
                      <video src={p.mediaUrl} controls className="w-full max-h-[480px]" />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
