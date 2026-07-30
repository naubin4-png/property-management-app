const allowedPathnames = [
  /^\/$/,
  /^\/admin$/,
  /^\/email$/,
  /^\/properties\/new$/,
  /^\/properties\/[0-9a-f-]+(?:\/leases\/(?:new|[0-9a-f-]+\/edit))?$/i,
];

export function safeAppDestination(candidate: string | null | undefined) {
  if (!candidate?.startsWith("/") || candidate.startsWith("//")) {
    return "/";
  }

  const destination = new URL(candidate, "https://property-manager.local");
  if (!allowedPathnames.some((pattern) => pattern.test(destination.pathname))) {
    return "/";
  }

  return `${destination.pathname}${destination.search}`;
}
