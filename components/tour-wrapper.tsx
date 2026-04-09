"use client";

import { TourProvider } from "@/lib/tour/tour-provider";

interface TourWrapperProps {
  children: React.ReactNode;
  plan: string;
  toursCompleted: Record<string, string>;
}

export function TourWrapper({ children, plan, toursCompleted }: TourWrapperProps) {
  return (
    <TourProvider plan={plan} toursCompleted={toursCompleted}>
      {children}
    </TourProvider>
  );
}
