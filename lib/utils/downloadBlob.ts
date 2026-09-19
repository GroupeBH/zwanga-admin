export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const compactQueryParams = (
  params?: Record<string, string | number | undefined | null>
) => {
  if (!params) return undefined;

  const next: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "" || value === "all") continue;
    next[key] = value;
  }
  return Object.keys(next).length > 0 ? next : undefined;
};

export const datedExportName = (prefix: string) =>
  `${prefix}-${new Date().toISOString().slice(0, 10)}.xls`;
