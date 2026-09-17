"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Browser back/forward restores this page from the router cache, which can
// show stale progress ("Not started" after answers were saved). The first
// mount of the session is fresh from the server; any later mount is a
// return visit, so re-pull the data.
let firstMountDone = false;

export function RefreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    if (!firstMountDone) {
      firstMountDone = true;
      return;
    }
    router.refresh();
  }, [router]);
  return null;
}
