
"use client";

import { useEffect, useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { firebaseAuth } from "./firebaseClient";

type AppUser = {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
};

type Session = {
  user: AppUser | null;
};

type AuthError = {
  code: string;
  message: string;
};

type SignInEmailArgs = {
  email: string;
  password: string;
  rememberMe?: boolean;
  callbackURL?: string;
};

type SignUpEmailArgs = {
  email: string;
  password: string;
  name?: string;
};

function mapFirebaseUserToSession(user: User | null): Session | null {
  if (!user) return null;
  return {
    user: {
      id: user.uid,
      name: user.displayName ?? null,
      email: user.email ?? null,
      image: user.photoURL ?? null,
    },
  };
}

async function storeIdToken(user: User | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem("bearer_token");
    return;
  }
  const token = await user.getIdToken();
  window.localStorage.setItem("bearer_token", token);
}

export const authClient = {
  signIn: {
    email: async ({ email, password, rememberMe }: SignInEmailArgs) => {
      try {
        const persistence = rememberMe
          ? browserLocalPersistence
          : browserSessionPersistence;
        await setPersistence(firebaseAuth, persistence);

        const cred = await signInWithEmailAndPassword(
          firebaseAuth,
          email,
          password,
        );
        await storeIdToken(cred.user);
        const session = mapFirebaseUserToSession(cred.user);
        return { data: session, error: null as AuthError | null };
      } catch (error: any) {
        const authError: AuthError = {
          code: error?.code || "AUTH_SIGN_IN_ERROR",
          message: error?.message || "Failed to sign in",
        };
        return { data: null, error: authError };
      }
    },
  },
  signUp: {
    email: async ({ email, password, name }: SignUpEmailArgs) => {
      try {
        const cred = await createUserWithEmailAndPassword(
          firebaseAuth,
          email,
          password,
        );

        if (name) {
          await updateProfile(cred.user, { displayName: name });
        }

        await storeIdToken(cred.user);
        const session = mapFirebaseUserToSession(cred.user);
        return { data: session, error: null as AuthError | null };
      } catch (error: any) {
        const authError: AuthError = {
          code: error?.code || "AUTH_SIGN_UP_ERROR",
          message: error?.message || "Failed to sign up",
        };
        return { data: null, error: authError };
      }
    },
  },
  signOut: async () => {
    try {
      await signOut(firebaseAuth);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("bearer_token");
      }
      return { error: null as AuthError | null };
    } catch (error: any) {
      const authError: AuthError = {
        code: error?.code || "AUTH_SIGN_OUT_ERROR",
        message: error?.message || "Failed to sign out",
      };
      return { error: authError };
    }
  },
};

type UseSessionResult = {
  data: Session | null;
  isPending: boolean;
  isRefetching: boolean;
  error: any;
  refetch: () => void;
};

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<any>(null);

  const syncFromCurrentUser = async () => {
    try {
      const user = firebaseAuth.currentUser;
      await storeIdToken(user);
      setSession(mapFirebaseUserToSession(user));
      setError(null);
    } catch (err) {
      setError(err);
      setSession(null);
    } finally {
      setIsPending(false);
      setIsRefetching(false);
    }
  };

  const refetch = () => {
    setIsRefetching(true);
    setError(null);
    syncFromCurrentUser();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      try {
        await storeIdToken(user);
        setSession(mapFirebaseUserToSession(user));
        setError(null);
      } catch (err) {
        setError(err);
        setSession(null);
      } finally {
        setIsPending(false);
        setIsRefetching(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { data: session, isPending, isRefetching, error, refetch };
}