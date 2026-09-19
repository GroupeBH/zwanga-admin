import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/utils/requireAdmin";
import { recrutementPayloadSchema, sanitizeRecrutementPayload } from "@/lib/validationRecrutement";
import RecrutementAgent from "@/models/RecrutementAgent";

const LIST_DEFAULT_LIMIT = 20;
const LIST_MAX_LIMIT = 100;

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const cellXml = (value: string): string =>
  `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;

const rowXml = (values: readonly string[]): string =>
  `<Row>${values.map(cellXml).join("")}</Row>`;

const toXls = (
  sheetName: string,
  headers: string[],
  rows: Array<Record<string, unknown>>,
) => {
  const dataRows = rows.map((row) =>
    rowXml(headers.map((header) => String(row[header] ?? ""))),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${escapeXml(sheetName.slice(0, 31))}">
    <Table>
      ${rowXml(headers)}
      ${dataRows.join("\n      ")}
    </Table>
  </Worksheet>
</Workbook>
`;
  return `\uFEFF${xml}`;
};

const escapeCsvValue = (value: unknown) => {
  const stringValue = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const toCsv = (rows: Array<Record<string, unknown>>) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsvValue(row[header])).join(","));
  });
  return lines.join("\r\n");
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

type RateLimitEntry = { count: number; start: number };

declare global {
  // eslint-disable-next-line no-var
  var recrutementRateLimit: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = global.recrutementRateLimit ?? new Map<string, RateLimitEntry>();

if (!global.recrutementRateLimit) {
  global.recrutementRateLimit = rateLimitStore;
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
          message: "Trop de tentatives. Réessayez dans une minute.",
        },
        429,
      );
    }

    const body = await request.json();
    const parsedBody = recrutementPayloadSchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonResponse(
        {
          success: false,
          message: "Données invalides.",
          errors: formatZodErrors(parsedBody.error),
        },
        400,
      );
    }

    const sanitizedPayload = sanitizeRecrutementPayload(parsedBody.data);

    await connectToDatabase();

    const createdEntry = await RecrutementAgent.create({
      contact: sanitizedPayload.contact,
      usage: sanitizedPayload.usage,
      retours: sanitizedPayload.retours,
      zonesDeploiement: sanitizedPayload.zonesDeploiement,
    });

    return jsonResponse(
      {
        success: true,
        message: "Candidature enregistrée avec succès.",
        id: createdEntry._id,
      },
      201,
    );
  } catch (error) {
    console.error("[api/recrutement-terrain][POST] erreur:", error);
    return jsonResponse(
      {
        success: false,
        message: "Erreur serveur lors de l'enregistrement de la candidature.",
      },
      500,
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await requireAdmin(request);
    if (!isAdmin) {
      return jsonResponse({ success: false, message: "Non autorisé." }, 401);
    }

    const { searchParams } = new URL(request.url);
    const formatParam = searchParams.get("format");
    const format =
      formatParam === "xls" || formatParam === "csv" ? formatParam : "json";
    const search = searchParams.get("search")?.trim();
    const zone = searchParams.get("zone")?.trim();
    const sexe = searchParams.get("sexe")?.trim();
    const appareil = searchParams.get("appareil")?.trim();
    const dejaTelecharge = searchParams.get("dejaTelecharge")?.trim();
    const profilUtilisateur = searchParams.get("profilUtilisateur")?.trim();

    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      LIST_MAX_LIMIT,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(LIST_DEFAULT_LIMIT), 10) || LIST_DEFAULT_LIMIT),
    );

    const filter: Record<string, unknown> = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { "contact.nomComplet": { $regex: escaped, $options: "i" } },
        { "contact.telephone": { $regex: escaped, $options: "i" } },
      ];
    }
    if (zone) filter.zonesDeploiement = zone;
    if (sexe) filter["contact.sexe"] = sexe;
    if (appareil) filter["usage.appareil"] = appareil;
    if (dejaTelecharge) filter["usage.dejaTelecharge"] = dejaTelecharge;
    if (profilUtilisateur) filter["usage.profilUtilisateur"] = profilUtilisateur;

    await connectToDatabase();

    if (format === "csv" || format === "xls") {
      const entries = await RecrutementAgent.find(filter).sort({ createdAt: -1 }).lean();
      const rows = entries.map((entry: any) => ({
        "Nom complet": entry.contact?.nomComplet ?? "",
        "Âge": entry.contact?.age ?? "",
        "Téléphone": entry.contact?.telephone ?? "",
        Sexe: entry.contact?.sexe ?? "",
        "Type de téléphone": entry.usage?.appareil ?? "",
        "Déjà téléchargé": entry.usage?.dejaTelecharge ?? "",
        Profil: entry.usage?.profilUtilisateur ?? "",
        "Compréhension du projet": entry.retours?.comprehensionProjet ?? "",
        "Problèmes rencontrés": entry.retours?.problemesRencontres ?? "",
        "Suggestions d'amélioration": entry.retours?.suggestionsAmelioration ?? "",
        "Zones de déploiement": (entry.zonesDeploiement ?? []).join("; "),
        "Reçue le": entry.createdAt ? new Date(entry.createdAt).toISOString() : "",
      }));

      if (format === "xls") {
        const xls = toXls("Candidatures", Object.keys(rows[0] ?? {
          "Nom complet": "",
        }), rows);
        return new NextResponse(xls, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.ms-excel; charset=utf-8",
            "Content-Disposition": `attachment; filename="candidatures-agents-${new Date().toISOString().slice(0, 10)}.xls"`,
            "Cache-Control": "no-store",
          },
        });
      }

      const csv = `\uFEFF${toCsv(rows)}`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="candidatures-agents-${Date.now()}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      RecrutementAgent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      RecrutementAgent.countDocuments(filter),
    ]);

    const items = entries.map((entry: any) => ({
      id: String(entry._id),
      createdAt: entry.createdAt,
      contact: entry.contact,
      usage: entry.usage,
      retours: entry.retours,
      zonesDeploiement: entry.zonesDeploiement ?? [],
    }));

    return jsonResponse({
      success: true,
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("[api/recrutement-terrain][GET] erreur:", error);
    return jsonResponse(
      {
        success: false,
        message: "Erreur serveur lors de la récupération des candidatures.",
      },
      500,
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await requireAdmin(request);
    if (!isAdmin) {
      return jsonResponse({ success: false, message: "Non autorisé." }, 401);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return jsonResponse({ success: false, message: "Identifiant manquant." }, 400);
    }

    await connectToDatabase();
    const deleted = await RecrutementAgent.findByIdAndDelete(id);

    if (!deleted) {
      return jsonResponse({ success: false, message: "Candidature introuvable." }, 404);
    }

    return jsonResponse({ success: true, message: "Candidature supprimée." });
  } catch (error) {
    console.error("[api/recrutement-terrain][DELETE] erreur:", error);
    return jsonResponse(
      {
        success: false,
        message: "Erreur serveur lors de la suppression.",
      },
      500,
    );
  }
}
