"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { validateAdminToken } from "@/components/api";
import { clearAdminSession, getAdminSessionToken } from "@/lib/adminSession";

export function useAdminAuth() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const isLocalPreview =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          localStorage.getItem("logixa_preview_mode") === "true");

      if (isLocalPreview) {
        setToken("mock_admin_token_preview");
        setIsAuthenticated(true);
        setIsCheckingAuth(false);
        return;
      }

      const saved = await getAdminSessionToken();
      if (!saved) {
        if (cancelled) return;
        setIsCheckingAuth(false);
        router.push("/admin/login");
        return;
      }
      const valid = await validateAdminToken(saved);
      if (cancelled) return;
      if (!valid) {
        await clearAdminSession();
        setToken("");
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        router.push("/admin/login");
        return;
      }
      const currentToken = await getAdminSessionToken();
      if (!currentToken) {
        await clearAdminSession();
        setIsCheckingAuth(false);
        router.push("/admin/login");
        return;
      }
      setToken(currentToken);
      setIsAuthenticated(true);
      setIsCheckingAuth(false);
    }

    void checkSession().catch(() => {
      if (cancelled) return;
      setToken("");
      setIsAuthenticated(false);
      setIsCheckingAuth(false);
      router.push("/admin/login");
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { token, isAuthenticated, isCheckingAuth };
}
