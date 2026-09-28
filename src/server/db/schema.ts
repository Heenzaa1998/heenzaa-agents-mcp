import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

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
  // Small WebP preview for the gallery (images only).
  thumbKey?: string;
};

// A long video (or any body of work) made of several short clips.
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProjectRecord = typeof projects.$inferSelect;

// Small key/value store for settings the owner edits from the web, e.g. the
// baht price of one KIE credit.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
  // KIE credits charged for this task; null until known.
  credits: doublePrecision("credits"),
  // Clip length for videos.
  durationSeconds: integer("duration_seconds"),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  // Free-text shot label inside a project; takes of one shot share it.
  shot: text("shot"),
  // The take the owner chose to use for its shot.
  selected: boolean("selected").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GenerationRecord = typeof generations.$inferSelect;
export type NewGenerationRecord = typeof generations.$inferInsert;
