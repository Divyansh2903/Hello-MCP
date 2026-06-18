import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { createTodo, deleteTodo, fetchTodos, updateTodo, type Todo } from "../lib/api";

export function TodoList() {
  const { user, session, signOut } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const accessToken = session?.access_token;

  const loadTodos = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextTodos = await fetchTodos(accessToken);
      setTodos(nextTodos);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load todos",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle || !accessToken) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await createTodo(accessToken, trimmedTitle);
      setTodos((current) => [created, ...current]);
      setTitle("");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create todo",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(todo: Todo) {
    if (!accessToken) {
      return;
    }

    setError(null);

    try {
      const updated = await updateTodo(accessToken, todo.id, !todo.completed);
      setTodos((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update todo",
      );
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) {
      return;
    }

    setError(null);

    try {
      await deleteTodo(accessToken, id);
      setTodos((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete todo",
      );
    }
  }

  return (
    <div className="todo-page">
      <header className="todo-header">
        <div>
          <h1>Your to-dos</h1>
          <p className="subtitle">{user?.email}</p>
        </div>
        <button type="button" className="secondary" onClick={() => void signOut()}>
          Log out
        </button>
      </header>

      <form className="todo-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Add a new to-do..."
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={submitting}
        />
        <button type="submit" disabled={submitting || !title.trim()}>
          Add
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p className="muted">Loading to-dos...</p>
      ) : todos.length === 0 ? (
        <p className="muted">No to-dos yet. Add your first one above.</p>
      ) : (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} className={todo.completed ? "completed" : ""}>
              <div className="todo-row">
                <label className="todo-check">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => void handleToggle(todo)}
                  />
                  <span>{todo.title}</span>
                </label>
                <button
                  type="button"
                  className="danger"
                  onClick={() => void handleDelete(todo.id)}
                  aria-label={`Delete ${todo.title}`}
                >
                  Delete
                </button>
              </div>
              <time dateTime={todo.createdAt}>
                {new Date(todo.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
