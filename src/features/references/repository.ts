import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { referenceImages, type ReferenceImageRecord } from "@/server/db/schema";
import { withDatabaseSpan } from "@/server/observability/tracing";

export type NewReferenceImage = {
  name: string;
  key: string;
  contentType: string;
  bytes: number;
  width: number;
  height: number;
  projectId: number | null;
};

export type ReferenceRepository = {
  // Inserts, or replaces the row with the same name.
  upsert: (input: NewReferenceImage) => Promise<ReferenceImageRecord>;
  findByName: (name: string) => Promise<ReferenceImageRecord | null>;
  list: (projectId: number | undefined, limit: number) => Promise<ReferenceImageRecord[]>;
};

export const referenceRepository: ReferenceRepository = {
  async upsert(input) {
    return withDatabaseSpan(
      { operation: "UPSERT", summary: "Insert or replace a reference image by name.", table: "reference_images" },
      async (span) => {
        const [row] = await db
          .insert(referenceImages)
          .values(input)
          .onConflictDoUpdate({
            target: referenceImages.name,
            set: {
              key: input.key,
              contentType: input.contentType,
              bytes: input.bytes,
              width: input.width,
              height: input.height,
              projectId: input.projectId,
              updatedAt: new Date().toISOString(),
            },
          })
          .returning();

        span.setAttribute("app.references.id", row!.id);

        return row!;
      },
    );
  },

  async findByName(name) {
    return withDatabaseSpan(
      { operation: "SELECT", summary: "Find a reference image by name.", table: "reference_images" },
      async () => {
        const [row] = await db
          .select()
          .from(referenceImages)
          .where(eq(referenceImages.name, name))
          .limit(1);

        return row ?? null;
      },
    );
  },

  async list(projectId, limit) {
    return withDatabaseSpan(
      { operation: "SELECT", summary: "List reference images.", table: "reference_images" },
      async (span) => {
        const query = db.select().from(referenceImages);
        const rows = await (projectId === undefined
          ? query
          : query.where(eq(referenceImages.projectId, projectId))
        )
          .orderBy(desc(referenceImages.updatedAt))
          .limit(limit);

        span.setAttribute("app.references.count", rows.length);

        return rows;
      },
    );
  },
};
