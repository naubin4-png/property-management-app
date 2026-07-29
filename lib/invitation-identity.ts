export function normalizeInvitationEmail(email: string) {
  return email.trim().normalize("NFKC").toLowerCase();
}

export function isVerifiedGoogleUser(user: {
  email?: string;
  email_confirmed_at?: string;
  app_metadata?: { provider?: string; providers?: string[] };
}) {
  const providers = new Set([
    user.app_metadata?.provider,
    ...(user.app_metadata?.providers ?? []),
  ]);
  return Boolean(
    user.email &&
      user.email_confirmed_at &&
      providers.has("google"),
  );
}
