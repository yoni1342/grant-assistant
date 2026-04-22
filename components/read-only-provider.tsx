"use client";

import { createContext, useContext } from "react";

const ReadOnlyContext = createContext(false);

export function useReadOnly() {
  return useContext(ReadOnlyContext);
}

export function ReadOnlyProvider({
  readOnly,
  children,
}: {
  readOnly: boolean;
  children: React.ReactNode;
}) {
  if (!readOnly) {
    return (
      <ReadOnlyContext.Provider value={false}>
        {children}
      </ReadOnlyContext.Provider>
    );
  }

  return (
    <ReadOnlyContext.Provider value={true}>
      <style>{`
        .read-only-mode button:not([data-admin-action]):not([data-slot="tabs-trigger"]),
        .read-only-mode input:not([data-admin-action]),
        .read-only-mode textarea:not([data-admin-action]),
        .read-only-mode select:not([data-admin-action]),
        .read-only-mode [role="button"]:not([data-admin-action]):not([data-slot="tabs-trigger"]),
        .read-only-mode form:not([data-admin-action]) {
          pointer-events: none !important;
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
      `}</style>
      {children}
    </ReadOnlyContext.Provider>
  );
}
