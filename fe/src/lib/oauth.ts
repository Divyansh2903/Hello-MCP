import { supabase } from "./supabase";

export type OAuthAuthorizationDetails = {
  authorization_id: string;
  redirect_uri: string;
  client: {
    id: string;
    name: string;
    uri: string;
    logo_uri: string;
  };
  user: {
    id: string;
    email: string;
  };
  scope: string;
};

export type OAuthRedirect = {
  redirect_url: string;
};

export function isOAuthRedirect(
  data: OAuthAuthorizationDetails | OAuthRedirect,
): data is OAuthRedirect {
  return "redirect_url" in data;
}

export function isAuthorizationDetails(
  data: OAuthAuthorizationDetails | OAuthRedirect,
): data is OAuthAuthorizationDetails {
  return "authorization_id" in data;
}

const SCOPE_LABELS: Record<string, string> = {
  openid: "Verify your identity",
  profile: "Read your basic profile",
  email: "Read your email address",
};

export function formatScope(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope;
}

export function parseScopes(scope: string): string[] {
  return scope.trim().split(/\s+/).filter(Boolean);
}

const authorizationResultCache = new Map<
  string,
  OAuthAuthorizationDetails | OAuthRedirect
>();
const authorizationRequestCache = new Map<
  string,
  Promise<OAuthAuthorizationDetails | OAuthRedirect>
>();

export function formatOAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("authorization not found")) {
    return "This authorization request has expired or was already used. Start the connection again from your MCP client.";
  }

  if (normalized.includes("session missing")) {
    return "You must be signed in to continue.";
  }

  return message;
}

export async function loadOAuthAuthorization(
  authorizationId: string,
): Promise<OAuthAuthorizationDetails | OAuthRedirect> {
  const cached = authorizationResultCache.get(authorizationId);
  if (cached) {
    return cached;
  }

  const inFlight = authorizationRequestCache.get(authorizationId);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      throw new Error("You must be signed in to continue.");
    }

    const { data, error } =
      await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Invalid or expired authorization request.");
    }

    authorizationResultCache.set(authorizationId, data);
    return data;
  })();

  authorizationRequestCache.set(authorizationId, request);

  try {
    return await request;
  } finally {
    authorizationRequestCache.delete(authorizationId);
  }
}

export function clearOAuthAuthorizationCache(authorizationId?: string): void {
  if (authorizationId) {
    authorizationResultCache.delete(authorizationId);
    return;
  }

  authorizationResultCache.clear();
}

export function logOAuthRedirect(
  source: "approve" | "deny" | "auto",
  redirectUrl: string,
  response?: unknown,
): void {
  try {
    const url = new URL(redirectUrl);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    console.group(`[oauth/consent] redirect (${source})`);
    console.log("redirect_url:", redirectUrl);
    console.log("origin:", url.origin);
    console.log("pathname:", url.pathname);
    console.log("query params:", queryParams);
    if (response !== undefined) {
      console.log("full response:", response);
    }
    console.groupEnd();
  } catch {
    console.log(`[oauth/consent] redirect (${source})`, {
      redirectUrl,
      response,
    });
  }
}

export function getOAuthRedirectUrl(
  data: { redirect_url?: string; redirect_to?: string } | null | undefined,
): string | null {
  return data?.redirect_url ?? data?.redirect_to ?? null;
}

function isLoopbackRedirect(redirectUrl: string): boolean {
  try {
    const { hostname } = new URL(redirectUrl);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export function deliverOAuthRedirect(redirectUrl: string): "iframe" | "navigate" {
  if (isLoopbackRedirect(redirectUrl)) {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = redirectUrl;
    document.body.appendChild(iframe);
    window.setTimeout(() => iframe.remove(), 10_000);
    return "iframe";
  }

  window.location.replace(redirectUrl);
  return "navigate";
}
