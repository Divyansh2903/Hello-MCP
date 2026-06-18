type StatusCardProps = {
  title?: string;
  message: string;
  variant?: "error" | "muted";
};

export function StatusCard({
  title,
  message,
  variant = "muted",
}: StatusCardProps) {
  return (
    <div className="auth-card">
      {title ? <h1>{title}</h1> : null}
      <p className={variant === "error" ? "error" : "muted"}>{message}</p>
    </div>
  );
}
