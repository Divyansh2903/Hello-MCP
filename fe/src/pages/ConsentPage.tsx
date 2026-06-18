import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AuthForm } from "../components/AuthForm";
import { StatusCard } from "../components/StatusCard";
import { supabase } from "../lib/supabase";
import {
  clearOAuthAuthorizationCache,
  deliverOAuthRedirect,
  formatOAuthError,
  formatScope,
  getOAuthRedirectUrl,
  isAuthorizationDetails,
  isOAuthRedirect,
  loadOAuthAuthorization,
  logOAuthRedirect,
  parseScopes,
  type OAuthAuthorizationDetails,
} from "../lib/oauth";

type ConsentState =
  | { kind: "missing-id" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "consent"; details: OAuthAuthorizationDetails }
  | { kind: "processing"; action: "allow" | "deny" }
  | {
      kind: "complete";
      action: "allow" | "deny";
      redirectUrl: string;
      delivery: "iframe" | "navigate";
    };

function finishConsent(
  action: "allow" | "deny",
  redirectUrl: string,
  response: unknown,
  authorizationId: string,
): ConsentState {
  logOAuthRedirect(action === "allow" ? "approve" : "deny", redirectUrl, response);
  clearOAuthAuthorizationCache(authorizationId);
  const delivery = deliverOAuthRedirect(redirectUrl);
  return { kind: "complete", action, redirectUrl, delivery };
}

export function ConsentPage() {
  const [searchParams] = useSearchParams();
  const authorizationId = searchParams.get("authorization_id");
  const { session, user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ConsentState>({ kind: "loading" });

  const completeRedirect = useCallback(
    (action: "allow" | "deny", redirectUrl: string, response: unknown) => {
      if (!authorizationId) {
        return;
      }

      setState(finishConsent(action, redirectUrl, response, authorizationId));
    },
    [authorizationId],
  );

  const loadAuthorization = useCallback(async () => {
    if (!authorizationId) {
      setState({ kind: "missing-id" });
      return;
    }

    if (!session) {
      return;
    }

    setState({ kind: "loading" });

    try {
      const data = await loadOAuthAuthorization(authorizationId);

      if (isOAuthRedirect(data)) {
        logOAuthRedirect("auto", data.redirect_url, data);
        clearOAuthAuthorizationCache(authorizationId);
        const delivery = deliverOAuthRedirect(data.redirect_url);
        setState({
          kind: "complete",
          action: "allow",
          redirectUrl: data.redirect_url,
          delivery,
        });
        return;
      }

      if (isAuthorizationDetails(data)) {
        setState({ kind: "consent", details: data });
        return;
      }

      setState({
        kind: "error",
        message: "Unexpected authorization response.",
      });
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? formatOAuthError(loadError.message)
          : "Failed to load authorization request.";

      setState({ kind: "error", message });
    }
  }, [authorizationId, session]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!authorizationId) {
      setState({ kind: "missing-id" });
      return;
    }

    if (!session) {
      return;
    }

    void loadAuthorization();
  }, [authLoading, authorizationId, loadAuthorization, session]);

  async function handleAllow() {
    if (!authorizationId) {
      return;
    }

    setState({ kind: "processing", action: "allow" });

    const { data, error } = await supabase.auth.oauth.approveAuthorization(
      authorizationId,
      { skipBrowserRedirect: true },
    );

    if (error) {
      setState({
        kind: "error",
        message: formatOAuthError(error.message),
      });
      return;
    }

    const redirectUrl = getOAuthRedirectUrl(data);
    if (!redirectUrl) {
      setState({
        kind: "error",
        message: "Authorization succeeded but no redirect URL was returned.",
      });
      return;
    }

    completeRedirect("allow", redirectUrl, data);
  }

  async function handleDeny() {
    if (!authorizationId) {
      return;
    }

    setState({ kind: "processing", action: "deny" });

    const { data, error } = await supabase.auth.oauth.denyAuthorization(
      authorizationId,
      { skipBrowserRedirect: true },
    );

    if (error) {
      setState({
        kind: "error",
        message: formatOAuthError(error.message),
      });
      return;
    }

    const redirectUrl = getOAuthRedirectUrl(data);
    if (!redirectUrl) {
      setState({
        kind: "error",
        message: "Authorization was denied but no redirect URL was returned.",
      });
      return;
    }

    completeRedirect("deny", redirectUrl, data);
  }

  if (!authorizationId || state.kind === "missing-id") {
    return (
      <main className="page">
        <StatusCard
          title="Authorization error"
          message="Missing authorization request."
          variant="error"
        />
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className="page">
        <StatusCard message="Loading session..." />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page">
        <AuthForm
          title="Sign in to continue"
          subtitle="Sign in to review and approve this application's access request."
        />
      </main>
    );
  }

  if (state.kind === "loading") {
    return (
      <main className="page">
        <StatusCard message="Loading authorization request..." />
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className="page">
        <StatusCard
          title="Authorization error"
          message={state.message}
          variant="error"
        />
      </main>
    );
  }

  if (state.kind === "processing") {
    return (
      <main className="page">
        <StatusCard
          message={
            state.action === "allow"
              ? "Approving access..."
              : "Denying access..."
          }
        />
      </main>
    );
  }

  if (state.kind === "complete") {
    const approved = state.action === "allow";

    return (
      <main className="page">
        <div className="auth-card">
          <h1>{approved ? "Access approved" : "Access denied"}</h1>
          <p className="subtitle">
            {approved
              ? "Return to your MCP client to continue."
              : "The application was not granted access."}
          </p>
          {state.delivery === "iframe" ? (
            <p className="muted">
              You can close this tab. The connection was sent back to your app.
            </p>
          ) : (
            <p className="muted">Redirecting you back to the application...</p>
          )}
          <a className="consent-link" href={state.redirectUrl}>
            Continue manually
          </a>
        </div>
      </main>
    );
  }

  const { details } = state;
  const scopes = parseScopes(details.scope);
  const email = user?.email ?? details.user.email;

  return (
    <main className="page">
      <div className="auth-card consent-card">
        <div className="consent-app">
          {details.client.logo_uri ? (
            <img
              className="consent-logo"
              src={details.client.logo_uri}
              alt=""
            />
          ) : null}
          <div>
            <h1>{details.client.name}</h1>
            {details.client.uri ? (
              <a
                className="consent-link"
                href={details.client.uri}
                target="_blank"
                rel="noreferrer"
              >
                {details.client.uri}
              </a>
            ) : null}
          </div>
        </div>

        <p className="subtitle">
          This application is requesting access to your account.
        </p>

        <p className="consent-user">
          Signed in as <strong>{email}</strong>
        </p>

        {scopes.length > 0 ? (
          <section className="consent-section">
            <h2>Requested permissions</h2>
            <ul className="consent-scopes">
              {scopes.map((scope) => (
                <li key={scope}>{formatScope(scope)}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="consent-section">
          <h2>Data access</h2>
          <p className="muted">
            This application is requesting access to information associated with
            your account.
          </p>
        </section>

        <section className="consent-notice">
          <h2>What this means</h2>
          <ul className="consent-scopes">
            <li>Access is limited to the permissions listed above.</li>
            <li>Your password is never shared with this application.</li>
            <li>
              Identity permissions are read-only and do not allow account
              changes.
            </li>
          </ul>
        </section>

        {details.client.uri ? (
          <p className="consent-links">
            <a href={details.client.uri} target="_blank" rel="noreferrer">
              Learn more
            </a>
          </p>
        ) : null}

        <div className="consent-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => void handleDeny()}
          >
            Deny
          </button>
          <button type="button" onClick={() => void handleAllow()}>
            Allow
          </button>
        </div>
      </div>
    </main>
  );
}
