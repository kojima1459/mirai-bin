import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { verifyIdToken, getFirebaseUser } from "./firebaseAdmin";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class SDKServer {
  /**
   * Authenticate request using Firebase ID token
   * @param req - Express request with Authorization header
   * @returns User from database
   */
  async authenticateRequest(req: Request): Promise<User> {
    const authHeader = req.headers.authorization;

    // Verify Firebase ID token
    const decodedToken = await verifyIdToken(authHeader);

    if (!decodedToken) {
      throw ForbiddenError("Invalid or missing authentication token");
    }

    const firebaseUid = decodedToken.uid;
    const signedInAt = new Date();

    // Check if user exists in database
    let user = await db.getUserByOpenId(firebaseUid);

    // If user not in DB, create from Firebase user info
    if (!user) {
      try {
        const firebaseUser = await getFirebaseUser(firebaseUid);

        if (!firebaseUser) {
          throw ForbiddenError("User not found in Firebase");
        }

        await db.upsertUser({
          openId: firebaseUid,
          name: firebaseUser.displayName || null,
          email: firebaseUser.email ?? null,
          loginMethod: "google",
          lastSignedIn: signedInAt,
        });

        user = await db.getUserByOpenId(firebaseUid);
      } catch (error) {
        console.error("[Auth] Failed to create user from Firebase:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    // Update last signed in time
    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const sdk = new SDKServer();
