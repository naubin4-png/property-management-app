#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const command = process.argv[2];
const root = resolve(import.meta.dirname, "..");
const statePath = resolve(root, ".qa", "session.json");
const envPath = resolve(root, ".env.production.local");

if (!["create", "cleanup"].includes(command)) {
  throw new Error("Usage: node scripts/qa-session.mjs <create|cleanup>");
}

if (!existsSync(envPath)) {
  throw new Error(
    "Missing .env.production.local. Pull production environment variables into the isolated worktree first.",
  );
}

process.loadEnvFile(envPath);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl || !process.env.DATABASE_URL || !process.env.DIRECT_URL) {
  throw new Error("Required Supabase or database configuration is unavailable.");
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const rawKeys = execFileSync(
  "supabase",
  [
    "projects",
    "api-keys",
    "--project-ref",
    projectRef,
    "--reveal",
    "--output",
    "json",
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
);
const keyResponse = JSON.parse(rawKeys);
const keys = Array.isArray(keyResponse)
  ? keyResponse
  : keyResponse.api_keys ?? keyResponse.keys ?? [];
const serviceKey = keys.find((key) => key.name === "service_role")?.api_key;
if (!serviceKey) {
  throw new Error("Supabase service-role key is unavailable to the authenticated CLI.");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const prisma = new PrismaClient();

async function createSession() {
  if (existsSync(statePath)) {
    throw new Error(
      "A temporary QA session already exists. Run cleanup before creating another.",
    );
  }

  const suffix = randomUUID();
  const email = `property-manager-qa+${suffix}@example.invalid`;
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { purpose: "temporary-property-manager-qa" },
    });
  if (createError || !created.user) {
    throw new Error(createError?.message ?? "Unable to create temporary QA user.");
  }

  let workspaceId;
  try {
    const workspace = await prisma.workspace.create({
      data: {
        name: `Temporary QA ${suffix.slice(0, 8)}`,
        timezone: "America/New_York",
        memberships: {
          create: {
            userId: created.user.id,
            role: "OWNER",
          },
        },
        settings: {
          create: {
            replyToEmail: email,
            emailEnabled: false,
          },
        },
      },
      select: { id: true },
    });
    workspaceId = workspace.id;

    const { data: link, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://property-management-app-virid.vercel.app"}/`,
        },
      });
    if (linkError || !link.properties?.hashed_token) {
      throw new Error(linkError?.message ?? "Unable to create one-time QA link.");
    }

    mkdirSync(dirname(statePath), { recursive: true, mode: 0o700 });
    writeFileSync(
      statePath,
      JSON.stringify({
        createdAt: new Date().toISOString(),
        userId: created.user.id,
        workspaceId,
      }),
      { mode: 0o600 },
    );
    chmodSync(statePath, 0o600);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      "https://property-management-app-virid.vercel.app";
    const confirmUrl = new URL("/auth/confirm", appUrl);
    confirmUrl.searchParams.set("token_hash", link.properties.hashed_token);
    confirmUrl.searchParams.set("type", "magiclink");

    const opened = spawnSync(
      "open",
      ["-a", "Google Chrome", confirmUrl.toString()],
      {
        stdio: "ignore",
      },
    );
    if (opened.status !== 0) {
      throw new Error(
        "The one-time link was created but could not be opened. Run cleanup.",
      );
    }

    const browserCheck = spawnSync(
      "osascript",
      [
        "-e",
        `delay 12
tell application "Google Chrome"
  set unsafeCount to 0
  repeat with browserWindow in windows
    repeat with browserTab in tabs of browserWindow
      set tabUrl to URL of browserTab
      if tabUrl contains "#access_token=" or tabUrl contains "/auth/confirm?" then
        set URL of browserTab to "about:blank"
        set unsafeCount to unsafeCount + 1
      end if
    end repeat
  end repeat
  return unsafeCount
end tell`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const unsafeCount = Number.parseInt(browserCheck.stdout.trim(), 10);
    if (browserCheck.status !== 0 || unsafeCount !== 0) {
      throw new Error(
        "The one-time link did not reach a clean application URL. The unsafe tab was cleared; run cleanup.",
      );
    }
    console.log("Temporary QA session created and opened in the local browser.");
  } catch (error) {
    if (!existsSync(statePath)) {
      if (workspaceId) {
        await prisma.workspace.deleteMany({ where: { id: workspaceId } });
      }
      await supabase.auth.admin.deleteUser(created.user.id);
    }
    throw error;
  }
}

async function cleanupSession() {
  if (!existsSync(statePath)) {
    console.log("No temporary QA session exists.");
    return;
  }

  const state = JSON.parse(readFileSync(statePath, "utf8"));
  await prisma.workspace.deleteMany({ where: { id: state.workspaceId } });
  const { error } = await supabase.auth.admin.deleteUser(
    state.userId,
    true,
  );
  if (error && !error.message.toLowerCase().includes("not found")) {
    throw new Error(error.message);
  }
  rmSync(statePath);
  console.log("Temporary QA user, workspace, and local state removed.");
}

try {
  if (command === "create") {
    await createSession();
  } else {
    await cleanupSession();
  }
} finally {
  await prisma.$disconnect();
}
