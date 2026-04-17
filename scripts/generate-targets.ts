/**
 * Generate today's Daily Targets from current account, signal, and match data.
 *
 * This is a thin CLI wrapper. All logic lives in `src/lib/targetGeneration.ts`
 * so the "Regenerate" server action can call the same code path.
 *
 * LLM enrichment of `whyNow` / `nextAction` is gated on `USE_LLM=true`;
 * `assertLLMConfigured()` fails fast if the gate is on but the key is missing.
 */

import { PrismaClient } from "@prisma/client";
import { todayUTC } from "../src/lib/date";
import { generateTargetsForDate } from "../src/lib/targetGeneration";
import { assertLLMConfigured, isLLMEnabled } from "../src/lib/llm";
import { writeRunLog } from "./_lib/run-log";

const prisma = new PrismaClient();

async function main() {
  const start = Date.now();
  const today = todayUTC();

  assertLLMConfigured();

  console.log(`\n→ Generating Daily Targets for ${today.toISOString().slice(0, 10)}`);
  console.log(`  mode: ${isLLMEnabled() ? "rules + LLM enrichment" : "rules only"}\n`);

  try {
    const result = await generateTargetsForDate(prisma, today);

    console.log(`  tracked accounts considered  ${result.considered}`);
    console.log(`  eligible (score > 0)         ${result.eligible}`);
    console.log(`  targets replaced             ${result.replaced}`);
    console.log(`  targets created              ${result.created}`);
    if (isLLMEnabled()) {
      console.log(`  enriched via LLM             ${result.enriched} / ${result.created}`);
    }

    if (result.picks.length > 0) {
      console.log("\n  Top picks:");
      result.picks.slice(0, 5).forEach((p, i) => {
        const b = p.breakdown;
        console.log(
          `    ${String(i + 1).padStart(2, " ")}. ${p.companyName.padEnd(22, " ")}` +
            ` score=${p.score.toFixed(3)}  ` +
            `id=${b.id.toFixed(2)} fresh=${b.fresh.toFixed(2)} ` +
            `impact=${b.impact.toFixed(2)} match=${b.match.toFixed(2)}`
        );
      });
    }
    console.log("");

    await writeRunLog(prisma, {
      runType: "TARGET_GENERATION",
      outcome: "SUCCESS",
      summary:
        `${result.created} created, ${result.replaced} replaced, ` +
        `${result.considered} considered` +
        (isLLMEnabled() ? `, ${result.enriched} LLM-enriched` : ""),
      inserted: result.created,
      updated: result.replaced,
      skipped: result.considered - result.eligible,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    const message = (err as Error).message;
    console.error("\n✗ Generation failed:", message);
    await writeRunLog(prisma, {
      runType: "TARGET_GENERATION",
      outcome: "FAILURE",
      summary: "Target generation failed",
      durationMs: Date.now() - start,
      errorMessage: message,
    });
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("\n✗ Generation failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
