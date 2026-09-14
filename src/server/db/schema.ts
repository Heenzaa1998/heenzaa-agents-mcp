import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const subscribers = sqliteTable("subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type SubscriberRecord = typeof subscribers.$inferSelect;
export type NewSubscriberRecord = typeof subscribers.$inferInsert;
