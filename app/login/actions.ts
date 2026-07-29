"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase";

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

export async function signInWithGoogle() {
  const supabase = await createSupabaseServerClient();
  const headerStore = await headers();
  const origin = approvedOrigin(headerStore.get("origin"));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/`,
    },
  });

  if (error || !data.url) {
    loginError(error?.message ?? "Unable to start Google sign-in.");
  }

  redirect(data.url);
}
