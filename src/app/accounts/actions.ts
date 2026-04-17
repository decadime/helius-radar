"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TrackStatus } from "@/lib/enums";

const ALLOWED: readonly TrackStatus[] = [
  TrackStatus.CANDIDATE,
  TrackStatus.TRACKED,
  TrackStatus.WATCHLIST,
  TrackStatus.REJECTED,
];

export async function setAccountTrackStatus(
  accountId: string,
  next: TrackStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof accountId !== "string" || accountId.length === 0) {
    return { ok: false, error: "invalid accountId" };
  }
  if (!ALLOWED.includes(next)) {
    return { ok: false, error: `invalid trackStatus "${String(next)}"` };
  }

  try {
    await prisma.account.update({
      where: { id: accountId },
      data: { trackStatus: next },
    });
    // Revalidate every list-view that depends on trackStatus, plus detail page.
    revalidatePath("/");
    revalidatePath("/universe");
    revalidatePath("/tracked");
    revalidatePath(`/accounts/${accountId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
