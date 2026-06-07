import { NextRequest } from "next/server";

export function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  return Boolean(secret && authorization === `Bearer ${secret}` && isVercelCron);
}
