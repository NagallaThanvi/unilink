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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Trash2, Calendar, MapPin, Users, Search, X } from "lucide-react";
import Link from "next/link";

interface Event {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location: string;
  universityId: number | null;
  organizerId: string;
  maxAttendees: number | null;
  currentAttendees: number;
  imageUrl: string | null;
  status: string;
  tags: string | null;
  registrationDeadline: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminEventsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    location: "",
    maxAttendees: "",
    imageUrl: "",
    tags: "",
    registrationDeadline: "",
    isPublic: true,
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    fetchEvents();
  }, [session]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEvents(events);
    } else {
      const filtered = events.filter(
        (event) =>
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  }, [searchQuery, events]);

  const fetchEvents = async () => {
    if (!session?.user) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/events?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(Array.isArray(data) ? data : []);
        setFilteredEvents(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) return;

    try {
      const token = localStorage.getItem("bearer_token");

      const payload = {
        title: formData.title,
        description: formData.description,
        eventDate: formData.eventDate,
        eventTime: formData.eventTime,
        location: formData.location,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        imageUrl: formData.imageUrl || null,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
        registrationDeadline: formData.registrationDeadline || null,
        isPublic: formData.isPublic,
      };

      const url = editingEvent
        ? `/api/events?id=${editingEvent.id}`
        : "/api/events";

      const method = editingEvent ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(editingEvent ? "Event updated!" : "Event created!");
        setShowForm(false);
        setEditingEvent(null);
        resetForm();
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save event");
      }
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      location: event.location,
      maxAttendees: event.maxAttendees?.toString() || "",
      imageUrl: event.imageUrl || "",
      tags: event.tags ? JSON.parse(event.tags).join(", ") : "",
      registrationDeadline: event.registrationDeadline || "",
      isPublic: event.isPublic,
    });
    setShowForm(true);
  };

  const handleDelete = async (eventId: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/events?id=${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Event deleted successfully");
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      eventDate: "",
      eventTime: "",
      location: "",
      maxAttendees: "",
      imageUrl: "",
      tags: "",
      registrationDeadline: "",
      isPublic: true,
    });
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingEvent(null);
    resetForm();
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
            Back to Admin Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Events Management</h1>
            <p className="text-muted-foreground">Create and manage alumni events</p>
          </div>
          <Button onClick={() => setShowForm(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Add Event
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingEvent ? "Edit Event" : "Create New Event"}</CardTitle>
              <CardDescription>Fill in the event details below</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Event Title *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Career Fair 2025"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Location *</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="University Convention Center"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description *</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the event..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Event Date *</label>
                    <Input
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Event Time *</label>
                    <Input
                      value={formData.eventTime}
                      onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                      placeholder="2:00 PM - 5:00 PM"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Attendees</label>
                    <Input
                      type="number"
                      value={formData.maxAttendees}
                      onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Image URL</label>
                    <Input
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Registration Deadline</label>
                    <Input
                      type="date"
                      value={formData.registrationDeadline}
                      onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Tags (comma-separated)</label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="career, networking, technology"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isPublic" className="text-sm font-medium">Public event</label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingEvent ? "Update Event" : "Create Event"}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Events ({filteredEvents.length})</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events..."
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No events found matching your search" : "No events yet. Create your first event!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            {event.imageUrl && (
                              <img
                                src={event.imageUrl}
                                alt={event.title}
                                className="w-24 h-24 rounded object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{event.title}</h3>
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {event.description}
                              </p>
                              <div className="flex flex-wrap gap-3 text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>{new Date(event.eventDate).toLocaleDateString()} at {event.eventTime}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{event.location}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {event.currentAttendees}
                                    {event.maxAttendees ? `/${event.maxAttendees}` : ""} attendees
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <Badge variant={event.status === "upcoming" ? "default" : "secondary"}>
                                  {event.status}
                                </Badge>
                                {event.tags && JSON.parse(event.tags).map((tag: string) => (
                                  <Badge key={tag} variant="outline">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(event)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}