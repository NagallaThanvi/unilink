"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, AlertCircle, GraduationCap, Users, Shield } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student" as "student" | "alumni" | "admin",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    // KLH email validation - restrict to KLH domain only
    const klhDomains = ["@klh.edu.in", "@kletech.ac.in", "@kle.edu.in"];
    const isKLHEmail = klhDomains.some(domain => formData.email.toLowerCase().endsWith(domain));
    
    if (!isKLHEmail) {
      setError(`Registration is restricted to KLH users only. Please use your official KLH email address (${klhDomains.join(", ")})`);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      if (error?.code) {
        const errorMap: Record<string, string> = {
          USER_ALREADY_EXISTS: "An account with this email already exists. Please sign in instead.",
          INVALID_EMAIL: "Please enter a valid email address",
          WEAK_PASSWORD: "Password is too weak. Please use a stronger password.",
        };
        setError(errorMap[error.code] || "Registration failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Create user profile with selected role
      const token = localStorage.getItem("bearer_token");
      const profileResponse = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          role: formData.role === "admin" ? "university_admin" : formData.role,
        }),
      });

      if (!profileResponse.ok) {
        console.error("Failed to create user profile");
      }

      toast.success(`Account created successfully as ${formData.role}! Welcome to UniLink.`);
      router.push("/dashboard");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 group">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              Join the KLH alumni network. Enter your details to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Role Selection */}
              <div className="space-y-2">
                <Label>I am a</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "student" })}
                    className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all ${
                      formData.role === "student"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                    disabled={isLoading}
                  >
                    <GraduationCap className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "alumni" })}
                    className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all ${
                      formData.role === "alumni"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                    disabled={isLoading}
                  >
                    <Users className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">Alumni</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "admin" })}
                    className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all ${
                      formData.role === "admin"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                    disabled={isLoading}
                  >
                    <Shield className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">Admin</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">KLH Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.name@klh.edu.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Only KLH email addresses are accepted
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
            
            <div className="text-xs text-center text-muted-foreground bg-muted/50 p-3 rounded-md">
              <strong>Note:</strong> UniLink is exclusively for KLH (KLE Technological University) students and alumni. 
              Registration requires a valid KLH email address.
            </div>
          </CardFooter>
        </Card>

        {/* Free Platform Notice */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            🎓 UniLink is <strong className="text-foreground">100% free</strong> for all KLH members
          </p>
        </div>
      </div>
    </div>
  );
}