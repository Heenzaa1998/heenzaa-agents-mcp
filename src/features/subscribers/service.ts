import type { CreateSubscriberInput } from "@/features/subscribers/contracts";
import { createSubscriberSchema } from "@/features/subscribers/contracts";
import {
  subscriberRepository,
  type SubscriberRepository,
} from "@/features/subscribers/repository";
import type { SubscriberRecord } from "@/server/db/schema";
import { AppError } from "@/server/errors/app-error";
import { logger } from "@/server/logger";
import { withSpan } from "@/server/observability/tracing";

type SubscriberWriter = Pick<SubscriberRepository, "create" | "findByEmail">;

export async function createSubscriber(
  input: unknown,
  repository: SubscriberWriter = subscriberRepository,
): Promise<SubscriberRecord> {
  return withSpan(
    "subscribers.create",
    {
      attributes: {
        "app.feature": "subscribers",
        "app.operation": "create_subscriber",
      },
    },
    async (span) => {
      const parsedInput = createSubscriberSchema.parse(input);
      const existingSubscriber = await repository.findByEmail(parsedInput.email);

      span.setAttribute(
        "enduser.email.domain",
        parsedInput.email.split("@")[1] ?? "unknown",
      );
      span.setAttribute("app.subscribers.duplicate_check", true);

      if (existingSubscriber) {
        span.setAttribute("app.subscribers.exists", true);

        throw new AppError("Subscriber already exists for this email.", {
          code: "subscriber_exists",
          statusCode: 409,
        });
      }

      try {
        const subscriber = await repository.create(parsedInput);

        span.setAttribute("app.subscribers.exists", false);
        span.setAttribute("app.subscribers.created_id", subscriber.id);

        logger.info(
          {
            subscriber_id: subscriber.id,
            subscriber_name_length: subscriber.name.length,
          },
          "Subscriber created",
        );

        return subscriber;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new AppError("Subscriber already exists for this email.", {
            code: "subscriber_exists",
            statusCode: 409,
            cause: error,
          });
        }

        throw error;
      }
    },
  );
}

function isUniqueConstraintError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("sqlite_constraint") ||
    message.includes("unique constraint failed") ||
    message.includes("duplicate key")
  );
}

export type { CreateSubscriberInput };
