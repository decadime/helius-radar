"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { regenerateTodaysTargets } from "@/app/targets/actions";

type Props = {
  /** Regenerations still available today (0 = rate-limited). */
  remaining: number;
  /** Total daily allowance — used to build the label. */
  dailyLimit: number;
};

export function RegenerateButton({ remaining, dailyLimit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [localRemaining, setLocalRemaining] = useState(remaining);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const exhausted = localRemaining <= 0;
  const label = isPending
    ? "Regenerating…"
    : exhausted
      ? "Daily limit reached"
      : `Regenerate (${localRemaining}/${dailyLimit} left)`;

  const onClick = () => {
    if (exhausted) return;
    setError(null);
    startTransition(async () => {
      const result = await regenerateTodaysTargets();
      if (result.ok) {
        setLocalRemaining(result.remaining);
      } else {
        if ("rateLimited" in result && result.rateLimited) {
          setLocalRemaining(0);
        }
        setError(result.error);
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        onClick={onClick}
        disabled={isPending || exhausted}
        aria-busy={isPending}
        title={exhausted ? "Resets at 00:00 UTC" : undefined}
      >
        {label}
      </Button>
      {error && (
        <span
          role="status"
          className="max-w-[280px] text-right text-2xs text-status-err"
        >
          {error}
        </span>
      )}
    </div>
  );
}
