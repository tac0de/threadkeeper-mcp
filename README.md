# Threadkeeper MCP

Threadkeeper is a local MCP server that preserves user reasoning by storing only verbatim, user-approved notes and teaching on request. It is intentionally slow and restrictive: it asks questions, reflects user language, and avoids unrequested summarization, suggestions, or judgment.

## What This Server Does

- Stores user-approved text exactly as given (append-only).
- Returns stored notes without rewriting or summarizing.
- Echoes user-provided questions verbatim for reflective prompts.
- Explains code or outlines architecture when explicitly asked.
- Suggests changes only when explicitly requested.

## What This Server Refuses To Do

- Generate code or fill in logic.
- Summarize, rephrase, or clean up user text unless explicitly requested.
- Judge decisions, rank options, or compare against external standards.

## MCP Client Config

Add a server entry to your MCP client config (for example, `.mcp.json`):

```json
{
  "mcpServers": {
    "threadkeeper": {
      "command": "npx",
      "args": ["-y", "@tac0de/threadkeeper-mcp"]
    }
  }
}
```

## Tools

- `notes.store`: Store a verbatim note. Requires `approved: true`. Optional `file`, `timestamp`, and `kind`.
- `notes.list`: List all notes in insertion order.
- `notes.list_kind`: List notes with an exact `kind` match.
- `notes.get`: Retrieve a note by `id`.
- `notes.find`: Exact substring match over note text (case-sensitive).
- `teach.request`: Store a user-approved teaching request verbatim.
- `teach.note`: Store a user-approved teaching note verbatim.
- `questions.ask`: Return the provided question verbatim.
- `teach.ask`: Return the provided teaching question verbatim.

## Prompts

- `teach.scope`: Ask for scope and desired depth before teaching.

## Storage

Notes are stored locally as append-only JSON Lines in:

```
~/.threadkeeper/notes.jsonl
```

Entries may include an optional `kind` field (for example, `teach.request`).

Override the path with `THREADKEEPER_STORE_PATH`.

## Instructions Contract

The server exposes the agent contract in `AGENTS.md` and uses it as MCP server instructions, including teaching on request.

## Requirements

- Node.js >= 18
- Uses `@modelcontextprotocol/sdk` for the MCP server runtime.
