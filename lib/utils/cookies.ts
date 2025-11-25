import Cookies from "js-cookie";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const setAuthTokens = (accessToken: string, refreshToken: string) => {
  // Stocker les tokens avec une expiration appropriée
  Cookies.set(ACCESS_TOKEN_KEY, accessToken, {
    expires: 1, // 1 jour
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  Cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
    expires: 7, // 7 jours
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

export const getAccessToken = (): string | undefined => {
  return Cookies.get(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | undefined => {
  return Cookies.get(REFRESH_TOKEN_KEY);
};

export const clearAuthTokens = () => {
  Cookies.remove(ACCESS_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
};

export const isAuthenticated = (): boolean => {
  const accessToken = getAccessToken();
  return !!accessToken;
};

