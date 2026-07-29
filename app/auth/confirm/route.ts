import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase";

const allowedTypes = new Set<EmailOtpType>(["magiclink"]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type || !allowedTypes.has(type)) {
    return NextResponse.redirect(
      new URL("/login?error=Invalid%20or%20expired%20sign-in%20link.", url),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=Invalid%20or%20expired%20sign-in%20link.", url),
    );
  }

  return NextResponse.redirect(new URL("/", url));
}
