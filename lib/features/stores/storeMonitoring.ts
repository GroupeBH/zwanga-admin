export type MonitorTone = "good" | "warning" | "critical" | "neutral";

export const STORE_PLATFORM_LABEL: Record<string, string> = {
  google: "Google Play",
  apple: "App Store",
};
export const STORE_TASK_LABEL: Record<string, string> = {
  catalog: "Catalogue",
  reviews: "Avis",
  reports: "Rapports",
  vitals: "Performances",
  connection: "Connexion",
  reply: "Réponse à un avis",
  analytics_request: "Demande de rapports",
};
export const REVIEW_STATUS_LABEL: Record<string, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  draft: "Brouillon",
  pending_approval: "En attente d’approbation",
  approved: "Approuvé",
  responded: "Répondu",
  closed: "Clôturé",
};
export const REPORT_TOPIC_LABEL: Record<string, string> = {
  global: "Synthèse globale",
  google: "Google Play",
  apple: "App Store",
  acquisition: "Acquisition",
  conversion: "Conversion",
  reviews: "Avis",
  stability: "Stabilité",
  versions: "Versions",
};
export const label = (map: Record<string, string>, value: string) =>
  map[value] ?? value;

const JOB_TONES: Record<string, MonitorTone> = {
  succeeded: "good",
  completed: "good",
  failed: "critical",
  unavailable: "warning",
  unknown: "warning",
};
const RUNNING = ["pending", "queued", "running"];

export const jobTone = (state: string): MonitorTone =>
  JOB_TONES[state] ?? "neutral";

export const integrationTone = (state: string): MonitorTone =>
  (
    {
      connected: "good",
      error: "critical",
      unconfigured: "warning",
      unchecked: "warning",
    } as Record<string, MonitorTone>
  )[state] ?? "neutral";

export const severityTone = (severity: string): MonitorTone =>
  severity === "critical" ? "critical" : severity === "warning" ? "warning" : "neutral";

const day = (time: number) => new Date(time).toISOString().slice(0, 10);

export function dayRange(from: string, to: string, max = 366) {
  const start = Date.parse(from),
    count = Math.round((Date.parse(to) - start) / 86400000) + 1;
  if (!Number.isFinite(count) || count < 1 || count > max) return [];
  return Array.from({ length: count }, (_, i) => day(start + i * 86400000));
}

export function summarizeJobs(jobs: { state: string }[]) {
  const counts = { good: 0, warning: 0, critical: 0, running: 0, other: 0 };
  for (const job of jobs) {
    const tone = jobTone(job.state);
    if (tone !== "neutral") counts[tone]++;
    else if (RUNNING.includes(job.state)) counts.running++;
    else counts.other++;
  }
  const finished = counts.good + counts.warning + counts.critical;
  return {
    total: jobs.length,
    counts,
    successRate: finished ? (counts.good / finished) * 100 : null,
  };
}

/**
 * Runs per UTC day over the last `days`. When the list is truncated (only the
 * latest jobs are loaded), days older than the oldest loaded job stay null:
 * runs may exist there that this page simply did not fetch.
 */
export function jobsByDay(
  jobs: { state: string; createdAt: string }[],
  days: number,
  truncated: boolean,
  now = Date.now(),
) {
  const times = jobs.map((j) => Date.parse(j.createdAt)).filter(Number.isFinite);
  const oldest = truncated && times.length ? day(Math.min(...times)) : null;
  return Array.from({ length: days }, (_, i) => {
    const date = day(now - (days - 1 - i) * 86400000);
    if (oldest && date < oldest) return { date, counts: null };
    const counts = { good: 0, warning: 0, critical: 0, running: 0 };
    jobs.forEach((job, index) => {
      if (!Number.isFinite(times[index]) || day(times[index]) !== date) return;
      const tone = jobTone(job.state);
      if (tone !== "neutral") counts[tone]++;
      else counts.running++;
    });
    return { date, counts };
  });
}

/** Store reports are published with a delay of one to three days. */
export function freshness(
  completedAt: string | null,
  state: string,
  now = Date.now(),
): { tone: MonitorTone; label: string } {
  if (jobTone(state) === "critical")
    return { tone: "critical", label: "Dernier import en échec" };
  const time = completedAt ? Date.parse(completedAt) : NaN;
  if (!Number.isFinite(time)) return { tone: "neutral", label: "Jamais importé" };
  const hours = (now - time) / 3600000;
  if (hours <= 26) return { tone: "good", label: "À jour" };
  if (hours <= 72) return { tone: "warning", label: "En retard" };
  return { tone: "critical", label: "Obsolète" };
}

export function relativeTime(value: string | null | undefined, now = Date.now()) {
  const time = value ? Date.parse(value) : NaN;
  if (!Number.isFinite(time)) return "—";
  const minutes = Math.round((time - now) / 60000);
  const format = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return format.format(hours, "hour");
  return format.format(Math.round(hours / 24), "day");
}

/** Missing days are skipped, never counted as zero. */
export function seriesStats(daily: { date: string; value: number | null }[]) {
  const observed = daily.filter(
    (d): d is { date: string; value: number } => d.value !== null,
  );
  if (!observed.length) return null;
  const peak = observed.reduce((a, b) => (b.value > a.value ? b : a));
  const total = observed.reduce((sum, d) => sum + d.value, 0);
  return {
    total,
    peak,
    last: observed[observed.length - 1],
    average: total / observed.length,
    observed: observed.length,
  };
}

export function cohortFunnel(
  cohorts: {
    registrations: number;
    kycSubmitted: number;
    kycApproved: number;
    firstTripCompleted: number;
  }[],
) {
  const sum = (key: keyof (typeof cohorts)[number]) =>
    cohorts.reduce((total, c) => total + (Number(c[key]) || 0), 0);
  const steps = [
    { label: "Inscrits", value: sum("registrations") },
    { label: "KYC soumis", value: sum("kycSubmitted") },
    { label: "KYC approuvés", value: sum("kycApproved") },
    { label: "Premier trajet terminé", value: sum("firstTripCompleted") },
  ];
  return steps.map((step, i) => ({
    ...step,
    ofFirst: steps[0].value ? (step.value / steps[0].value) * 100 : null,
    ofPrevious:
      i && steps[i - 1].value ? (step.value / steps[i - 1].value) * 100 : null,
  }));
}
