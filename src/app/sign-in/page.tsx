"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { GraduationCap, Mail, Lock, Loader2, AlertCircle, Users, Shield } from "lucide-react";
import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
    role: "student" as "student" | "alumni" | "admin",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // KLH email validation - restrict to KLH domain only
    const klhDomains = ["@klh.edu.in", "@kletech.ac.in", "@kle.edu.in"];
    const isKLHEmail = klhDomains.some(domain => formData.email.toLowerCase().endsWith(domain));
    
    if (!isKLHEmail) {
      setError(`Access is restricted to KLH users only. Please use your official KLH email address (${klhDomains.join(", ")})`);
      setLoading(false);
      return;
    }

    try {
      // Persist remember_me preference for token storage strategy
      if (typeof window !== 'undefined') {
        window.localStorage.setItem("remember_me", String(formData.rememberMe));
      }
      const { error, data: session } = await authClient.signIn.email({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
        callbackURL: "/dashboard",
      });

      if (error) {
        setError("Invalid email or password. Please make sure you have already registered an account and try again.");
        setLoading(false);
        return;
      }

      toast.success(`Welcome back to UniLink, ${formData.role}!`);
      router.push("/dashboard");
    } catch (error) {
      console.error("Sign in error:", error);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold">UniLink</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Sign In to UniLink</CardTitle>
            <CardDescription>
              Welcome back! Sign in to access the KLH alumni network
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
              <div className="space-y-3">
                <Label>Sign in as</Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value: "student" | "alumni" | "admin") =>
                    setFormData({ ...formData, role: value })
                  }
                  className="grid grid-cols-3 gap-3"
                  disabled={loading}
                >
                  <div>
                    <RadioGroupItem
                      value="student"
                      id="student"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="student"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                    >
                      <GraduationCap className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">Student</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="alumni"
                      id="alumni"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="alumni"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                    >
                      <Users className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">Alumni</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="admin"
                      id="admin"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="admin"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                    >
                      <Shield className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">Admin</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-1" />
                  KLH Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.name@klh.edu.in"
                  required
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  <Lock className="inline h-4 w-4 mr-1" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  autoComplete="off"
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    setFormData({ ...formData, rememberMe: checked === true })
                  }
                  disabled={loading}
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me
                </Label>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-muted-foreground pt-4">
                Don't have an account?{" "}
                <Link href="/sign-up" className="text-primary hover:underline font-medium">
                  Create an account
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>

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