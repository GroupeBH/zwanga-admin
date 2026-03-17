import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import { computeServicesTotal, demandePayloadSchema, sanitizeDemandePayload } from "@/lib/validation";
import Demande from "@/models/Demande";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;

type RateLimitEntry = { count: number; start: number };

declare global {
  // eslint-disable-next-line no-var
  var demandesRateLimit: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = global.demandesRateLimit ?? new Map<string, RateLimitEntry>();

if (!global.demandesRateLimit) {
  global.demandesRateLimit = rateLimitStore;
}

const jsonResponse = (payload: unknown, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
};

const isRateLimited = (ip: string) => {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.start >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, start: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  rateLimitStore.set(ip, entry);
  return false;
};

const formatZodErrors = (error: ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return jsonResponse(
        {
          success: false,
          message: "Trop de tentatives. Reessayez dans une minute.",
        },
        429,
      );
    }

    const body = await request.json();
    const parsedBody = demandePayloadSchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonResponse(
        {
          success: false,
          message: "Donnees invalides.",
          errors: formatZodErrors(parsedBody.error),
        },
        400,
      );
    }

    const sanitizedPayload = sanitizeDemandePayload(parsedBody.data);
    const total = computeServicesTotal(sanitizedPayload.services);

    if (!sanitizedPayload.services.length || total <= 0) {
      return jsonResponse(
        {
          success: false,
          message: "La selection de services est invalide.",
        },
        400,
      );
    }

    await connectToDatabase();

    const createdDemande = await Demande.create({
      identite: sanitizedPayload.identite,
      contact: sanitizedPayload.contact,
      adresse: sanitizedPayload.adresse,
      vehicule: sanitizedPayload.vehicule,
      services: sanitizedPayload.services,
      total,
    });

    return jsonResponse(
      {
        success: true,
        message: "Demande enregistree avec succes.",
        total,
        id: createdDemande._id,
      },
      201,
    );
  } catch (error) {
    console.error("[api/demandes][POST] erreur:", error);
    return jsonResponse(
      {
        success: false,
        message: "Erreur serveur lors du traitement de la demande.",
      },
      500,
    );
  }
}

