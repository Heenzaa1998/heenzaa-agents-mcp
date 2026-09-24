import { sql } from "drizzle-orm";
import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // mode "string" keeps SubscriberRecord.createdAt a string, as it was on SQLite.
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SubscriberRecord = typeof subscribers.$inferSelect;
export type NewSubscriberRecord = typeof subscribers.$inferInsert;

// A stored file is referenced by its R2 key; presigned links expire, so they
// are never saved. `url` is only kept when the file never reached storage.
export type StoredMediaRef = {
  key: string | null;
  url?: string;
};

export const generations = pgTable("generations", {
  id: serial("id").primaryKey(),
  kind: text("kind", { enum: ["image", "video"] }).notNull(),
  operation: text("operation").notNull(),
  model: text("model").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status", { enum: ["pending", "success", "fail"] }).notNull(),
  // Null when the call failed before the provider issued a task.
  taskId: text("task_id").unique(),
  media: jsonb("media")
    .$type<StoredMediaRef[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GenerationRecord = typeof generations.$inferSelect;
export type NewGenerationRecord = typeof generations.$inferInsert;
