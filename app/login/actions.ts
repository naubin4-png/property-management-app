"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase";
import { safeAppDestination } from "@/lib/auth-redirect";

function loginError(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

function approvedOrigin(candidate: string | null) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const fallback = "http://localhost:3000";
  const deployment = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null;
  const allowed = new Set(
    [configured, deployment, fallback].filter(
      (value): value is string => Boolean(value),
    ),
  );
  return candidate && allowed.has(candidate) ? candidate : configured ?? fallback;
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const headerStore = await headers();
  const origin = approvedOrigin(headerStore.get("origin"));
  const next = safeAppDestination(formData.get("next")?.toString());
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    loginError(error?.message ?? "Unable to start Google sign-in.");
  }

  redirect(data.url);
}
