import {
  assignGenerationSchema,
  creditRateSchema,
  CREDIT_RATE_SETTING,
  DEFAULT_CREDIT_RATE_THB,
  getCostsSchema,
  selectTakeSchema,
} from "@/features/projects/contracts";
import {
  projectRepository,
  type ProjectRepository,
} from "@/features/projects/repository";
import type { GenerationRecord, ProjectRecord } from "@/server/db/schema";
import { AppError } from "@/server/errors/app-error";
import { kieClient, type KieClient } from "@/server/kie/client";
import { logger } from "@/server/logger";
import { withSpan } from "@/server/observability/tracing";

export type ShotSummary = {
  // The label as first typed; null for takes without a shot.
  label: string | null;
  takes: GenerationRecord[];
  succeeded: number;
  failed: number;
  pending: number;
  credits: number;
  selected: GenerationRecord | null;
};

export type CostSummary = {
  shots: ShotSummary[];
  takes: number;
  succeeded: number;
  failed: number;
  credits: number;
  // Takes whose credits are not known yet (still generating or not backfilled).
  unknownCredits: number;
  // Chosen takes and their total length: what actually ends up in the edit.
  clipsUsed: number;
  usedSeconds: number;
  // Everything spent (discarded takes included) per second of footage used.
  creditsPerUsedSecond: number | null;
};

export type ProjectReport = CostSummary & {
  project: ProjectRecord | null;
};

function shotKey(shot: string | null) {
  return shot?.trim().toLowerCase() ?? "";
}

// Pure: turns generation rows into per-shot and total costs.
export function summarizeCosts(records: GenerationRecord[]): CostSummary {
  const shots = new Map<string, ShotSummary>();

  for (const record of records) {
    const key = shotKey(record.shot);
    const shot =
      shots.get(key) ??
      {
        label: record.shot?.trim() || null,
        takes: [],
        succeeded: 0,
        failed: 0,
        pending: 0,
        credits: 0,
        selected: null,
      };

    shot.takes.push(record);
    shot.credits += record.credits ?? 0;
    if (record.status === "success") shot.succeeded += 1;
    if (record.status === "fail") shot.failed += 1;
    if (record.status === "pending") shot.pending += 1;
    if (record.selected) shot.selected = record;
    shots.set(key, shot);
  }

  const list = [...shots.values()];
  const chosen = list.map((shot) => shot.selected).filter((take) => take !== null);
  const credits = list.reduce((sum, shot) => sum + shot.credits, 0);
  const usedSeconds = chosen.reduce((sum, take) => sum + (take.durationSeconds ?? 0), 0);

  return {
    shots: list,
    takes: records.length,
    succeeded: list.reduce((sum, shot) => sum + shot.succeeded, 0),
    failed: list.reduce((sum, shot) => sum + shot.failed, 0),
    credits,
    unknownCredits: records.filter((r) => r.credits === null && r.status !== "fail").length,
    clipsUsed: chosen.length,
    usedSeconds,
    creditsPerUsedSecond: usedSeconds > 0 ? credits / usedSeconds : null,
  };
}

// Shot labels sort like people expect: EP01-S2 before EP01-S10; no label last.
export function sortShots<T extends { label: string | null }>(shots: T[]): T[] {
  return [...shots].sort((a, b) => {
    if (a.label === null || b.label === null) {
      return a.label === null ? (b.label === null ? 0 : 1) : -1;
    }

    return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" });
  });
}

export function toBaht(credits: number, rate: number) {
  return Math.round(credits * rate * 100) / 100;
}

export async function getCreditRate(
  repository: Pick<ProjectRepository, "getSetting"> = projectRepository,
): Promise<number> {
  const stored = Number(await repository.getSetting(CREDIT_RATE_SETTING));

  return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_CREDIT_RATE_THB;
}

export async function setCreditRate(
  input: unknown,
  repository: Pick<ProjectRepository, "setSetting"> = projectRepository,
) {
  return withSpan(
    "projects.set_credit_rate",
    { attributes: { "app.feature": "projects", "app.operation": "set_credit_rate" } },
    async () => {
      const { rate } = creditRateSchema.parse(input);

      await repository.setSetting(CREDIT_RATE_SETTING, String(rate));

      return rate;
    },
  );
}

// Used when a tool call names a project; creates it on first use.
export async function resolveProjectId(
  name: string | undefined,
  repository: Pick<ProjectRepository, "findOrCreate"> = projectRepository,
): Promise<number | null> {
  return name ? (await repository.findOrCreate(name.trim())).id : null;
}

type ReportRepository = Pick<ProjectRepository, "list" | "listGenerations">;

// One report per project, plus a final report (project: null) for work that
// is not in any project yet.
export async function listProjectReports(
  repository: ReportRepository = projectRepository,
): Promise<ProjectReport[]> {
  return withSpan(
    "projects.list_reports",
    { attributes: { "app.feature": "projects", "app.operation": "list_reports" } },
    async () => {
      const [projects, records] = await Promise.all([
        repository.list(),
        repository.listGenerations(),
      ]);
      const reports = projects.map((project) => ({
        project,
        ...summarizeCosts(records.filter((r) => r.projectId === project.id)),
      }));
      const unassigned = records.filter((r) => r.projectId === null);

      return unassigned.length > 0
        ? [...reports, { project: null, ...summarizeCosts(unassigned) }]
        : reports;
    },
  );
}

export async function getProjectReport(
  id: number,
  repository: Pick<ProjectRepository, "getById" | "listGenerations"> = projectRepository,
): Promise<ProjectReport | null> {
  const project = await repository.getById(id);

  return project ? { project, ...summarizeCosts(await repository.listGenerations(id)) } : null;
}

export async function assignGeneration(
  input: unknown,
  repository: Pick<ProjectRepository, "findOrCreate" | "assign"> = projectRepository,
) {
  return withSpan(
    "projects.assign_generation",
    { attributes: { "app.feature": "projects", "app.operation": "assign_generation" } },
    async () => {
      const parsed = assignGenerationSchema.parse(input);
      const projectId = await resolveProjectId(parsed.project, repository);

      // A shot only means something inside a project.
      await repository.assign(parsed.generationId, projectId, projectId ? parsed.shot ?? null : null);
    },
  );
}

export async function selectTake(
  input: unknown,
  repository: Pick<ProjectRepository, "selectTake"> = projectRepository,
) {
  return withSpan(
    "projects.select_take",
    { attributes: { "app.feature": "projects", "app.operation": "select_take" } },
    async () => {
      const { generationId } = selectTakeSchema.parse(input);

      if (!(await repository.selectTake(generationId))) {
        throw new AppError("Only takes inside a project can be chosen.", {
          code: "take_not_in_project",
          statusCode: 409,
        });
      }
    },
  );
}

// Never throws: the page shows "unknown" when KIE cannot be reached.
export async function getCreditBalance(
  client: Pick<KieClient, "getBalance"> = kieClient,
): Promise<number | null> {
  try {
    return await client.getBalance();
  } catch (error) {
    logger.warn(
      { operation: "get_balance", error: error instanceof Error ? error.message : String(error) },
      "Could not read the KIE credit balance",
    );

    return null;
  }
}

// Fills in credits (and clip length) for finished work recorded before costs
// were tracked. Runs after a page is sent; failures are retried next time.
export async function backfillCosts(
  limit = 25,
  client: Pick<KieClient, "getTask"> = kieClient,
  repository: Pick<ProjectRepository, "listMissingCredits" | "updateCosts"> = projectRepository,
): Promise<number> {
  const missing = await repository.listMissingCredits(limit);
  let filled = 0;

  for (const record of missing) {
    try {
      const status = await client.getTask(record.taskId!);

      if (typeof status.creditsConsumed === "number") {
        await repository.updateCosts(record.id, {
          credits: status.creditsConsumed,
          durationSeconds: record.durationSeconds ?? status.durationSeconds ?? null,
        });
        filled += 1;
      }
    } catch (error) {
      logger.warn(
        { operation: "backfill_costs", error: error instanceof Error ? error.message : String(error) },
        "Could not backfill credits for a generation",
      );
    }
  }

  return filled;
}

// Plain-text report for the get_costs MCP tool.
export async function getCostReport(
  input: unknown,
  repository: ReportRepository & Pick<ProjectRepository, "getSetting"> = projectRepository,
  client: Pick<KieClient, "getBalance"> = kieClient,
): Promise<string> {
  const { project } = getCostsSchema.parse(input);
  const [reports, rate, balance] = await Promise.all([
    listProjectReports(repository),
    getCreditRate(repository),
    getCreditBalance(client),
  ]);
  const wanted = project
    ? reports.filter((r) => r.project?.name.toLowerCase() === project.toLowerCase())
    : reports;

  if (project && wanted.length === 0) {
    return `No project named "${project}".`;
  }

  const baht = (credits: number) => `${credits} credits (฿${toBaht(credits, rate).toFixed(2)})`;
  const lines = [
    `Rate: ฿${rate} per credit.`,
    balance === null ? "Balance: unknown." : `Balance: ${baht(balance)}.`,
  ];

  for (const report of wanted) {
    lines.push(
      "",
      `${report.project?.name ?? "Not in a project"}: ${baht(report.credits)} over ${report.takes} take(s), ${report.failed} failed.` +
        (report.usedSeconds > 0
          ? ` Chosen clips: ${report.clipsUsed}, ${report.usedSeconds}s, ${baht(Math.round(report.credits / report.usedSeconds))} per used second.`
          : ""),
    );

    for (const shot of report.shots) {
      lines.push(
        `  - ${shot.label ?? "(no shot)"}: ${shot.takes.length} take(s), ${baht(shot.credits)}` +
          (shot.selected ? `, chosen take #${shot.selected.id}` : ""),
      );
    }
  }

  return lines.join("\n");
}
