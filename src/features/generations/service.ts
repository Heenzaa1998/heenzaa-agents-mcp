import {
  generationOutcomeSchema,
  listGenerationsSchema,
  newGenerationSchema,
  type GenerationOutcome,
  type NewGenerationInput,
} from "@/features/generations/contracts";
import {
  generationRepository,
  type GenerationRepository,
} from "@/features/generations/repository";
import type { MediaItem } from "@/features/media/service";
import type { GenerationRecord, StoredMediaRef } from "@/server/db/schema";
import { AppError } from "@/server/errors/app-error";
import { logger } from "@/server/logger";
import { withSpan } from "@/server/observability/tracing";

type GenerationWriter = Pick<GenerationRepository, "create">;
type GenerationFinisher = Pick<GenerationRepository, "finishByTaskId">;
type GenerationReader = Pick<GenerationRepository, "list">;

// What the image/video services depend on. Both methods never throw: history
// is best-effort, and a database hiccup must not fail a generation the user
// has already paid for.
export type GenerationLog = {
  record: (input: NewGenerationInput) => Promise<void>;
  finish: (taskId: string, outcome: GenerationOutcome) => Promise<void>;
};

export function toMediaRefs(media: MediaItem[]): StoredMediaRef[] {
  return media.map((item) =>
    item.key ? { key: item.key } : { key: null, url: item.url },
  );
}

export function describeError(error: unknown) {
  if (error instanceof AppError) {
    return `${error.code}: ${error.message}`;
  }

  return error instanceof Error ? error.message : String(error);
}

function warnHistoryFailure(operation: string, error: unknown) {
  logger.warn(
    { operation, error: describeError(error) },
    "Could not write generation history",
  );
}

export async function recordGeneration(
  input: unknown,
  repository: GenerationWriter = generationRepository,
): Promise<void> {
  try {
    await withSpan(
      "generations.record",
      {
        attributes: {
          "app.feature": "generations",
          "app.operation": "record_generation",
        },
      },
      async (span) => {
        const parsed = newGenerationSchema.parse(input);

        span.setAttribute("app.generations.kind", parsed.kind);
        span.setAttribute("app.generations.status", parsed.status);

        await repository.create(parsed);
      },
    );
  } catch (error) {
    warnHistoryFailure("record_generation", error);
  }
}

export async function finishGeneration(
  taskId: string,
  outcome: unknown,
  repository: GenerationFinisher = generationRepository,
): Promise<void> {
  try {
    await withSpan(
      "generations.finish",
      {
        attributes: {
          "app.feature": "generations",
          "app.operation": "finish_generation",
        },
      },
      async (span) => {
        const parsed = generationOutcomeSchema.parse(outcome);
        const updated = await repository.finishByTaskId(taskId, parsed);

        span.setAttribute("app.generations.status", parsed.status);
        span.setAttribute("app.generations.updated", updated);
      },
    );
  } catch (error) {
    warnHistoryFailure("finish_generation", error);
  }
}

export async function listGenerations(
  input: unknown,
  repository: GenerationReader = generationRepository,
): Promise<GenerationRecord[]> {
  return withSpan(
    "generations.list",
    {
      attributes: {
        "app.feature": "generations",
        "app.operation": "list_generations",
      },
    },
    async (span) => {
      const parsed = listGenerationsSchema.parse(input);
      const records = await repository.list(parsed);

      span.setAttribute("app.generations.found", records.length);

      return records;
    },
  );
}

export const generationLog: GenerationLog = {
  record: (input) => recordGeneration(input),
  finish: (taskId, outcome) => finishGeneration(taskId, outcome),
};
