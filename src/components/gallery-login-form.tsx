"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { login, type LoginState } from "@/app/gallery/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "@/content/i18n";

const initialState: LoginState = { error: null };

export function GalleryLoginForm({ text }: { text: Dictionary["login"] }) {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="gallery-password">
          {text.password}
        </label>
        <Input
          aria-describedby="gallery-password-error"
          aria-invalid={state.error ? true : undefined}
          autoComplete="current-password"
          autoFocus
          className="h-12 rounded-xl"
          disabled={isPending}
          id="gallery-password"
          name="password"
          required
          type="password"
        />
      </div>

      <Button
        className="h-12 rounded-xl shadow-[0_0_40px_-10px_var(--primary)]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? text.checking : text.submit}
        {isPending ? null : <ArrowRight />}
      </Button>

      <p
        aria-live="polite"
        className="min-h-5 text-sm text-destructive"
        id="gallery-password-error"
      >
        {state.error}
      </p>
    </form>
  );
}
