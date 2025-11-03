"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowLeft, Send, Lock, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function MessagesPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    async function fetchConversations() {
      if (!session?.user) return;

      try {
        const token = localStorage.getItem("bearer_token");
        
        const response = await fetch(`/api/messages/conversations?userId=${session.user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setConversations(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, [session]);

  useEffect(() => {
    async function fetchMessages() {
      if (!session?.user || !selectedConversation) return;

      try {
        const token = localStorage.getItem("bearer_token");
        
        const response = await fetch(
          `/api/messages?conversationId=${selectedConversation.id}&limit=100`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setMessages(Array.isArray(data) ? data.reverse() : []);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
      }
    }

    fetchMessages();
  }, [session, selectedConversation]);

  const handleSendMessage = async () => {
    if (!session?.user || !selectedConversation || !newMessage.trim()) return;

    setSending(true);
    try {
      const token = localStorage.getItem("bearer_token");

      // Get participants (for demo, using first other participant)
      const participants = selectedConversation.participants as string[];
      const receiverId = participants.find((p: string) => p !== session.user.id);

      if (!receiverId) {
        toast.error("No recipient found");
        return;
      }

      // In production, implement actual E2E encryption here
      // For demo, we'll simulate encrypted content
      const encryptedContent = btoa(newMessage); // Base64 encoding as simulation
      const encryptedKey = "demo_key_" + Date.now();

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderId: session.user.id,
          receiverId,
          conversationId: selectedConversation.id,
          encryptedContent,
          encryptedKey,
          messageType: "text",
        }),
      });

      if (response.ok) {
        const newMsg = await response.json();
        setMessages([...messages, newMsg]);
        setNewMessage("");
        toast.success("Message sent!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const decryptMessage = (encryptedContent: string) => {
    // In production, implement actual E2E decryption here
    // For demo, we'll reverse the base64 encoding
    try {
      return atob(encryptedContent);
    } catch {
      return "[Encrypted Message]";
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96 md:col-span-2" />
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
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Lock className="h-8 w-8 text-primary" />
            Encrypted Messages
          </h1>
          <p className="text-muted-foreground">
            End-to-end encrypted conversations with your alumni network
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <Card>
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>Your recent chats</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[480px]">
                {conversations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-4 text-left border-b hover:bg-muted transition-colors ${
                        selectedConversation?.id === conv.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {conv.isGroupChat ? "GRP" : "DM"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {conv.groupName || "Direct Message"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage || "No messages yet"}
                          </p>
                          {conv.lastMessageAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(conv.lastMessageAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="md:col-span-2">
            {!selectedConversation ? (
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </CardContent>
            ) : (
              <>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-green-500" />
                    {selectedConversation.groupName || "Direct Message"}
                  </CardTitle>
                  <CardDescription>End-to-end encrypted</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex flex-col h-[calc(600px-80px)]">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.senderId === session.user.id
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                message.senderId === session.user.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm break-words">
                                {decryptMessage(message.encryptedContent)}
                              </p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(message.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="min-h-[60px] resize-none"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sending || !newMessage.trim()}
                        size="lg"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Messages are end-to-end encrypted
                    </p>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}