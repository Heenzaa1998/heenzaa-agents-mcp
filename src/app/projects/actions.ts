"use server";

import { revalidatePath } from "next/cache";
import { assignGeneration, selectTake, setCreditRate } from "@/features/projects/service";
import { requireGallerySession } from "@/server/auth/gallery-session";
import { logger } from "@/server/logger";

// Every action re-checks the session: server actions are callable directly.
async function run(operation: string, work: () => Promise<unknown>) {
  await requireGallerySession();

  try {
    await work();
  } catch (error) {
    logger.warn(
      { operation, error: error instanceof Error ? error.message : String(error) },
      "Project action failed",
    );
  }

  revalidatePath("/projects", "layout");
  revalidatePath("/gallery");
}

export async function saveCreditRate(formData: FormData) {
  await run("set_credit_rate", () => setCreditRate({ rate: formData.get("rate") }));
}

export async function assignToProject(formData: FormData) {
  await run("assign_generation", () =>
    assignGeneration({
      generationId: formData.get("generationId"),
      project: formData.get("project"),
      shot: formData.get("shot"),
    }),
  );
}

export async function chooseTake(formData: FormData) {
  await run("select_take", () => selectTake({ generationId: formData.get("generationId") }));
}
