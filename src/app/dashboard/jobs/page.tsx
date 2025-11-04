"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  MapPin, 
  Building2, 
  Clock, 
  DollarSign, 
  Users, 
  Plus,
  Filter,
  Briefcase,
  GraduationCap,
  Eye,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Job = {
  id: number;
  title: string;
  description: string;
  company: string;
  location: string;
  jobType: string;
  experienceLevel: string;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  skills?: string[];
  requirements: string;
  benefits?: string;
  applicationDeadline?: string;
  isRemote: boolean;
  status: string;
  applicationCount: number;
  viewCount: number;
  tags?: string[];
  createdAt: string;
  poster?: {
    id: string;
    name: string;
    image?: string;
  };
  posterProfile?: {
    company?: string;
    currentPosition?: string;
  };
};

export default function JobsPage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [experienceLevelFilter, setExperienceLevelFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [isRemoteFilter, setIsRemoteFilter] = useState("");

  const loadJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (jobTypeFilter) params.set('jobType', jobTypeFilter);
      if (experienceLevelFilter) params.set('experienceLevel', experienceLevelFilter);
      if (locationFilter) params.set('location', locationFilter);
      if (isRemoteFilter) params.set('isRemote', isRemoteFilter);
      params.set('limit', '20');

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to load jobs");
      console.error(error);
    }
  };

  const loadMyJobs = async () => {
    if (!session?.user?.id) return;
    
    try {
      const res = await fetch(`/api/jobs?postedById=${session.user.id}`);
      const data = await res.json();
      setMyJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to load your jobs");
      console.error(error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadJobs(), loadMyJobs()]);
      setLoading(false);
    };
    load();
  }, [session]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (!loading) loadJobs();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, jobTypeFilter, experienceLevelFilter, locationFilter, isRemoteFilter]);

  const formatSalary = (min?: number, max?: number, currency = 'INR') => {
    if (!min && !max) return null;
    if (min && max) return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `${currency} ${min.toLocaleString()}+`;
    if (max) return `Up to ${currency} ${max.toLocaleString()}`;
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'full-time': return 'bg-green-100 text-green-800';
      case 'part-time': return 'bg-blue-100 text-blue-800';
      case 'contract': return 'bg-purple-100 text-purple-800';
      case 'internship': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExperienceLevelColor = (level: string) => {
    switch (level) {
      case 'entry': return 'bg-emerald-100 text-emerald-800';
      case 'mid': return 'bg-blue-100 text-blue-800';
      case 'senior': return 'bg-purple-100 text-purple-800';
      case 'executive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const JobCard = ({ job }: { job: Job }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1 hover:text-primary cursor-pointer">
              <Link href={`/dashboard/jobs/${job.id}`}>
                {job.title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4" />
              {job.company}
              {job.posterProfile?.currentPosition && (
                <span className="text-xs">• {job.posterProfile.currentPosition}</span>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={getJobTypeColor(job.jobType)}>
              {job.jobType}
            </Badge>
            <Badge className={getExperienceLevelColor(job.experienceLevel)}>
              {job.experienceLevel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {job.location}
              {job.isRemote && <Badge variant="outline">Remote</Badge>}
            </div>
            {formatSalary(job.salaryMin, job.salaryMax, job.currency) && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {job.description}
          </p>

          {job.skills && job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.skills.slice(0, 4).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{job.skills.length - 4} more
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {job.applicationCount} applicants
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {job.viewCount} views
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(job.createdAt).toLocaleDateString()}
              </div>
            </div>
            
            <Button size="sm" asChild>
              <Link href={`/dashboard/jobs/${job.id}`}>
                View Details
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Job Opportunities</h1>
          <p className="text-muted-foreground">
            Discover career opportunities from alumni and companies
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs/post">
            <Plus className="mr-2 h-4 w-4" />
            Post a Job
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Browse Jobs
          </TabsTrigger>
          <TabsTrigger value="my-jobs" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            My Jobs ({myJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Search & Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <Input
                    placeholder="Search jobs, companies, skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={experienceLevelFilter} onValueChange={setExperienceLevelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Levels</SelectItem>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior Level</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={isRemoteFilter} onValueChange={setIsRemoteFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Locations</SelectItem>
                    <SelectItem value="true">Remote Only</SelectItem>
                    <SelectItem value="false">On-site Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Job Listings */}
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search criteria or check back later for new opportunities.
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/jobs/post">
                      Post the first job
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              jobs.map((job) => <JobCard key={job.id} job={job} />)
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-jobs" className="space-y-6">
          <div className="space-y-4">
            {myJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No jobs posted yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start posting job opportunities to connect with talented alumni and students.
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/jobs/post">
                      <Plus className="mr-2 h-4 w-4" />
                      Post Your First Job
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myJobs.map((job) => <JobCard key={job.id} job={job} />)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
