"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TrackStatus } from "@/lib/enums";
import { setAccountTrackStatus } from "@/app/accounts/actions";

type Props = {
  accountId: string;
  current: TrackStatus;
};

/**
 * Inline status controls on the Account Detail header. Buttons visually
 * express the target state; the current status is disabled so the affordance
 * is "what would this account become next".
 */
export function TrackStatusControls({ accountId, current }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const mutate = (next: TrackStatus) => {
    startTransition(async () => {
      const result = await setAccountTrackStatus(accountId, next);
      if (!result.ok) {
        console.error("Track status update failed:", result.error);
      }
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <ActionButton
        label="Track"
        tone="ok"
        disabled={current === TrackStatus.TRACKED || isPending}
        onClick={() => mutate(TrackStatus.TRACKED)}
      />
      <ActionButton
        label="Watchlist"
        tone="warn"
        disabled={current === TrackStatus.WATCHLIST || isPending}
        onClick={() => mutate(TrackStatus.WATCHLIST)}
      />
      <ActionButton
        label="Reject"
        tone="err"
        disabled={current === TrackStatus.REJECTED || isPending}
        onClick={() => mutate(TrackStatus.REJECTED)}
      />
    </div>
  );
}

function ActionButton({
  label,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  tone: "ok" | "warn" | "err";
  disabled: boolean;
  onClick: () => void;
}) {
  // Tones map to border/text accents so enabled states read at a glance.
  const toneClass = {
    ok: "hover:border-status-ok/60 hover:text-status-ok",
    warn: "hover:border-status-warn/60 hover:text-status-warn",
    err: "hover:border-status-err/60 hover:text-status-err",
  }[tone];

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={toneClass}
    >
      {label}
    </Button>
  );
}
