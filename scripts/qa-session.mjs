#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const command = process.argv[2];
const rawSlot = process.argv[3] ?? "default";
const root = resolve(import.meta.dirname, "..");
const stateDirectory = resolve(root, ".qa");
const envPath = resolve(root, ".env.production.local");

if (!["create", "open", "cleanup"].includes(command)) {
  throw new Error(
    "Usage: node scripts/qa-session.mjs <create|open|cleanup> [slot|all]",
  );
}
if (
  rawSlot !== "all" &&
  (rawSlot.length > 32 || !/^[a-z0-9][a-z0-9-]*$/.test(rawSlot))
) {
  throw new Error("QA session slot must use lowercase letters, numbers, or hyphens.");
}
const statePathForSlot = (slot) =>
  resolve(
    stateDirectory,
    slot === "default" ? "session.json" : `session-${slot}.json`,
  );

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

async function openSession(state) {
  const { data: link, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: state.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://property-management-app-virid.vercel.app"}/`,
      },
    });
  if (linkError || !link.properties?.hashed_token) {
    throw new Error(linkError?.message ?? "Unable to create one-time QA link.");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://property-management-app-virid.vercel.app";
  const confirmUrl = new URL("/auth/confirm", appUrl);
  confirmUrl.searchParams.set("token_hash", link.properties.hashed_token);
  confirmUrl.searchParams.set("type", "magiclink");

  const opened = spawnSync("open", ["-a", "Google Chrome", confirmUrl.toString()], {
    stdio: "ignore",
  });
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
}

async function createSession(slot) {
  const statePath = statePathForSlot(slot);
  if (existsSync(statePath)) {
    throw new Error(
      `Temporary QA slot "${slot}" already exists. Run cleanup for that slot first.`,
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

    mkdirSync(dirname(statePath), { recursive: true, mode: 0o700 });
    writeFileSync(
      statePath,
      JSON.stringify({
        createdAt: new Date().toISOString(),
        email,
        userId: created.user.id,
        workspaceId,
      }),
      { mode: 0o600 },
    );
    chmodSync(statePath, 0o600);

    await openSession({ email });
    console.log(`Temporary QA slot "${slot}" created and opened.`);
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

async function reopenSession(slot) {
  const statePath = statePathForSlot(slot);
  if (!existsSync(statePath)) {
    throw new Error(`Temporary QA slot "${slot}" does not exist.`);
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  if (!state.email) {
    throw new Error(
      `Temporary QA slot "${slot}" predates named sessions. Clean it up and recreate it.`,
    );
  }
  await openSession(state);
  console.log(`Temporary QA slot "${slot}" reopened.`);
}

async function cleanupSession(slot) {
  const statePath = statePathForSlot(slot);
  if (!existsSync(statePath)) {
    console.log(`No temporary QA slot "${slot}" exists.`);
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
  console.log(`Temporary QA slot "${slot}" removed.`);
}

async function cleanupAllSessions() {
  if (!existsSync(stateDirectory)) {
    console.log("No temporary QA sessions exist.");
    return;
  }
  const stateFiles = readdirSync(stateDirectory).filter((name) =>
    /^session(?:-[a-z0-9-]+)?\.json$/.test(name),
  );
  for (const name of stateFiles) {
    const slot =
      name === "session.json"
        ? "default"
        : name.slice("session-".length, -".json".length);
    await cleanupSession(slot);
  }
}

try {
  if (command === "create") {
    if (rawSlot === "all") {
      throw new Error('The "all" slot is valid only for cleanup.');
    }
    await createSession(rawSlot);
  } else if (command === "open") {
    if (rawSlot === "all") {
      throw new Error('The "all" slot is valid only for cleanup.');
    }
    await reopenSession(rawSlot);
  } else if (rawSlot === "all") {
    await cleanupAllSessions();
  } else {
    await cleanupSession(rawSlot);
  }
} finally {
  await prisma.$disconnect();
}
