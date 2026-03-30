"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

const CLARITY_PROJECT_ID = "w3s40s8211";

export function ClarityProvider() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      Clarity.init(CLARITY_PROJECT_ID);
    }
  }, []);

  return null;
}
