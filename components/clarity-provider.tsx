"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

export function ClarityProvider() {
  useEffect(() => {
    const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
    if (typeof window !== "undefined" && clarityId) {
      Clarity.init(clarityId);
    }
  }, []);

  return null;
}
