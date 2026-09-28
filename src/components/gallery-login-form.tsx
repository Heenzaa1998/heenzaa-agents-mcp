"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/gallery/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: LoginState = { error: null };

export function GalleryLoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="gallery-password">
          Password
        </label>
        <Input
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
        {isPending ? "Checking..." : "Open gallery"}
      </Button>

      <p
        aria-live="polite"
        className="min-h-6 text-sm leading-6 text-[color:var(--destructive)]"
      >
        {state.error}
      </p>
    </form>
  );
}
