"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setAuthenticated, setLoading } from "@/lib/features/auth/authSlice";
import { isAuthenticated as checkAuthCookies } from "@/lib/utils/cookies";

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = ["/login"];

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const checkAuth = () => {
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

  // Afficher un loader pendant la vérification
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

  // Si on est sur une route publique, afficher le contenu
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // Si on est authentifié, afficher le contenu
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Sinon, ne rien afficher (la redirection est en cours)
  return null;
};

