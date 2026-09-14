import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { subscribers, type SubscriberRecord } from "@/server/db/schema";
import type { CreateSubscriberInput } from "@/features/subscribers/contracts";
import { withDatabaseSpan } from "@/server/observability/tracing";

export type SubscriberRepository = {
  create: (input: CreateSubscriberInput) => Promise<SubscriberRecord>;
  findByEmail: (email: string) => Promise<SubscriberRecord | null>;
};

export const subscriberRepository: SubscriberRepository = {
  async create(input) {
    return withDatabaseSpan(
      {
        operation: "INSERT",
        summary: "Insert a subscriber row.",
        table: "subscribers",
      },
      async (span) => {
        const [subscriber] = await db.insert(subscribers).values(input).returning();

        span.setAttribute("app.subscribers.created", 1);

        return subscriber;
      },
    );
  },

  async findByEmail(email) {
    return withDatabaseSpan(
      {
        operation: "SELECT",
        summary: "Find one subscriber by email.",
        table: "subscribers",
      },
      async (span) => {
        const [subscriber] = await db
          .select()
          .from(subscribers)
          .where(eq(subscribers.email, email))
          .limit(1);

        span.setAttribute("app.subscribers.found", subscriber ? 1 : 0);

        return subscriber ?? null;
      },
    );
  },
};
