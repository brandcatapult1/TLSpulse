// Client-safe shapes shared by API routes and UI.
export type ShootType = "SOCIAL_MEDIA" | "REAL_TIME_VISIT";
export type ShootStatus = "PLANNED" | "RESCHEDULED" | "CANCELLED";
export type Engagement = "INTERNAL" | "EXTERNAL";
export type ActiveState = "ACTIVE" | "INACTIVE";

export type AssignedResource = { id: string; name: string; role: string; teamName: string };

export type ShootDTO = {
  id: string;
  brandId: string;
  brandName: string;
  shootType: ShootType;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM, 24h, IST
  endTime: string | null;
  location: string | null;
  status: ShootStatus;
  notes?: string | null; // never present on the public calendar
  resources: AssignedResource[];
};

export type BrandDTO = { id: string; name: string; companyGroup: string | null; status: ActiveState; createdAt: string; shootsThisMonth?: number };
export type TeamDTO = { id: string; name: string; type: Engagement; status: ActiveState; memberCount?: number };
export type ResourceDTO = {
  id: string;
  name: string;
  role: string;
  teamId: string;
  teamName: string;
  teamType: Engagement; // Internal/External comes from the team
  status: ActiveState;
  shootsThisMonth?: number;
  /** Admin-only: the resource's own view-only login, if any. */
  login?: { id: string; email: string; status: ActiveState; mustChangePw: boolean; lastLoginAt: string | null } | null;
};

export type ResourceConflict = {
  resourceId: string;
  resourceName: string;
  /** clash = same person, overlapping times (blocks saving). sameVisit = overlapping but same
   *  brand + location, so the crew may be shared. untimed/sameDay only warn. */
  severity: "clash" | "untimed" | "sameDay" | "sameVisit";
  /** Why a clash isn't covered by the same-brand-and-location exception. */
  reason?: "differentBrand" | "sameType" | "differentLocation" | "noLocation";
  shoot: { id: string; brandName: string; shootType: ShootType; location: string | null; startTime: string | null; endTime: string | null };
};

export type ConflictReport = {
  dateShoots: { id: string; brandName: string; startTime: string | null; shootType: ShootType }[];
  resourceConflicts: ResourceConflict[];
};
