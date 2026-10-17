"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { setAuthenticated, setLoading } from "@/lib/features/auth/authSlice";
import { isBackOfficeRole, isMarketerRole } from "@/lib/features/auth/adminRoles";
import { useGetCurrentUserProfileQuery } from "@/lib/features/profile/profileApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { getApiErrorStatus } from "@/lib/utils/apiErrors";
import { beginNavigation } from "@/app/components/navigation/NavigationLoader";
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
  "/recrutement-terrain",
  "/zz-debug-users",
];

const PUBLIC_ROUTE_PREFIXES = ["/track/"];

const MARKETER_ROUTES = new Set(["/dashboard", "/settings", "/profile"]);

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const isLoginPage = pathname === "/login";
  const isSettingsPage = pathname === "/settings";
  const isPublicRoute = (PUBLIC_ROUTES.includes(pathname) || PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) && !isLoginPage;
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
        beginNavigation("/login");
        router.push("/login");
      }
      return;
    }

    if (isProfileLoading) {
      return;
    }

    const profileStatus = getApiErrorStatus(profileError);
    const hasAccessDenied = profileStatus === 401 || profileStatus === 403;
    const allowed = isBackOfficeRole(profile?.user.role);

    if (hasAccessDenied || (profile && !allowed)) {
      clearAuthTokens();
      dispatch(setAuthenticated(false));
      if (!isLoginPage) {
        beginNavigation("/login");
        router.push("/login");
      }
      return;
    }

    dispatch(setAuthenticated(true));
    if (profile?.user.passwordChangeRequired && !isSettingsPage) {
      beginNavigation("/settings");
      router.push("/settings");
      return;
    }

    if (
      isMarketerRole(profile?.user.role) &&
      !isLoginPage &&
      !MARKETER_ROUTES.has(pathname)
    ) {
      beginNavigation("/dashboard");
      router.push("/dashboard");
      return;
    }

    if (isLoginPage) {
      const destination = profile?.user.passwordChangeRequired ? "/settings" : "/dashboard";
      beginNavigation(destination);
      router.push(destination);
    }
  }, [
    dispatch,
    hasAuthCookies,
    isLoginPage,
    isSettingsPage,
    isProfileLoading,
    isPublicRoute,
    pathname,
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
