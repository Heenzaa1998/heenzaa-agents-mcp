"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormState =
  | {
      message: string;
      tone: "neutral";
    }
  | {
      message: string;
      tone: "success" | "error";
    };

const initialState: FormState = {
  message:
    "POST /api/subscribers validates input with Zod, creates spans, and persists through Drizzle.",
  tone: "neutral",
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

const toneClassNames = {
  error: "text-[color:var(--destructive)]",
  neutral: "text-muted-foreground",
  success: "text-emerald-700",
} as const;

export function SubscribeForm() {
  const [state, setState] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
    };

    void submitSubscriber(form, payload);
  }

  async function submitSubscriber(
    form: HTMLFormElement,
    payload: {
      email: string;
      name: string;
    },
  ) {
    setIsSubmitting(true);
    setState(initialState);

    try {
      const response = await fetch("/api/subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseBody = (await response.json().catch(() => null)) as
        | ApiErrorResponse
        | null;

      if (!response.ok) {
        setState({
          message:
            responseBody?.error?.message ??
            "Unable to save the subscriber right now.",
          tone: "error",
        });

        return;
      }

      form.reset();
      setState({
        message: "Subscriber saved in the local database.",
        tone: "success",
      });
    } catch {
      setState({
        message: "Unable to save the subscriber right now.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="subscriber-name">
            Name
          </label>
          <Input
            autoComplete="name"
            disabled={isSubmitting}
            id="subscriber-name"
            name="name"
            placeholder="Jane Example"
            required
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="subscriber-email">
            Email
          </label>
          <Input
            autoComplete="email"
            disabled={isSubmitting}
            id="subscriber-email"
            name="email"
            placeholder="jane@example.com"
            required
            type="email"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : "Join the list"}
        </Button>
        <Button asChild variant="outline">
          <a href="/api/health">Open health route</a>
        </Button>
      </div>

      <p
        aria-live="polite"
        className={`min-h-6 text-sm leading-6 ${toneClassNames[state.tone]}`}
      >
        {state.message}
      </p>
    </form>
  );
}
