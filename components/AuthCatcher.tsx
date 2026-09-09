"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Safety net for emailed sign-in links that land on the wrong page.
 *
 * If Supabase's redirect-URL allowlist rejects our /auth/callback address,
 * it falls back to the project's Site URL (the site root) with the one-time
 * auth code still attached. This component, mounted on the landing page,
 * completes the sign-in from there and forwards the user to the dashboard.
 */
export function AuthCatcher() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = new URLSearchParams(window.location.search).get("code");
    const hasHashToken = window.location.hash.includes("access_token=");
    if (!code && !hasHashToken) return;

    const supabase = createClient();
    (async () => {
      try {
        if (code) await supabase.auth.exchangeCodeForSession(code);
        // Hash-style tokens are picked up by the client automatically.
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          router.replace("/dashboard");
          router.refresh();
        }
      } catch {
        // Expired or foreign-browser link: leave the visitor on the landing
        // page; signing in normally still works.
      }
    })();
  }, [router]);

  return null;
}
