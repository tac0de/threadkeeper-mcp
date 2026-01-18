# Custom MCP Developer Agent Instructions

## Your Role

You are implementing a **Custom MCP server**, not a general-purpose assistant.

This MCP exists to _constrain_ agent behavior while supporting clear teaching.

Your job is to encode **cognitive restraint** into protocol, capability design,
and defaults while enabling explanation and learning.

If the resulting MCP feels powerful, fast, or impressive,
you are likely doing it wrong.

---

## Core Product Philosophy (Non-Negotiable)

This MCP is designed to:

- Preserve the user's reasoning over time
- Prevent loss of design intent
- Block premature automation
- Provide careful teaching on request

This MCP is **intentionally uncomfortable**.

---

## Absolute Design Constraints

When implementing this MCP, you MUST NOT:

### ❌ Enable code generation pathways

- Do not expose tools that return code blocks
- Do not provide structured outputs that resemble implementations
- Do not include helpers that “fill in” logic, TODOs, or stubs

### ✅ Teaching Allowed (On Request)

This MCP MAY:

- Explain code behavior in plain language
- Outline architecture and system structure
- Answer “what does this do” questions
- Suggest changes when the user explicitly asks

Teaching must be grounded in the user’s provided code or context and must
avoid assuming intent or goals not stated by the user.

### ❌ Encode best-practice knowledge

- No pattern detection
- No static analysis advice
- No refactoring hints unless explicitly requested
- No optimization suggestions unless explicitly requested

If a feature could be interpreted as “helpful guidance” without a direct user
request, it is probably forbidden.

---

## Tooling and Capability Rules

### Allowed MCP Capabilities

You MAY implement tools that:

- Ask the user reflective questions
- Request explanations in free-form text
- Store and retrieve **verbatim user-authored notes**
- Attach timestamps or file references to user statements
- Surface _previous user explanations_ relevant to the current context
- Provide explanations when the user explicitly asks

### Forbidden MCP Capabilities

You MUST NOT implement tools that:

- Transform user text into summaries unless explicitly requested
- Rephrase, clean up, or improve wording unless explicitly requested
- Rank, score, or judge user decisions
- Compare user code against external standards
- Infer intent not explicitly stated by the user

The MCP must never “know better” than the user.

---

## Memory Model Requirements

Memory is not knowledge.
Memory is **externalized user thought**.

Implementation rules:

- Store only text explicitly written or approved by the user
- Preserve original wording exactly
- Never overwrite or merge entries
- Do not normalize, deduplicate, or compress memories
- Treat ambiguity as valuable signal, not noise

If you feel tempted to “organize” memory automatically, stop.

---

## Agent Interaction Contract

Any agent using this MCP MUST be forced into the following posture:

- Ask questions when the user’s intent is unclear
- Provide explanations only when asked
- Reflect user language where possible
- Slow the interaction rather than accelerating it

Your MCP implementation should make **incorrect usage annoying** and
**correct usage frictionless**.

---

## Default Failure Modes to Guard Against

You must actively design against these outcomes:

- The agent explains without being asked
- The agent summarizes instead of quoting
- The agent proposes instead of reflecting unless explicitly requested
- The agent feels like a senior reviewer
- The agent produces confidence the user did not earn

If any of the above feels possible, add friction or remove the capability.

---

## Packaging and Distribution Expectations

This MCP will be distributed as:

- An npm package
- Configurable via `npx` and stdio
- Using the `modelcontextprotocol` npm library

Design the interface so that:

- Minimal configuration is required
- Unsafe defaults are impossible
- The philosophy survives copy-paste usage

---

## Success Criterion

This MCP is successful if:

- Users say it feels “slow but clarifying”
- Users return after days or weeks and regain context quickly
- Users remain the clear author of every idea
- The agent feels less impressive than a normal coding assistant

If the MCP feels smart,
it has failed its purpose.

---

End of developer instructions.
