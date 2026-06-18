import { AuthForm } from "../components/AuthForm";
import { TodoList } from "../components/TodoList";
import { useAuth } from "../auth/AuthProvider";

export function HomePage() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <main className="page">
        <p className="muted">Loading session...</p>
      </main>
    );
  }

  return (
    <main className="page">{session ? <TodoList /> : <AuthForm />}</main>
  );
}
