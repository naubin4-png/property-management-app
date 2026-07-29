import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase";
import { redeemWorkspaceInvitation } from "@/lib/invitations";

const approvedDestinations = new Set(["/", "/email", "/admin"]);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/";
  const next = approvedDestinations.has(requestedNext) ? requestedNext : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "Session expired.");
      return NextResponse.redirect(loginUrl);
    }

    const redemption = await redeemWorkspaceInvitation(user);
    if (!redemption.redeemed && redemption.reason !== "already_member") {
      return NextResponse.redirect(
        new URL("/invitation-required", request.url),
      );
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
