"use client";

import { useEffect } from "react";

export function LangSetter({ lang }: { lang: string }) {
  useEffect(() => {
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }
    const dir = lang === "ar" ? "rtl" : "ltr";
    if (document.documentElement.dir !== dir) {
      document.documentElement.dir = dir;
    }
  }, [lang]);
  return null;
}
