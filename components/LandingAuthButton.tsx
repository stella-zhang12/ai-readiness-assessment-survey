"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/** Landing nav button: Sign in for visitors, Dashboard when a session
 * exists. Renders the visitor variant first so the page stays static. */
export function LandingAuthButton() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setSignedIn(Boolean(data.user)))
      .catch(() => {});
  }, []);

  return (
    <Link
      href={signedIn ? "/dashboard" : "/login"}
      className="rounded-[10px] bg-heritage px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-heritage-deep"
    >
      {signedIn ? "Go to dashboard" : "Sign in"}
    </Link>
  );
}
