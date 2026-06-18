import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { loadConfig } from "./config.js";

let jwks: JWTVerifyGetKey | undefined;

function getJwks(): JWTVerifyGetKey {
  if (!jwks) {
    const { supabaseUrl } = loadConfig();
    jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
    );
  }

  return jwks;
}

export class AuthError extends Error {
  constructor(message = "Invalid or expired token") {
    super(message);
    this.name = "AuthError";
  }
}

export async function verifySupabaseJwt(token: string): Promise<string> {
  const { supabaseUrl, supabaseJwtSecret } = loadConfig();

  try {
    const { payload } = supabaseJwtSecret
      ? await jwtVerify(token, new TextEncoder().encode(supabaseJwtSecret), {
          algorithms: ["HS256"],
        })
      : await jwtVerify(token, getJwks(), {
          algorithms: ["ES256"],
          issuer: `${supabaseUrl}/auth/v1`,
        });

    if (!payload.sub || typeof payload.sub !== "string") {
      throw new AuthError();
    }

    return payload.sub;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError();
  }
}
