import { and, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import type {
  GenerationOutcome,
  ListGenerationsInput,
  NewGeneration,
} from "@/features/generations/contracts";
import { db } from "@/server/db/client";
import {
  generations,
  type GenerationRecord,
  type StoredMediaRef,
} from "@/server/db/schema";
import { withDatabaseSpan } from "@/server/observability/tracing";

export type GenerationRepository = {
  create: (
    input: Omit<NewGeneration, "project" | "shot"> & {
      projectId: number | null;
      shot: string | null;
    },
  ) => Promise<GenerationRecord>;
  // Returns how many rows were updated (0 when the task was never recorded).
  finishByTaskId: (taskId: string, outcome: GenerationOutcome) => Promise<number>;
  list: (filters: ListGenerationsInput) => Promise<GenerationRecord[]>;
  updateMedia: (id: number, media: StoredMediaRef[]) => Promise<void>;
};

// ILIKE treats % and _ as wildcards; escape them so a search is literal.
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export const generationRepository: GenerationRepository = {
  async create(input) {
    return withDatabaseSpan(
      {
        operation: "INSERT",
        summary: "Insert a generation row.",
        table: "generations",
      },
      async (span) => {
        const [record] = await db.insert(generations).values(input).returning();

        span.setAttribute("app.generations.created", 1);

        return record;
      },
    );
  },

  async finishByTaskId(taskId, outcome) {
    return withDatabaseSpan(
      {
        operation: "UPDATE",
        summary: "Record the outcome of a generation task.",
        table: "generations",
      },
      async (span) => {
        const updated = await db
          .update(generations)
          .set({
            status: outcome.status,
            error: outcome.error ?? null,
            ...(outcome.credits !== undefined ? { credits: outcome.credits } : {}),
            ...(outcome.durationSeconds !== undefined
              ? { durationSeconds: outcome.durationSeconds }
              : {}),
            updatedAt: sql`now()`,
            ...(outcome.media ? { media: outcome.media } : {}),
          })
          .where(eq(generations.taskId, taskId))
          .returning({ id: generations.id });

        span.setAttribute("app.generations.updated", updated.length);

        return updated.length;
      },
    );
  },

  async list(filters) {
    return withDatabaseSpan(
      {
        operation: "SELECT",
        summary: "List recent generations with optional filters.",
        table: "generations",
      },
      async (span) => {
        const conditions: SQL[] = [];

        if (filters.kind) {
          conditions.push(eq(generations.kind, filters.kind));
        }

        if (filters.status) {
          conditions.push(eq(generations.status, filters.status));
        }

        if (filters.query) {
          conditions.push(
            ilike(generations.prompt, `%${escapeLike(filters.query)}%`),
          );
        }

        const records = await db
          .select()
          .from(generations)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(generations.createdAt), desc(generations.id))
          .limit(filters.limit);

        span.setAttribute("app.generations.found", records.length);

        return records;
      },
    );
  },

  async updateMedia(id, media) {
    return withDatabaseSpan(
      {
        operation: "UPDATE",
        summary: "Replace the stored media references of a generation.",
        table: "generations",
      },
      async (span) => {
        const updated = await db
          .update(generations)
          .set({ media, updatedAt: sql`now()` })
          .where(eq(generations.id, id))
          .returning({ id: generations.id });

        span.setAttribute("app.generations.updated", updated.length);
      },
    );
  },
};
