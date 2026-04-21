"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { setAuthenticated, setLoading } from "@/lib/features/auth/authSlice";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { getApiErrorStatus } from "@/lib/utils/apiErrors";
import { clearAuthTokens, isAuthenticated as checkAuthCookies } from "@/lib/utils/cookies";

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/privacy",
  "/terms",
  "/sales-policy",
  "/demande-documents",
  "/enquiry",
];

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const isLoginPage = pathname === "/login";
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) && !isLoginPage;
  const hasAuthCookies = checkAuthCookies();
  const shouldCheckProfile = hasAuthCookies && !isPublicRoute;
  const { data: profile, error: profileError, isFetching: isProfileLoading } =
    useGetCurrentUserProfileQuery(undefined, {
      skip: !shouldCheckProfile,
    });

  useEffect(() => {
    if (isPublicRoute) {
      dispatch(setLoading(false));
      return;
    }

    dispatch(setLoading(true));

    if (!hasAuthCookies) {
      dispatch(setAuthenticated(false));
      if (!isLoginPage) {
        router.push("/login");
      }
      return;
    }

    if (isProfileLoading) {
      return;
    }

    const profileStatus = getApiErrorStatus(profileError);
    const hasAccessDenied = profileStatus === 401 || profileStatus === 403;
    const isAdmin = profile?.user.role === "admin";

    if (hasAccessDenied || (profile && !isAdmin)) {
      clearAuthTokens();
      dispatch(setAuthenticated(false));
      if (!isLoginPage) {
        router.push("/login");
      }
      return;
    }

    dispatch(setAuthenticated(true));
    if (isLoginPage) {
      router.push("/dashboard");
    }
  }, [
    dispatch,
    hasAuthCookies,
    isLoginPage,
    isProfileLoading,
    isPublicRoute,
    profile,
    profileError,
    router,
  ]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

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
        <div>Verification de l'authentification admin...</div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return null;
};
