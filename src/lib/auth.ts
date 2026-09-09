import { createSupabaseClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
};

export async function getAuthenticatedUser(request?: Request): Promise<AuthUser | null> {
  const authorization = request?.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : undefined;
  if (authorization && !accessToken) return null;

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.auth.getClaims(accessToken || undefined);
  const claims = data?.claims;
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (
    error ||
    !claims?.sub ||
    claims.role !== "authenticated" ||
    !audience.includes("authenticated")
  ) return null;

  const metadata = claims.user_metadata;
  const name = metadata?.full_name ?? metadata?.name;

  return {
    id: claims.sub,
    name: typeof name === "string" ? name : null,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}
