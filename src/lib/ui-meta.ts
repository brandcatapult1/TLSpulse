import { Camera, Zap } from "lucide-react";
import type { ShootStatus, ShootType } from "./types";

// One visual system per shoot type, used on calendar, details, filters and reports (PRD §37).
export const TYPE_META: Record<
  ShootType,
  { label: string; short: string; Icon: typeof Camera; card: string; text: string; dot: string; pill: string; bar: string }
> = {
  SOCIAL_MEDIA: {
    label: "Social Media Shoot",
    short: "Social Media",
    Icon: Camera,
    card: "bg-social-bg border-social",
    text: "text-social",
    dot: "bg-social",
    pill: "bg-social-bg text-social",
    bar: "bg-social",
  },
  REAL_TIME_VISIT: {
    label: "Real Time Visit",
    short: "Real Time",
    Icon: Zap,
    card: "bg-realtime-bg border-realtime",
    text: "text-realtime",
    dot: "bg-realtime",
    pill: "bg-realtime-bg text-realtime",
    bar: "bg-realtime",
  },
};

export const STATUS_META: Record<ShootStatus, { label: string; pill: string }> = {
  PLANNED: { label: "Planned", pill: "bg-soft text-muted" },
  RESCHEDULED: { label: "Rescheduled", pill: "bg-info/10 text-info" },
  CANCELLED: { label: "Cancelled", pill: "bg-danger/10 text-danger" },
  DATE_HOLD: { label: "Date hold", pill: "bg-hold-bg text-hold" },
};

/** Tentative "date hold" shoots: striped yellow card with a dashed border (type colour stays on the left edge). */
export const HOLD_CARD = "hold-stripes border-dashed";
