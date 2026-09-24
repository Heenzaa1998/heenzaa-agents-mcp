import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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
