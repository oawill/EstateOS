import type {
  ClassifiedListingStatus,
  CommunityReportStatus,
  DemoRequestStatus,
  InvoiceStatus,
  MaintenancePriority,
  MaintenanceStatus,
} from "@prisma/client";
import type { EntryCodeStatus } from "@/server/modules/visitors/service";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, Tone> = {
  PENDING: "neutral",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  CANCELLED: "danger",
};

export const TICKET_STATUS_TONE: Record<MaintenanceStatus, Tone> = {
  REPORTED: "neutral",
  REVIEWED: "neutral",
  ASSIGNED: "warning",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "success",
};

export const VISITOR_PASS_STATUS_TONE: Record<Exclude<EntryCodeStatus, "NOT_FOUND">, Tone> = {
  VALID: "success",
  NOT_YET_STARTED: "neutral",
  EXPIRED: "danger",
  REVOKED: "danger",
};

export const PRIORITY_TONE: Record<MaintenancePriority, Tone> = {
  URGENT: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "neutral",
};

export const DEMO_REQUEST_STATUS_TONE: Record<DemoRequestStatus, Tone> = {
  NEW: "info",
  CONTACTED: "warning",
  DEMO_SCHEDULED: "info",
  DEMO_COMPLETED: "success",
  PROPOSAL_SENT: "warning",
  WON: "success",
  LOST: "danger",
  QUALIFIED: "info",
  PILOT: "warning",
  CUSTOMER: "success",
  NOT_PROCEEDING: "danger",
};

export const LISTING_STATUS_TONE: Record<ClassifiedListingStatus, Tone> = {
  ACTIVE: "success",
  RESERVED: "warning",
  SOLD: "neutral",
  EXPIRED: "neutral",
  REMOVED: "danger",
};

export const COMMUNITY_REPORT_STATUS_TONE: Record<CommunityReportStatus, Tone> = {
  OPEN: "warning",
  REVIEWED: "info",
  ACTIONED: "success",
  DISMISSED: "neutral",
};
