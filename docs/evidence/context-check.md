# `/context` check (D9), 2026-10-30

Run in the Claude Code VS Code extension, in this repo, on model `claude-opus-5-5`:

- Total: 131.4k / 1.0M tokens (13%)
- **Memory files: `~/projects/dbs-a5/AGENTS.md`, 1.5k tokens** (loaded as the project context file)
- Messages 112.4k, system tools 7.5k, skills 4.6k, system prompt 3.5k, MCP server instructions 1.8k, autocompact buffer 33.0k, free 835.6k

There is no `CLAUDE.md` in the repo; `AGENTS.md` is the only context file.

The screenshot is not committed: the terminal under the dialog showed `.env.local`, including the Clerk secret key.
