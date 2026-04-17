"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { regenerateTodaysTargets } from "@/app/targets/actions";

export function RegenerateButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    startTransition(async () => {
      const result = await regenerateTodaysTargets();
      if (!result.ok) {
        console.error("Regenerate failed:", result.error);
      }
      router.refresh();
    });
  };

  return (
    <Button
      variant="primary"
      onClick={onClick}
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? "Regenerating…" : "Regenerate"}
    </Button>
  );
}
