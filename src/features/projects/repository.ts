import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  generations,
  projects,
  settings,
  type GenerationRecord,
  type ProjectRecord,
} from "@/server/db/schema";
import { withDatabaseSpan } from "@/server/observability/tracing";

export type ProjectRepository = {
  findOrCreate: (name: string) => Promise<ProjectRecord>;
  findByName: (name: string) => Promise<ProjectRecord | null>;
  getById: (id: number) => Promise<ProjectRecord | null>;
  list: () => Promise<ProjectRecord[]>;
  listGenerations: (projectId?: number) => Promise<GenerationRecord[]>;
  listMissingCredits: (limit: number) => Promise<GenerationRecord[]>;
  updateCosts: (
    id: number,
    costs: { credits: number | null; durationSeconds: number | null },
  ) => Promise<void>;
  assign: (id: number, projectId: number | null, shot: string | null) => Promise<void>;
  selectTake: (id: number) => Promise<boolean>;
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<void>;
};

export const projectRepository: ProjectRepository = {
  async findOrCreate(name) {
    return withDatabaseSpan(
      { operation: "UPSERT", summary: "Find or create a project by name.", table: "projects" },
      async (span) => {
        const existing = await projectRepository.findByName(name);

        if (existing) {
          return existing;
        }

        const [created] = await db
          .insert(projects)
          .values({ name })
          .onConflictDoNothing()
          .returning();

        span.setAttribute("app.projects.created", created ? 1 : 0);

        // A concurrent insert may have won the race; read it back.
        return created ?? (await projectRepository.findByName(name))!;
      },
    );
  },

  async findByName(name) {
    return withDatabaseSpan(
      { operation: "SELECT", summary: "Find a project by name, ignoring case.", table: "projects" },
      async () => {
        const [project] = await db
          .select()
          .from(projects)
          .where(sql`lower(${projects.name}) = lower(${name})`)
          .limit(1);

        return project ?? null;
      },
    );
  },

  async getById(id) {
    return withDatabaseSpan(
      { operation: "SELECT", summary: "Get a project by id.", table: "projects" },
      async () => {
        const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

        return project ?? null;
      },
    );
  },

  async list() {
    return withDatabaseSpan(
      { operation: "SELECT", summary: "List projects.", table: "projects" },
      async (span) => {
        const rows = await db.select().from(projects).orderBy(asc(projects.name));

        span.setAttribute("app.projects.found", rows.length);

        return rows;
      },
    );
  },

  async listGenerations(projectId) {
    return withDatabaseSpan(
      {
        operation: "SELECT",
        summary: "List generations for cost reporting.",
        table: "generations",
      },
      async (span) => {
        const rows = await db
          .select()
          .from(generations)
          .where(projectId === undefined ? undefined : eq(generations.projectId, projectId))
          .orderBy(asc(generations.createdAt), asc(generations.id));

        span.setAttribute("app.generations.found", rows.length);

        return rows;
      },
    );
  },

  async listMissingCredits(limit) {
    return withDatabaseSpan(
      {
        operation: "SELECT",
        summary: "List finished generations whose credits are unknown.",
        table: "generations",
      },
      async (span) => {
        const rows = await db
          .select()
          .from(generations)
          .where(
            and(
              eq(generations.status, "success"),
              isNull(generations.credits),
              isNotNull(generations.taskId),
            ),
          )
          .limit(limit);

        span.setAttribute("app.generations.found", rows.length);

        return rows;
      },
    );
  },

  async updateCosts(id, costs) {
    return withDatabaseSpan(
      { operation: "UPDATE", summary: "Record credits and duration.", table: "generations" },
      async () => {
        await db
          .update(generations)
          .set({ ...costs, updatedAt: sql`now()` })
          .where(eq(generations.id, id));
      },
    );
  },

  async assign(id, projectId, shot) {
    return withDatabaseSpan(
      { operation: "UPDATE", summary: "Move a generation to a project and shot.", table: "generations" },
      async () => {
        // Moving a take means it is no longer the chosen take of its old shot.
        await db
          .update(generations)
          .set({ projectId, shot, selected: false, updatedAt: sql`now()` })
          .where(eq(generations.id, id));
      },
    );
  },

  async selectTake(id) {
    return withDatabaseSpan(
      { operation: "UPDATE", summary: "Make a take the chosen one for its shot.", table: "generations" },
      async (span) => {
        const [take] = await db.select().from(generations).where(eq(generations.id, id)).limit(1);

        if (!take?.projectId) {
          span.setAttribute("app.generations.updated", 0);

          return false;
        }

        const sameShot =
          take.shot === null
            ? isNull(generations.shot)
            : sql`lower(${generations.shot}) = lower(${take.shot})`;

        await db
          .update(generations)
          .set({ selected: sql`${generations.id} = ${id}`, updatedAt: sql`now()` })
          .where(and(eq(generations.projectId, take.projectId), sameShot));

        span.setAttribute("app.generations.updated", 1);

        return true;
      },
    );
  },

  async getSetting(key) {
    return withDatabaseSpan(
      { operation: "SELECT", summary: "Read a setting.", table: "settings" },
      async () => {
        const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

        return row?.value ?? null;
      },
    );
  },

  async setSetting(key, value) {
    return withDatabaseSpan(
      { operation: "UPSERT", summary: "Write a setting.", table: "settings" },
      async () => {
        await db
          .insert(settings)
          .values({ key, value })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value, updatedAt: sql`now()` },
          });
      },
    );
  },
};
