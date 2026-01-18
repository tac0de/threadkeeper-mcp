#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

type NoteEntry = {
  id: string;
  timestamp: string;
  text: string;
  file?: string;
  kind?: string;
};

const DEFAULT_STORE_PATH = path.join(os.homedir(), ".threadkeeper", "notes.jsonl");

function resolveStorePath(): string {
  const override = process.env.THREADKEEPER_STORE_PATH;
  if (!override) return DEFAULT_STORE_PATH;
  return path.resolve(override);
}

async function ensureStoreDir(storePath: string): Promise<void> {
  await fs.mkdir(path.dirname(storePath), { recursive: true, mode: 0o700 });
}

async function loadEntries(storePath: string): Promise<NoteEntry[]> {
  let text: string;
  try {
    text = await fs.readFile(storePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const lines = text.split(/\r?\n/);
  const entries: NoteEntry[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === "") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`Invalid note store format at line ${i + 1}.`);
    }
    if (!isNoteEntry(parsed)) {
      throw new Error(`Invalid note entry at line ${i + 1}.`);
    }
    entries.push(parsed);
  }
  return entries;
}

function isNoteEntry(value: unknown): value is NoteEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string") return false;
  if (typeof record.timestamp !== "string") return false;
  if (typeof record.text !== "string") return false;
  if (typeof record.file !== "undefined" && typeof record.file !== "string") return false;
  if (typeof record.kind !== "undefined" && typeof record.kind !== "string") return false;
  return true;
}

async function appendEntry(storePath: string, entry: NoteEntry): Promise<void> {
  await ensureStoreDir(storePath);
  await fs.appendFile(storePath, `${JSON.stringify(entry)}\n`, "utf8");
}

function makeEntry(params: {
  text: string;
  file?: string;
  timestamp?: string;
  kind?: string;
}): NoteEntry {
  const { text, file, timestamp, kind } = params;
  return {
    id: crypto.randomUUID(),
    timestamp: timestamp ?? new Date().toISOString(),
    text,
    file,
    kind
  };
}

function formatEntry(entry: NoteEntry): string {
  const lines: string[] = [`id: ${entry.id}`, `timestamp: ${entry.timestamp}`];
  if (entry.kind) {
    lines.push(`kind: ${entry.kind}`);
  }
  if (entry.file) {
    lines.push(`file: ${entry.file}`);
  }
  lines.push("text:");
  lines.push(entry.text);
  return lines.join("\n");
}

function formatEntries(entries: NoteEntry[], emptyMessage: string): string {
  if (entries.length === 0) return emptyMessage;
  return entries.map(formatEntry).join("\n\n");
}

async function readPackageInfo(): Promise<{ name: string; version: string }> {
  const packageRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
  const packageJsonPath = path.join(packageRoot, "package.json");
  try {
    const raw = await fs.readFile(packageJsonPath, "utf8");
    const data = JSON.parse(raw) as { name?: string; version?: string };
    return {
      name: data.name || "threadkeeper-mcp",
      version: data.version || "0.0.0"
    };
  } catch {
    return { name: "threadkeeper-mcp", version: "0.0.0" };
  }
}

async function readContract(): Promise<string | undefined> {
  const packageRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
  const contractPath = path.join(packageRoot, "AGENTS.md");
  try {
    return await fs.readFile(contractPath, "utf8");
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const { name, version } = await readPackageInfo();
  const instructions = await readContract();

  const server = new McpServer(
    { name, version },
    instructions ? { instructions } : undefined
  );

  const storePath = resolveStorePath();

  server.tool(
    "notes.store",
    "Store a user-approved note verbatim. Append-only.",
    {
      text: z.string(),
      approved: z.boolean(),
      file: z.string().optional(),
      timestamp: z.string().optional(),
      kind: z.string().optional()
    },
    async ({ text, approved, file, timestamp, kind }) => {
      if (!approved) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Refusing to store unapproved text. Ask the user to confirm verbatim text before storing."
            }
          ]
        };
      }

      const entry = makeEntry({ text, file, timestamp, kind });
      await appendEntry(storePath, entry);

      return { content: [{ type: "text", text: `Stored note ${entry.id}.` }] };
    }
  );

  server.tool(
    "notes.list",
    "List all stored notes in order, without summarizing.",
    async () => {
      const entries = await loadEntries(storePath);
      return {
        content: [{ type: "text", text: formatEntries(entries, "No notes stored.") }]
      };
    }
  );

  server.tool(
    "notes.list_kind",
    "List stored notes with an exact kind match.",
    { kind: z.string() },
    async ({ kind }) => {
      const entries = await loadEntries(storePath);
      const matches = entries.filter((entry) => entry.kind === kind);
      return {
        content: [
          {
            type: "text",
            text: formatEntries(matches, `No notes found for kind ${kind}.`)
          }
        ]
      };
    }
  );

  server.tool(
    "notes.get",
    "Return a single note by id.",
    { id: z.string() },
    async ({ id }) => {
      const entries = await loadEntries(storePath);
      const entry = entries.find((item) => item.id === id);
      if (!entry) {
        return {
          isError: true,
          content: [{ type: "text", text: `No note found for id ${id}.` }]
        };
      }
      return { content: [{ type: "text", text: formatEntry(entry) }] };
    }
  );

  server.tool(
    "notes.find",
    "Return notes whose text contains the exact substring (case-sensitive).",
    { contains: z.string() },
    async ({ contains }) => {
      const entries = await loadEntries(storePath);
      const matches = entries.filter((entry) => entry.text.includes(contains));
      return {
        content: [
          {
            type: "text",
            text: formatEntries(matches, "No notes matched the exact substring.")
          }
        ]
      };
    }
  );

  server.tool(
    "teach.request",
    "Record a user-approved teaching request verbatim.",
    {
      question: z.string(),
      approved: z.boolean(),
      file: z.string().optional(),
      timestamp: z.string().optional()
    },
    async ({ question, approved, file, timestamp }) => {
      if (!approved) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Refusing to store unapproved text. Ask the user to confirm verbatim text before storing."
            }
          ]
        };
      }

      const entry = makeEntry({
        text: question,
        file,
        timestamp,
        kind: "teach.request"
      });
      await appendEntry(storePath, entry);

      return { content: [{ type: "text", text: formatEntry(entry) }] };
    }
  );

  server.tool(
    "teach.note",
    "Store a user-approved teaching note verbatim.",
    {
      text: z.string(),
      approved: z.boolean(),
      file: z.string().optional(),
      timestamp: z.string().optional()
    },
    async ({ text, approved, file, timestamp }) => {
      if (!approved) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Refusing to store unapproved text. Ask the user to confirm verbatim text before storing."
            }
          ]
        };
      }

      const entry = makeEntry({
        text,
        file,
        timestamp,
        kind: "teach.note"
      });
      await appendEntry(storePath, entry);

      return { content: [{ type: "text", text: formatEntry(entry) }] };
    }
  );

  server.tool(
    "questions.ask",
    "Return the provided question verbatim so the agent can ask the user.",
    { question: z.string() },
    async ({ question }) => {
      return { content: [{ type: "text", text: question }] };
    }
  );

  server.tool(
    "teach.ask",
    "Return the provided teaching question verbatim.",
    { question: z.string() },
    async ({ question }) => {
      return { content: [{ type: "text", text: question }] };
    }
  );

  server.prompt(
    "teach.scope",
    "Prompt to clarify a teaching request before explaining.",
    { topic: z.string().optional() },
    ({ topic }, _extra) => {
      const lead = topic ? `You asked about ${topic}.` : "You asked for teaching.";
      const text = [
        lead,
        "",
        "Before I explain, please confirm:",
        "- The specific file(s) or snippet to focus on",
        "- What you want to understand (behavior, structure, or intent)",
        "- Desired depth (overview or line-by-line)",
        "- Whether you want suggested changes or just explanation"
      ].join("\n");
      return {
        description: "Teaching scope questions",
        messages: [
          {
            role: "assistant",
            content: { type: "text", text }
          }
        ]
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
