import type { NextRequest } from "next/server";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

type AdminProfileResponse = {
  user?: { role?: string };
  role?: string;
};

/**
 * Vérifie qu'une requête provient bien d'un administrateur connecté, en
 * validant le token d'accès (cookie "accessToken") auprès de l'API Nest.
 * Retourne `true` si la requête est autorisée, `false` sinon.
 */
export const requireAdmin = async (request: NextRequest): Promise<boolean> => {
  const accessToken = request.cookies.get("accessToken")?.value;
  if (!accessToken) return false;

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_PUBLIC_URL;
  if (!apiBaseUrl) return false;

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) return false;

    const data = (await response.json()) as AdminProfileResponse;
    const role = data.user?.role ?? data.role;
    return typeof role === "string" && ADMIN_ROLES.has(role);
  } catch {
    return false;
  }
};
