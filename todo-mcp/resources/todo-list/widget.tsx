import {
  McpUseProvider,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useEffect, useState } from "react";
import "../styles.css";
import { propSchema, type Todo, type TodoListProps } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description:
    "Interactive list of the signed-in user's todos, with create / complete / delete actions",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Loading your todos...",
    invoked: "Todos loaded",
  },
};

type ToolResult = { structuredContent?: { todo?: Todo } } | undefined;

const TodoList: React.FC = () => {
  const { props, isPending } = useWidget<TodoListProps>();

  const { callTool: createTodo, isPending: isCreating } =
    useCallTool("create-todo");
  const { callTool: completeTodo } = useCallTool("complete-todo");
  const { callTool: deleteTodo } = useCallTool("delete-todo");

  // Local copy of the list so create/complete/delete update the UI instantly.
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Seed / re-seed from the tool result whenever the widget reloads.
  useEffect(() => {
    if (!isPending && props?.todos) setTodos(props.todos);
  }, [isPending, props?.todos]);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="bg-surface-elevated border border-default rounded-3xl p-8">
          <h2 className="heading-xl mb-3">Your Todos</h2>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 rounded-xl bg-default/10 animate-pulse"
              />
            ))}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const completedCount = todos.filter((t) => t.completed).length;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || isCreating) return;
    createTodo(
      { title },
      {
        onSuccess: (result: ToolResult) => {
          const created = result?.structuredContent?.todo;
          if (created) setTodos((prev) => [created, ...prev]);
          setNewTitle("");
        },
        onError: () => alert("Failed to create todo"),
      }
    );
  };

  const handleToggle = (todo: Todo) => {
    const completed = !todo.completed;
    // optimistic
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed } : t))
    );
    setBusyId(todo.id);
    completeTodo(
      { id: todo.id, completed },
      {
        onSuccess: (result: ToolResult) => {
          const updated = result?.structuredContent?.todo;
          if (updated)
            setTodos((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
        },
        onError: () => {
          // revert on failure
          setTodos((prev) =>
            prev.map((t) =>
              t.id === todo.id ? { ...t, completed: todo.completed } : t
            )
          );
          alert("Failed to update todo");
        },
        onSettled: () => setBusyId(null),
      }
    );
  };

  const handleDelete = (todo: Todo) => {
    setBusyId(todo.id);
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => t.id !== todo.id)); // optimistic
    deleteTodo(
      { id: todo.id },
      {
        onError: () => {
          setTodos(snapshot); // revert
          alert("Failed to delete todo");
        },
        onSettled: () => setBusyId(null),
      }
    );
  };

  return (
    <McpUseProvider autoSize>
      <div className="bg-surface-elevated border border-default rounded-3xl p-8">
        {/* Header */}
        <div className="mb-5">
          <h5 className="text-secondary mb-1">My list</h5>
          <h2 className="heading-xl">Your Todos</h2>
          <p className="text-sm text-secondary mt-1">
            {completedCount}/{todos.length} completed
          </p>
        </div>

        {/* Create form */}
        <form onSubmit={handleCreate} className="flex gap-2 mb-5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a todo…"
            disabled={isCreating}
            className="flex-1 px-3 py-2 rounded-xl border border-default bg-surface text-default placeholder:text-secondary/60 outline-none focus:border-info"
          />
          <button
            type="submit"
            disabled={isCreating || !newTitle.trim()}
            className="px-4 py-2 rounded-xl bg-info text-white font-medium disabled:opacity-50 cursor-pointer"
          >
            {isCreating ? "Adding…" : "Add"}
          </button>
        </form>

        {/* List */}
        {todos.length === 0 ? (
          <p className="text-center text-secondary py-10">
            No todos yet. Add one above!
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todos.map((todo) => {
              const busy = busyId === todo.id;
              return (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-default bg-surface"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    disabled={busy}
                    onChange={() => handleToggle(todo)}
                    className="w-4 h-4 cursor-pointer accent-info"
                  />
                  <span
                    className={`flex-1 text-default ${
                      todo.completed ? "line-through opacity-60" : ""
                    }`}
                  >
                    {todo.title}
                  </span>
                  <button
                    onClick={() => handleDelete(todo)}
                    disabled={busy}
                    title="Delete"
                    className="px-2.5 py-1 rounded-lg text-danger hover:bg-danger/10 disabled:opacity-50 cursor-pointer text-sm"
                  >
                    {busy ? "…" : "Delete"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </McpUseProvider>
  );
};

export default TodoList;
