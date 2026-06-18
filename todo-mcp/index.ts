import {
  MCPServer,
  oauthSupabaseProvider,
  error,
  object,
  text,
  widget,
} from "mcp-use/server";
import { z } from "zod";

/**
 * Backend API base URL (no trailing slash).
 * The MCP server acts as a CLIENT of this backend, forwarding the signed-in
 * user's Supabase access token as a Bearer credential on every request.
 */
const TODO_API_URL = (
  process.env.TODO_API_URL || "http://localhost:8787"
).replace(/\/+$/, "");

const server = new MCPServer({
  name: "todo-mcp",
  title: "Todo", // display name
  version: "1.0.0",
  description:
    "Manage your personal todo list. Sign in with Supabase to list, create, complete, and delete your todos.",
  instructions:
    "This server manages the signed-in user's personal todos. Use list-todos to show the user's todos in an interactive widget. Use create-todo to add a todo, complete-todo to mark one done (or undone), and delete-todo to remove one. Identity comes from the authenticated session — never ask the user for a user id.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],

  // ── ROLE 1: OAuth resource server ──────────────────────────────────────
  // Reads MCP_USE_OAUTH_SUPABASE_PROJECT_ID. Sets up /.well-known/* discovery,
  // gates protocol traffic on /mcp with bearer auth, and populates ctx.auth.
  oauth: oauthSupabaseProvider(),

  // Browser GET /mcp shows the install/landing page (200) without a token;
  // MCP protocol POST/SSE traffic stays gated (401) until a token is presented.
  publicLandingPage: true,
});

// ── Shared types ──────────────────────────────────────────────────────────
const todoSchema = z.object({
  id: z.string().describe("Todo id (uuid)"),
  userId: z.string().describe("Owner's Supabase user id"),
  title: z.string().describe("Todo title"),
  completed: z.boolean().describe("Whether the todo is completed"),
  createdAt: z.string().describe("ISO-8601 creation timestamp"),
  updatedAt: z.string().describe("ISO-8601 last-updated timestamp"),
});
type Todo = z.infer<typeof todoSchema>;

// ── ROLE 2: client of the backend ──────────────────────────────────────────
// Attach the user's access token ONLY at the fetch boundary. Never log it,
// never pass it into widget props.
function bearer(ctx: { auth: { accessToken: string } }) {
  return { Authorization: `Bearer ${ctx.auth.accessToken}` };
}

// Extract a useful message from the backend's `{ "error": "message" }` shape.
async function backendError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) return body.error;
  } catch {
    // no JSON body (e.g. 204) — fall through
  }
  return `${fallback} (HTTP ${res.status}).`;
}

server.tool(
  {
    name: "list-todos",
    description:
      "List the signed-in user's todos (newest first) in an interactive widget.",
    schema: z.object({}),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true, // hits an external HTTP API
    },
    widget: {
      name: "todo-list",
      invoking: "Loading your todos...",
      invoked: "Todos loaded",
    },
  },
  async (_args, ctx) => {
    const res = await fetch(`${TODO_API_URL}/todos`, {
      headers: { ...bearer(ctx) },
    });
    if (res.status === 401)
      return error("Not authorized. Please sign in again.");
    if (!res.ok) return error(await backendError(res, "Failed to load todos"));

    const { todos = [] } = (await res.json()) as { todos?: Todo[] };
    const completedCount = todos.filter((t) => t.completed).length;

    return widget({
      props: { todos, totalCount: todos.length, completedCount },
      output: text(
        `You have ${todos.length} todo(s), ${completedCount} completed.`
      ),
    });
  }
);

server.tool(
  {
    name: "create-todo",
    description: "Create a new todo for the signed-in user.",
    schema: z.object({
      title: z.string().min(1).describe('The todo text, e.g. "Buy milk"'),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    outputSchema: z.object({ todo: todoSchema }),
  },
  async ({ title }, ctx) => {
    const res = await fetch(`${TODO_API_URL}/todos`, {
      method: "POST",
      headers: { ...bearer(ctx), "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.status === 401)
      return error("Not authorized. Please sign in again.");
    if (!res.ok) return error(await backendError(res, "Failed to create todo"));

    const todo = (await res.json()) as Todo;
    return object({ todo });
  }
);

server.tool(
  {
    name: "complete-todo",
    description:
      "Mark a todo as completed (or back to incomplete). Pass the todo id and the desired completed state.",
    schema: z.object({
      id: z.string().describe("The id of the todo to update"),
      completed: z
        .boolean()
        .default(true)
        .describe("New completion state (true = done, false = not done)"),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    outputSchema: z.object({ todo: todoSchema }),
  },
  async ({ id, completed }, ctx) => {
    const res = await fetch(`${TODO_API_URL}/todos/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...bearer(ctx), "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (res.status === 401)
      return error("Not authorized. Please sign in again.");
    if (res.status === 404) return error(`Todo not found: ${id}`);
    if (!res.ok) return error(await backendError(res, "Failed to update todo"));

    const todo = (await res.json()) as Todo;
    return object({ todo });
  }
);

server.tool(
  {
    name: "delete-todo",
    description: "Delete one of the signed-in user's todos.",
    schema: z.object({
      id: z.string().describe("The id of the todo to delete"),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true, // removes user data
      openWorldHint: true,
    },
  },
  async ({ id }, ctx) => {
    const res = await fetch(`${TODO_API_URL}/todos/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { ...bearer(ctx) },
    });
    if (res.status === 401)
      return error("Not authorized. Please sign in again.");
    if (res.status === 404) return error(`Todo not found: ${id}`);
    if (!res.ok) return error(await backendError(res, "Failed to delete todo"));

    return text(`Deleted todo ${id}.`);
  }
);

server.listen().then(() => {
  console.log(`Server running`);
});
