import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isIP } from "node:net";

// New requests share the mobile backend; historical Mongo records are preserved.
const schema = z.object({
  serviceCode: z.enum(["documents", "vehicles", "equipment", "fleet"]),
  submissionKey: z.uuid(),
  contactConsent: z.literal(true),
  application: z.object({
    fullName: z.string().trim().min(3).max(180),
    phone: z.string().regex(/^\+?[\d ()-]{8,20}$/),
    vehicleDescription: z.string().max(180),
    plate: z.string().max(40).optional(),
    documents: z.array(z.string().max(60)).max(10),
    description: z.string().max(2000),
  }),
});
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
function endpoint(path: string) {
  const base = process.env.NEXT_PUBLIC_API_PUBLIC_URL;
  if (!base) throw new Error("Backend not configured");
  const url = new URL(base.replace(/\/$/, "") + "/pro-services/" + path);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("Unsupported backend URL");
  return url;
}
export async function GET() {
  try {
    const response = await fetch(endpoint("catalogue"), {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      return json(
        { message: "Le catalogue est temporairement indisponible." },
        503,
      );
    return json(await response.json());
  } catch {
    return json(
      { message: "Le catalogue est temporairement indisponible." },
      503,
    );
  }
}
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin)
    return json({ message: "Origine de la demande refusée." }, 403);
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ message: "Demande vide." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16000) {
        await reader.cancel();
        return json({ message: "Demande trop volumineuse." }, 413);
      }
      chunks.push(value);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return json({ message: "Demande invalide." }, 400);
    }
    const payload = schema.safeParse(parsed);
    if (!payload.success)
      return json({ message: "Vérifiez les informations du formulaire." }, 400);
    // The deployment ingress must overwrite these headers; never trust arbitrary client chains.
    const clientIp = (
      request.headers.get("x-forwarded-for")?.split(",")[0] ??
      request.headers.get("x-real-ip") ??
      ""
    ).trim();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (isIP(clientIp)) headers["x-forwarded-for"] = clientIp;
    const response = await fetch(endpoint("public-applications"), {
      method: "POST",
      headers,
      body: JSON.stringify(payload.data),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    if (!response.ok)
      return json(
        {
          message:
            response.status < 500
              ? (body.message ?? "Demande refusée.")
              : "Service temporairement indisponible.",
        },
        response.status,
      );
    return json({ id: body.id }, 201);
  } catch {
    return json(
      {
        message:
          "Envoi non confirmé. Réessayez avec les mêmes informations pour éviter un doublon.",
      },
      503,
    );
  }
}
