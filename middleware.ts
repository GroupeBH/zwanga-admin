import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/users\/([^/]+)$/);
  if (!match) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/users";
  url.searchParams.set("fiche", decodeURIComponent(match[1]));
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/users/:id"],
};
