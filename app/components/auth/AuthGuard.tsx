"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setAuthenticated, setLoading } from "@/lib/features/auth/authSlice";
import { isAuthenticated as checkAuthCookies } from "@/lib/utils/cookies";

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = [
  "/login",
  "/privacy",
  "/terms",
  "/sales-policy",
];

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const checkAuth = () => {
      // Si on est sur une route publique (sauf login), on n'a pas besoin de vérifier l'auth
      if (PUBLIC_ROUTES.includes(pathname) && pathname !== "/login") {
        dispatch(setLoading(false));
        return;
      }

      dispatch(setLoading(true));

      // Vérifier la présence des cookies d'authentification
      const hasAuthCookies = checkAuthCookies();

      if (hasAuthCookies) {
        dispatch(setAuthenticated(true));
        // Si on est sur /login et authentifié, rediriger vers dashboard
        if (pathname === "/login") {
          router.push("/dashboard");
        }
      } else {
        dispatch(setAuthenticated(false));
        // Si on n'est pas sur une route publique, rediriger vers login
        if (!PUBLIC_ROUTES.includes(pathname)) {
          router.push("/login");
        }
      }
    };

    checkAuth();
  }, [pathname, dispatch, router]);

  // Si on est sur une route publique (pages légales), afficher le contenu immédiatement
  if (PUBLIC_ROUTES.includes(pathname) && pathname !== "/login") {
    return <>{children}</>;
  }

  // Afficher un loader pendant la vérification (seulement pour les routes protégées ou /login)
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--color-bg)",
          color: "var(--color-text)",
        }}
      >
        <div>Vérification de l'authentification...</div>
      </div>
    );
  }

  // Si on est sur /login, afficher la page de login (même si pas authentifié)
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Si on est authentifié, afficher le contenu
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Sinon, ne rien afficher (la redirection est en cours)
  return null;
};

