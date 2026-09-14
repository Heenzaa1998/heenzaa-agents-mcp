import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function PageShell({ children, className, ...props }: ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
        className,
      )}
      {...props}
    >
      {children}
    </main>
  );
}
