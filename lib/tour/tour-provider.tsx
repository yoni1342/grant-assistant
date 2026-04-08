"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { driver, type Driver } from "driver.js";
import { TOUR_MAP, type TourId, type TourStep } from "./definitions";

interface TourContextValue {
  startTour: (tourId: TourId) => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  isActive: false,
});

export function useTour() {
  return useContext(TourContext);
}

interface TourProviderProps {
  children: React.ReactNode;
  plan: string;
  toursCompleted: Record<string, string>;
}

export function TourProvider({
  children,
  plan,
  toursCompleted,
}: TourProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);
  const stepsRef = useRef<TourStep[]>([]);
  const currentIndexRef = useRef(0);
  const activeTourIdRef = useRef<TourId | null>(null);
  const allowDestroyRef = useRef(false);
  const [isActive, setIsActive] = useState(false);
  const pathnameRef = useRef(pathname);
  const waitingForNavRef = useRef(false);
  const hasAutoTriggered = useRef(false);

  // Keep pathname ref in sync
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // When pathname changes and we're waiting for navigation, resume the tour
  useEffect(() => {
    if (!waitingForNavRef.current || !activeTourIdRef.current) return;
    waitingForNavRef.current = false;

    // Small delay to let the page render its elements
    const timer = setTimeout(() => {
      const step = stepsRef.current[currentIndexRef.current];
      if (!step) return;

      // Pass ALL steps to driver.js so it never thinks we're on the last step.
      // onNextClick/onPrevClick intercept before driver.js tries to show a wrong-page step.
      const allSteps = stepsRef.current;
      const driverSteps = allSteps.map((s) => ({
        element: s.element as string | undefined,
        popover: s.popover,
      }));

      if (driverRef.current) {
        allowDestroyRef.current = true;
        driverRef.current.destroy();
      }
      driverRef.current = createDriver(
        driverSteps,
        0, // globalOffset is 0 since we pass all steps
        allSteps,
        activeTourIdRef.current!
      );
      driverRef.current.drive(currentIndexRef.current);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTourCompletion = useCallback(async (tourId: TourId) => {
    try {
      await fetch("/api/tour/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourId }),
      });
    } catch {
      // silent — non-critical
    }
  }, []);

  const createDriver = useCallback(
    (
      driverSteps: { element?: string; popover?: TourStep["popover"] }[],
      globalOffset: number,
      allSteps: TourStep[],
      tourId: TourId
    ) => {
      const d = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        allowKeyboardControl: true,
        overlayColor: "rgba(0, 0, 0, 0.7)",
        stagePadding: 12,
        stageRadius: 12,
        popoverOffset: 20,
        popoverClass: "fundory-tour-popover",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        progressText: "{{current}} of {{total}}",
        steps: driverSteps,
        showButtons: ["next", "previous"],
        onDestroyStarted: () => {
          // Only allow destroy when explicitly triggered (Skip Tour / completion)
          if (allowDestroyRef.current) {
            allowDestroyRef.current = false;
            d.destroy();
            setIsActive(false);
            activeTourIdRef.current = null;
          }
          // Otherwise block overlay click / Escape from closing
        },
        onPopoverRender: (popover) => {
          // Always show "Next" (not "Done") since we manage completion ourselves
          popover.nextButton.innerHTML = "Next";
          // Replace the X close button with a "Skip Tour" button
          // Make title row a flex container with Skip Tour on the right
          const btn = popover.closeButton;
          btn.innerHTML = "Skip Tour";
          btn.className = "fundory-tour-skip-btn";
          btn.style.cssText = `
            display: inline-block !important;
            position: static !important;
            background: transparent;
            border: 1px solid var(--border);
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 4px 12px;
            border-radius: 6px;
            width: auto;
            height: auto;
            color: var(--muted-foreground);
            white-space: nowrap;
            flex-shrink: 0;
          `;
          btn.onmouseenter = () => { btn.style.color = "#ef4444"; btn.style.borderColor = "#ef4444"; btn.style.background = "rgb(239 68 68 / 0.08)"; };
          btn.onmouseleave = () => { btn.style.color = "var(--muted-foreground)"; btn.style.borderColor = "var(--border)"; btn.style.background = "transparent"; };

          // Move button next to title in a flex row
          if (popover.title.parentElement && !popover.title.parentElement.classList.contains("fundory-title-row")) {
            const row = document.createElement("div");
            row.className = "fundory-title-row";
            row.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 12px;";
            popover.title.parentElement.insertBefore(row, popover.title);
            row.appendChild(popover.title);
            row.appendChild(btn);
          }
          btn.onclick = (e) => {
            e.stopPropagation();
            allowDestroyRef.current = true;
            d.destroy();
            saveTourCompletion(tourId);
          };
        },
        onNextClick: () => {
          const current = d.getActiveIndex() ?? 0;
          const next = current + 1;
          if (next >= allSteps.length) {
            allowDestroyRef.current = true;
            d.destroy();
            saveTourCompletion(tourId);
            return;
          }

          currentIndexRef.current = next;

          if (allSteps[next].page !== pathnameRef.current) {
            waitingForNavRef.current = true;
            router.push(allSteps[next].page);
            return;
          }

          d.moveNext();
        },
        onPrevClick: () => {
          const current = d.getActiveIndex() ?? 0;
          const prev = current - 1;
          if (prev < 0) return;

          currentIndexRef.current = prev;

          if (allSteps[prev].page !== pathnameRef.current) {
            waitingForNavRef.current = true;
            router.push(allSteps[prev].page);
            return;
          }

          d.movePrevious();
        },
      });
      return d;
    },
    [router, saveTourCompletion]
  );

  const cssLoadedRef = useRef(false);

  const startTour = useCallback(
    (tourId: TourId) => {
      // Lazy-load driver.js CSS on first tour start
      if (!cssLoadedRef.current) {
        cssLoadedRef.current = true;
        // @ts-expect-error -- CSS module import
        import("driver.js/dist/driver.css");
      }

      // Clean up any existing tour
      if (driverRef.current) {
        driverRef.current.destroy();
      }

      const steps = TOUR_MAP[tourId];
      if (!steps || steps.length === 0) return;

      stepsRef.current = steps;
      currentIndexRef.current = 0;
      activeTourIdRef.current = tourId;
      setIsActive(true);

      const firstStep = steps[0];

      // Navigate to the first step's page if needed
      if (firstStep.page !== pathnameRef.current) {
        waitingForNavRef.current = true;
        router.push(firstStep.page);
        return;
      }

      // Pass ALL steps so driver.js knows the full tour length
      const driverSteps = steps.map((s) => ({
        element: s.element as string | undefined,
        popover: s.popover,
      }));

      driverRef.current = createDriver(driverSteps, 0, steps, tourId);

      // Small delay so DOM is settled
      setTimeout(() => {
        driverRef.current?.drive(0);
      }, 300);
    },
    [createDriver, router]
  );

  // Auto-trigger tour for new users
  useEffect(() => {
    if (hasAutoTriggered.current) return;
    // Only trigger on dashboard (initial landing page)
    if (pathname !== "/dashboard") return;

    // Wait a moment for the page to fully render
    const timer = setTimeout(() => {
      if (hasAutoTriggered.current) return;
      hasAutoTriggered.current = true;

      if (plan === "professional" || plan === "agency") {
        if (!toursCompleted.professional && !toursCompleted.base) {
          // Brand new pro/agency user — full professional tour
          startTour("professional");
        } else if (toursCompleted.base && !toursCompleted.upgrade_pro) {
          // Upgraded from free — show only the new features
          startTour("upgrade_pro");
        }
      } else {
        // Free tier
        if (!toursCompleted.base) {
          startTour("base");
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [pathname, plan, toursCompleted, startTour]);

  return (
    <TourContext.Provider value={{ startTour, isActive }}>
      {children}
    </TourContext.Provider>
  );
}
