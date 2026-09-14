"use client";

import { useRouter } from "next/navigation";
import { setActiveTeam } from "@/lib/activeTeam";

export function TeamSwitchButton({
  teamId,
  current,
}: {
  teamId: string;
  current: boolean;
}) {
  const router = useRouter();
  if (current) {
    return (
      <span className="text-sm font-semibold text-status-green">
        Current ✓
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setActiveTeam(teamId);
        router.push("/dashboard");
        router.refresh();
      }}
      className="rounded-md border border-heritage px-4 py-1.5 text-sm font-semibold text-heritage transition-colors hover:bg-wash"
    >
      Switch to this team
    </button>
  );
}
