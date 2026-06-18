import { type FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

type Mode = "sign-in" | "sign-up";

type AuthFormProps = {
  title?: string;
  subtitle?: string;
};

export function AuthForm({
  title = "To-Do App",
  subtitle,
}: AuthFormProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resolvedSubtitle =
    subtitle ??
    (mode === "sign-in"
      ? "Sign in to manage your tasks"
      : "Create an account");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const message =
      mode === "sign-in"
        ? await signIn(email, password)
        : await signUp(email, password);

    if (message) {
      setError(message);
    }

    setSubmitting(false);
  }

  return (
    <div className="auth-card">
      <h1>{title}</h1>
      <p className="subtitle">{resolvedSubtitle}</p>

      <form className="stack" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" disabled={submitting}>
          {submitting
            ? "Please wait..."
            : mode === "sign-in"
              ? "Sign in"
              : "Sign up"}
        </button>
      </form>

      <button
        type="button"
        className="link-button"
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError(null);
        }}
      >
        {mode === "sign-in"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
