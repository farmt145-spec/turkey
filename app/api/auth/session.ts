import * as jose from "jose";
import { Session } from "@contracts/constants";
import { env } from "../lib/env";

type SessionPayload = {
  userId: number;
  sessionVersion: number;
};

const JWT_ALG = "HS256";

function secret() {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${Math.floor(Session.maxAgeMs / 1000)}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret(), { algorithms: [JWT_ALG] });
    const userId = payload.userId;
    const sessionVersion = payload.sessionVersion;
    if (typeof userId !== "number" || typeof sessionVersion !== "number") return null;
    return { userId, sessionVersion };
  } catch {
    return null;
  }
}
