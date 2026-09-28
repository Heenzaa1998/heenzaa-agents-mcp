"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/gallery/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: LoginState = { error: null };

export function GalleryLoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="gallery-password">
          Password
        </label>
        <Input
          aria-describedby="gallery-password-error"
          aria-invalid={state.error ? true : undefined}
          autoComplete="current-password"
          autoFocus
          disabled={isPending}
          id="gallery-password"
          name="password"
          required
          type="password"
        />
      </div>

      <Button disabled={isPending} type="submit">
        {isPending ? "Checking…" : "Open gallery"}
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
