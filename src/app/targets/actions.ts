"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { todayUTC } from "@/lib/date";
import { generateTargetsForDate } from "@/lib/targetGeneration";
import { assertLLMConfigured, isLLMEnabled } from "@/lib/llm";
import { MAX_UI_REGENERATIONS_PER_DAY } from "@/lib/rateLimits";

const UI_TAG = "(via UI)";

async function countTodaysUiRegenerations(): Promise<number> {
  return prisma.runLog.count({
    where: {
      runType: "TARGET_GENERATION",
      createdAt: { gte: todayUTC() },
      summary: { contains: UI_TAG },
    },
  });
}

export async function getUiRegenerationsRemaining(): Promise<number> {
  const used = await countTodaysUiRegenerations();
  return Math.max(0, MAX_UI_REGENERATIONS_PER_DAY - used);
}

/**
 * Regenerate today's Daily Targets. Uses the same logic path as the CLI
 * (`npm run generate:targets`) so manual + UI triggers stay identical.
 *
 * Rate-limited to MAX_UI_REGENERATIONS_PER_DAY runs per UTC day.
 */
export async function regenerateTodaysTargets() {
  const start = Date.now();

  const used = await countTodaysUiRegenerations();
  if (used >= MAX_UI_REGENERATIONS_PER_DAY) {
    return {
      ok: false as const,
      rateLimited: true as const,
      error: `Daily regeneration limit reached (${MAX_UI_REGENERATIONS_PER_DAY}/day). Try again tomorrow or run \`npm run generate:targets\`.`,
    };
  }

  try {
    assertLLMConfigured();
    const result = await generateTargetsForDate(prisma, todayUTC());
    await prisma.runLog.create({
      data: {
        runType: "TARGET_GENERATION",
        outcome: "SUCCESS",
        summary:
          `${result.created} created, ${result.replaced} replaced ${UI_TAG}` +
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
      remaining: MAX_UI_REGENERATIONS_PER_DAY - used - 1,
    };
  } catch (err) {
    const message = (err as Error).message;
    await prisma.runLog
      .create({
        data: {
          runType: "TARGET_GENERATION",
          outcome: "FAILURE",
          summary: `Target generation failed ${UI_TAG}`,
          durationMs: Date.now() - start,
          errorMessage: message,
        },
      })
      .catch(() => undefined);
    return { ok: false as const, error: message };
  }
}
