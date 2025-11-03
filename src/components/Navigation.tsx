"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GraduationCap, Menu, X, ChevronDown, User, LogOut, Settings, LayoutDashboard, Shield } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import { toast } from "sonner";

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role from profile
  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/profiles?userId=${session.user.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("bearer_token")}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.profile?.role) {
            setUserRole(data.profile.role);
          }
        })
        .catch(() => {});
    }
  }, [session?.user?.id]);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error("Failed to sign out");
    } else {
      localStorage.removeItem("bearer_token");
      refetch();
      router.push("/");
      toast.success("Signed out successfully");
    }
  };

  const isAdmin = userRole === "university_admin";

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold">UniLink</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {!session && (
              <>
                <Link href="#features" className="text-foreground/80 hover:text-foreground transition-colors">
                  Features
                </Link>
                <Link href="#how-it-works" className="text-foreground/80 hover:text-foreground transition-colors">
                  How It Works
                </Link>
                <Link href="#about" className="text-foreground/80 hover:text-foreground transition-colors">
                  About
                </Link>
              </>
            )}

            {session && (
              <>
                {/* Dashboard Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-1">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile" className="cursor-pointer">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/alumni" className="cursor-pointer">
                        Alumni Directory
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/students" className="cursor-pointer">
                        Students Directory
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/events" className="cursor-pointer">
                        Events
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/messages" className="cursor-pointer">
                        Messages
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/credentials" className="cursor-pointer">
                        Credentials
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Admin Dropdown - Only for admins */}
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-1">
                        <Shield className="h-4 w-4" />
                        Admin
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel>Manage</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin/alumni" className="cursor-pointer">
                          Alumni
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/students" className="cursor-pointer">
                          Students
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/users" className="cursor-pointer">
                          Users
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/events" className="cursor-pointer">
                          Events
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/newsletters" className="cursor-pointer">
                          Newsletters
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/universities" className="cursor-pointer">
                          Universities
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}

            {/* Auth Buttons / User Menu */}
            {!session ? (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>Join Free</Button>
                </Link>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {session.user?.name || "Account"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile" className="cursor-pointer flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer flex items-center gap-2 text-destructive">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            {!session && (
              <>
                <Link
                  href="#features"
                  className="block text-foreground/80 hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  href="#how-it-works"
                  className="block text-foreground/80 hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How It Works
                </Link>
                <Link
                  href="#about"
                  className="block text-foreground/80 hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>
              </>
            )}

            {session && (
              <>
                <div className="space-y-2">
                  <p className="font-semibold text-sm text-muted-foreground px-2">Dashboard</p>
                  <Link href="/dashboard/profile" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                    Profile
                  </Link>
                  <Link href="/dashboard/alumni" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                    Alumni Directory
                  </Link>
                  <Link href="/dashboard/students" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                    Students Directory
                  </Link>
                  <Link href="/dashboard/events" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                    Events
                  </Link>
                  <Link href="/dashboard/messages" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                    Messages
                  </Link>
                  <Link href="/dashboard/credentials" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                    Credentials
                  </Link>
                </div>

                {isAdmin && (
                  <div className="space-y-2 pt-4 border-t border-border">
                    <p className="font-semibold text-sm text-muted-foreground px-2">Admin</p>
                    <Link href="/admin/alumni" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                      Alumni
                    </Link>
                    <Link href="/admin/students" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                      Students
                    </Link>
                    <Link href="/admin/users" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                      Users
                    </Link>
                    <Link href="/admin/events" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                      Events
                    </Link>
                    <Link href="/admin/newsletters" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                      Newsletters
                    </Link>
                    <Link href="/admin/universities" className="block px-2 py-1 text-foreground/80 hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                      Universities
                    </Link>
                  </div>
                )}
              </>
            )}

            {!session ? (
              <div className="flex flex-col space-y-2 pt-4">
                <Link href="/sign-in">
                  <Button variant="ghost" className="w-full">Sign In</Button>
                </Link>
                <Link href="/sign-up">
                  <Button className="w-full">Join Free</Button>
                </Link>
              </div>
            ) : (
              <div className="pt-4 border-t border-border">
                <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}