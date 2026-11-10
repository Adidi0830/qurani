"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DynamicTitle() {
  const pathname = usePathname();

  useEffect(() => {
    let p = pathname ?? "/"
    const APP = "Admin Qurani"

    const locales = ["id", "en", "ar"];
    let segments = p.split("/").filter(Boolean);

    if (segments.length > 0 && locales.includes(segments[0])) {
      segments.shift();
      p = "/" + segments.join("/");
    }
    if (p === "") p = "/";

    const getTitle = () => {
      const exactMap: Record<string, string> = {
        "/": `Dashboard | ${APP}`,
        "/dashboard": `Dashboard | ${APP}`,
        "/grup": `Grup | ${APP}`,
        "/notifikasi": `Notifikasi | ${APP}`,
        "/peta-statistik": `Peta Statistik | ${APP}`,
        "/profile": `Profil | ${APP}`,
        "/teman": `Teman | ${APP}`,
        "/tentang": `Tentang | ${APP}`,
        "/billing": `Billing | ${APP}`,
        "/teachers": `Guru | ${APP}`,
        "/billing/paket": `Paket | ${APP}`,
        "/billing/payout": `Payout | ${APP}`,
        "/groups/categories": `Group Categories | ${APP}`,
      }

      if (exactMap[p]) return exactMap[p];
      if (/^\/billing\/guru\/\d+/.test(p)) return `Profil Guru | ${APP}`;
      if (/^\/support\/kyc-organisasi\/[^/]+/.test(p)) return `Detail Organisasi | ${APP}`;
      if (p === "/support/kyc-organisasi") return `KYC Organisasi | ${APP}`;

      if (segments.length > 0) {
        const readable = segments
          .map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
          .join(" - ")
        return `${readable} | ${APP}`
      }
      return `Modern Quran App | ${APP}`
    }

    const desiredTitle = getTitle();

    const applyTitle = () => {
      if (document.title !== desiredTitle) {
        document.title = desiredTitle;
      }
    };

    // Set immediately
    applyTitle();

    // Re-assert after React's first paint
    const rafId = requestAnimationFrame(applyTitle);

    // Re-assert after Next.js streaming/Suspense boundaries may have settled
    // (Next.js replaces <title> element after page fully loads)
    const t1 = setTimeout(applyTitle, 50);
    const t2 = setTimeout(applyTitle, 200);
    const t3 = setTimeout(applyTitle, 600);

    // Watch document.head for childList changes:
    // Next.js App Router REPLACES the <title> element (not just changes text),
    // so we need to observe the head to catch this substitution.
    const headObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if ((node as Element).tagName === "TITLE") {
            // New <title> element was inserted — re-apply our title
            applyTitle();
            // Re-attach a fine-grained observer to the new title element
            titleObserver.disconnect();
            titleObserver.observe(node, {
              childList: true,
              characterData: true,
              subtree: true,
            });
            return;
          }
        }
      }
      // Any other head mutation — also re-check
      applyTitle();
    });

    headObserver.observe(document.head, { childList: true });

    // Also observe the current title element for in-place text changes
    const titleObserver = new MutationObserver(applyTitle);
    const titleEl = document.querySelector("title");
    if (titleEl) {
      titleObserver.observe(titleEl, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      headObserver.disconnect();
      titleObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
