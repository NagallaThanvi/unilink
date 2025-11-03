"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Calendar, MapPin, Users, Search, X, Clock, CheckCircle } from "lucide-react";
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
  registrationCount?: number;
}

export default function EventsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [registering, setRegistering] = useState<number | null>(null);
  const [myRegistrations, setMyRegistrations] = useState<Set<number>>(new Set());

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
      const response = await fetch("/api/events?status=upcoming&limit=100", {
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

  const handleRegister = async (eventId: number) => {
    if (!session?.user) return;

    setRegistering(eventId);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Successfully registered for event!");
        setMyRegistrations(new Set([...myRegistrations, eventId]));
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to register for event");
      }
    } catch (error) {
      console.error("Error registering for event:", error);
      toast.error("Failed to register for event");
    } finally {
      setRegistering(null);
    }
  };

  const handleCancelRegistration = async (eventId: number) => {
    if (!session?.user) return;

    if (!confirm("Are you sure you want to cancel your registration?")) return;

    setRegistering(eventId);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Registration cancelled successfully");
        const newRegistrations = new Set(myRegistrations);
        newRegistrations.delete(eventId);
        setMyRegistrations(newRegistrations);
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to cancel registration");
      }
    } catch (error) {
      console.error("Error cancelling registration:", error);
      toast.error("Failed to cancel registration");
    } finally {
      setRegistering(null);
    }
  };

  const isEventFull = (event: Event) => {
    return event.maxAttendees !== null && event.currentAttendees >= event.maxAttendees;
  };

  const isRegistrationClosed = (event: Event) => {
    if (!event.registrationDeadline) return false;
    return new Date(event.registrationDeadline) < new Date();
  };

  const isRegistered = (eventId: number) => {
    return myRegistrations.has(eventId);
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  const upcomingEvents = filteredEvents.filter((e) => e.status === "upcoming");
  const myEvents = upcomingEvents.filter((e) => isRegistered(e.id));

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
            <Calendar className="h-8 w-8 text-primary" />
            Alumni Events
          </h1>
          <p className="text-muted-foreground">
            Discover and register for upcoming alumni events
          </p>
        </div>

        <div className="mb-6">
          <div className="relative w-full max-w-md">
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

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Events ({upcomingEvents.length})</TabsTrigger>
            <TabsTrigger value="registered">My Events ({myEvents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {upcomingEvents.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No events found matching your search" : "No upcoming events at the moment"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((event) => (
                  <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {event.imageUrl && (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <CardHeader>
                      <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                      <CardDescription className="line-clamp-3">
                        {event.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{event.eventTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {event.currentAttendees}
                            {event.maxAttendees ? `/${event.maxAttendees}` : ""} attendees
                          </span>
                        </div>
                      </div>

                      {event.tags && (
                        <div className="flex flex-wrap gap-2">
                          {JSON.parse(event.tags).slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {isRegistered(event.id) ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleCancelRegistration(event.id)}
                          disabled={registering === event.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {registering === event.id ? "Processing..." : "Registered - Cancel"}
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleRegister(event.id)}
                          disabled={
                            registering === event.id ||
                            isEventFull(event) ||
                            isRegistrationClosed(event)
                          }
                        >
                          {registering === event.id
                            ? "Registering..."
                            : isEventFull(event)
                            ? "Event Full"
                            : isRegistrationClosed(event)
                            ? "Registration Closed"
                            : "Register Now"}
                        </Button>
                      )}

                      {event.registrationDeadline && !isRegistrationClosed(event) && (
                        <p className="text-xs text-muted-foreground text-center">
                          Register by {new Date(event.registrationDeadline).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="registered" className="mt-6">
            {myEvents.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      You haven't registered for any events yet
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        const tabTrigger = document.querySelector('[value="all"]') as HTMLElement;
                        tabTrigger?.click();
                      }}
                    >
                      Browse Events
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myEvents.map((event) => (
                  <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {event.imageUrl && (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="line-clamp-2 flex-1">{event.title}</CardTitle>
                        <Badge variant="default" className="ml-2">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Registered
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-3">
                        {event.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{event.eventTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      </div>

                      {event.tags && (
                        <div className="flex flex-wrap gap-2">
                          {JSON.parse(event.tags).slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleCancelRegistration(event.id)}
                        disabled={registering === event.id}
                      >
                        {registering === event.id ? "Processing..." : "Cancel Registration"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}