"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Award, CheckCircle, ExternalLink, Calendar, Building } from "lucide-react";
import Link from "next/link";

export default function CredentialsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<any[]>([]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    async function fetchCredentials() {
      if (!session?.user) return;

      try {
        const token = localStorage.getItem("bearer_token");
        
        const response = await fetch(`/api/credentials?userId=${session.user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setCredentials(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching credentials:", error);
        toast.error("Failed to load credentials");
      } finally {
        setLoading(false);
      }
    }

    fetchCredentials();
  }, [session]);

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-4xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
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

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Credentials</h1>
          <p className="text-muted-foreground">
            Blockchain-verified academic achievements and certifications
          </p>
        </div>

        {credentials.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No credentials yet</h3>
              <p className="text-muted-foreground mb-4">
                Your verified credentials will appear here once your university adds them
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {credentials.map((credential) => (
              <Card key={credential.id} className="border-l-4" style={{
                borderLeftColor: credential.isVerifiedOnChain ? '#10b981' : '#6b7280'
              }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        {credential.title}
                        {credential.isVerifiedOnChain && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </CardTitle>
                      <CardDescription>{credential.description}</CardDescription>
                    </div>
                    <Badge
                      variant={credential.isVerifiedOnChain ? "default" : "secondary"}
                    >
                      {credential.isVerifiedOnChain ? "Blockchain Verified" : "Pending"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>University ID: {credential.universityId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Issued: {new Date(credential.issueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Type: </span>
                      <Badge variant="outline">{credential.credentialType}</Badge>
                    </div>

                    {credential.blockchainTxHash && (
                      <div className="text-sm">
                        <span className="font-medium">Transaction Hash: </span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {credential.blockchainTxHash.substring(0, 20)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                          asChild
                        >
                          <a
                            href={`https://polygonscan.com/tx/${credential.blockchainTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    )}

                    {credential.ipfsHash && (
                      <div className="text-sm">
                        <span className="font-medium">IPFS Hash: </span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {credential.ipfsHash.substring(0, 20)}...
                        </code>
                      </div>
                    )}
                  </div>

                  {credential.metadata && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-xs font-medium mb-2">Additional Information</p>
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(JSON.parse(credential.metadata), null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}