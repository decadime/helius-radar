"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { todayUTC } from "@/lib/date";
import { generateTargetsForDate } from "@/lib/targetGeneration";
import { assertLLMConfigured, isLLMEnabled } from "@/lib/llm";

/**
 * Regenerate today's Daily Targets. Uses the same logic path as the CLI
 * (`npm run generate:targets`) so manual + UI triggers stay identical.
 */
export async function regenerateTodaysTargets() {
  const start = Date.now();
  try {
    assertLLMConfigured();
    const result = await generateTargetsForDate(prisma, todayUTC());
    await prisma.runLog.create({
      data: {
        runType: "TARGET_GENERATION",
        outcome: "SUCCESS",
        summary:
          `${result.created} created, ${result.replaced} replaced (via UI)` +
          (isLLMEnabled() ? `, ${result.enriched} LLM-enriched` : ""),
        inserted: result.created,
        updated: result.replaced,
        skipped: result.considered - result.eligible,
        durationMs: Date.now() - start,
      },
    });
    revalidatePath("/targets");
    revalidatePath("/");
    return {
      ok: true as const,
      created: result.created,
      replaced: result.replaced,
      enriched: result.enriched,
    };
  } catch (err) {
    const message = (err as Error).message;
    await prisma.runLog
      .create({
        data: {
          runType: "TARGET_GENERATION",
          outcome: "FAILURE",
          summary: "Target generation failed (via UI)",
          durationMs: Date.now() - start,
          errorMessage: message,
        },
      })
      .catch(() => undefined);
    return { ok: false as const, error: message };
  }
}
