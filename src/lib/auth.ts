import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/security/mobile-tokens";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
};

export async function getAuthenticatedUser(request?: Request): Promise<AuthUser | null> {
  const authorization = request?.headers.get("authorization");
  if (authorization) {
    if (!authorization.startsWith("Bearer ")) return null;
    const claims = await verifyAccessToken(authorization.slice(7).trim());
    if (!claims) return null;
    return getPrisma().user.findUnique({
      where: { id: claims.userId, authVersion: claims.authVersion },
      select: { id: true, name: true, email: true },
    });
  }

  const session = await auth();
  if (!session?.user?.id || typeof session.user.authVersion !== "number") return null;
  return getPrisma().user.findUnique({
    where: { id: session.user.id, authVersion: session.user.authVersion },
    select: { id: true, name: true, email: true },
  });
}
