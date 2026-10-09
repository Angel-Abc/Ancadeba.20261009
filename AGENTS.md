# Agents Guide

## Code Design Guidelines
- Use single quotes for all strings.
- Omit semicolons at the end of statements.
- Adhere to SOLID principles.
- Prefer dependency injection over global singletons.
- Emphasize single responsibility for classes/modules.

## Agent Development Instances
- Reserve ports 5173 (engine), 5174 (editor UI), and 3000 (editor server) for the user's `pnpm dev` instances in VS Code.
- Start agent-owned instances on separate free ports, such as 5273, 5274, and 3100. Override React ports with `--port` and the server port with the `PORT` environment variable.
- Set `EDITOR_API_TARGET` for the agent's editor UI to its own server URL, such as `http://127.0.0.1:3100`.
- Scope environment overrides to agent-owned processes. Do not change default ports or write shared `.env` files for temporary instances.
- Never stop or restart the user's development processes. Clean up only processes started by the agent.

## Required Checks
Before marking any code task as complete, ensure the following commands are run and pass:
- pnpm lint
- pnpm test
- pnpm build
