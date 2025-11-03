
"use client"
import { createAuthClient } from "better-auth/react"
import { useEffect, useState } from "react"

function getToken(): string {
  if (typeof window === 'undefined') return "";
  const ls = window.localStorage?.getItem("bearer_token") || "";
  const ss = window.sessionStorage?.getItem("bearer_token") || "";
  return ls || ss || "";
}

function shouldRemember(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage?.getItem("remember_me") === "true";
}

export const authClient = createAuthClient({
   baseURL: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL,
  fetchOptions: {
      headers: {
        Authorization: `Bearer ${typeof window !== 'undefined' ? getToken() : ""}`,
      },
      onSuccess: (ctx) => {
          const authToken = ctx.response.headers.get("set-auth-token")
          if (authToken && typeof window !== 'undefined'){
            if (shouldRemember()) {
              window.localStorage.setItem("bearer_token", authToken);
              window.sessionStorage.removeItem("bearer_token");
            } else {
              window.sessionStorage.setItem("bearer_token", authToken);
              window.localStorage.removeItem("bearer_token");
            }
          }
      }
  }
});

type SessionData = ReturnType<typeof authClient.useSession>

export function useSession(): SessionData {
   const [session, setSession] = useState<any>(null);
   const [isPending, setIsPending] = useState(true);
   const [isRefetching, setIsRefetching] = useState(false);
   const [error, setError] = useState<any>(null);

   const refetch = () => {
      setIsRefetching(true);
      setError(null);
      fetchSession();
   };

   const fetchSession = async () => {
      try {
         const res = await authClient.getSession({
            fetchOptions: {
               auth: {
                  type: "Bearer",
                  token: typeof window !== 'undefined' ? getToken() : "",
               },
            },
         });
         setSession(res.data);
         setError(null);
      } catch (err) {
         setSession(null);
         setError(err);
      } finally {
         setIsPending(false);
         setIsRefetching(false);
      }
   };

   useEffect(() => {
      fetchSession();
   }, []);

   return { data: session, isPending, isRefetching, error, refetch };
}