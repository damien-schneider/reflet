"use client";

import { useClientHydrated } from "./client-hydration";

type ClientDateVariant = "date" | "dateTime" | "shortDate" | "time";

interface ClientDateProps {
  className?: string;
  value: number;
  variant?: ClientDateVariant;
}

interface FormatterPair {
  client: Intl.DateTimeFormat;
  fallback: Intl.DateTimeFormat;
}

const DATE_FORMATTERS: Record<ClientDateVariant, FormatterPair> = {
  date: {
    client: new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    fallback: new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }),
  },
  dateTime: {
    client: new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      year: "numeric",
    }),
    fallback: new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }),
  },
  shortDate: {
    client: new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
    }),
    fallback: new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
  },
  time: {
    client: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    fallback: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }),
  },
};

export function ClientDate({
  className,
  value,
  variant = "date",
}: ClientDateProps) {
  const hasHydrated = useClientHydrated();
  const formatterPair = DATE_FORMATTERS[variant];
  const formatter = hasHydrated ? formatterPair.client : formatterPair.fallback;

  return <span className={className}>{formatter.format(value)}</span>;
}
