import type {
  Announcement,
  Block,
  Charge,
  ClassifiedCategory,
  ClassifiedImage,
  ClassifiedListing,
  CommunityComment,
  CommunityEvent,
  CommunityPost,
  CommunityPostImage,
  CommunityReaction,
  CommunityReport,
  CommunitySavedListing,
  CommunitySavedPost,
  CommunitySettings,
  EventRsvp,
  GateEntry,
  Invoice,
  ListingInquiry,
  MaintenanceComment,
  MaintenanceTicket,
  MeterReading,
  Notification,
  Payment,
  Prisma,
  Property,
  Receipt,
  Resident,
  Street,
  Unit,
  UtilityBill,
  UtilityMeter,
  Vehicle,
  Vendor,
  VisitorPass,
  Zone,
} from "@prisma/client";
import { prisma } from "./client";

/**
 * Thrown when a mutation targets a record that either doesn't exist or
 * doesn't belong to the caller's estate. Deliberately doesn't distinguish
 * the two cases in its message, so it never leaks whether a record exists
 * in another tenant.
 */
export class TenantScopeError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found in this estate`);
    this.name = "TenantScopeError";
  }
}

/**
 * Generic CRUD surface for a model that carries a top-level `estateId`
 * column. Every method injects `estateId` into the query itself (never
 * trusting a value passed in from the caller) so it is structurally
 * impossible to read or mutate another tenant's row through this API.
 */
interface ScopedDelegate<TWhere, TModel, TCreateData, TUpdateData> {
  // Generic over the return shape so a call site can pass `include`/`select`
  // and type the richer result itself — the estateId injection happens
  // either way, so widening the shape here never widens tenant access.
  findMany<T = TModel>(args?: { where?: TWhere; orderBy?: object; include?: object; select?: object }): Promise<T[]>;
  findById<T = TModel>(id: string, args?: { include?: object; select?: object }): Promise<T | null>;
  create(data: TCreateData): Promise<TModel>;
  update(id: string, data: TUpdateData): Promise<TModel>;
  remove(id: string): Promise<void>;
}

export function makeScopedDelegate<
  TWhere extends object,
  TModel,
  TCreateData extends object,
  TUpdateData extends object,
>(
  delegate: {
    findMany(args: unknown): Promise<unknown[]>;
    findFirst(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<TModel>;
    updateMany(args: unknown): Promise<{ count: number }>;
    deleteMany(args: unknown): Promise<{ count: number }>;
  },
  entityName: string,
  estateId: string,
): ScopedDelegate<TWhere, TModel, TCreateData, TUpdateData> {
  return {
    findMany<T = TModel>(args: { where?: TWhere; orderBy?: object; include?: object; select?: object } = {}) {
      return delegate.findMany({ ...args, where: { ...(args.where ?? {}), estateId } }) as Promise<T[]>;
    },

    findById<T = TModel>(id: string, args: { include?: object; select?: object } = {}) {
      return delegate.findFirst({ ...args, where: { id, estateId } }) as Promise<T | null>;
    },

    create: (data) => delegate.create({ data: { ...data, estateId } }),

    update: async (id, data) => {
      const result = await delegate.updateMany({ where: { id, estateId }, data });
      if (result.count === 0) throw new TenantScopeError(entityName, id);
      return (await delegate.findFirst({ where: { id, estateId } })) as TModel;
    },

    remove: async (id) => {
      const result = await delegate.deleteMany({ where: { id, estateId } });
      if (result.count === 0) throw new TenantScopeError(entityName, id);
    },
  };
}

/**
 * The only supported way to read or write tenant-owned tables.
 * `estateId` must come from the authenticated session's active membership
 * (see `server/auth/session.ts`), never from client-supplied input, so
 * every query built here is automatically confined to one estate.
 */
export function scoped(estateId: string) {
  return {
    block: makeScopedDelegate<
      Prisma.BlockWhereInput,
      Block,
      Omit<Prisma.BlockCreateInput, "estateId" | "estate">,
      Prisma.BlockUpdateInput
    >(prisma.block, "Block", estateId),

    street: makeScopedDelegate<
      Prisma.StreetWhereInput,
      Street,
      Omit<Prisma.StreetCreateInput, "estateId" | "estate">,
      Prisma.StreetUpdateInput
    >(prisma.street, "Street", estateId),

    zone: makeScopedDelegate<
      Prisma.ZoneWhereInput,
      Zone,
      Omit<Prisma.ZoneCreateInput, "estateId" | "estate">,
      Prisma.ZoneUpdateInput
    >(prisma.zone, "Zone", estateId),

    property: makeScopedDelegate<
      Prisma.PropertyWhereInput,
      Property,
      Omit<Prisma.PropertyCreateInput, "estateId" | "estate">,
      Prisma.PropertyUpdateInput
    >(prisma.property, "Property", estateId),

    unit: makeScopedDelegate<
      Prisma.UnitWhereInput,
      Unit,
      Omit<Prisma.UnitCreateInput, "estateId" | "estate">,
      Prisma.UnitUpdateInput
    >(prisma.unit, "Unit", estateId),

    resident: makeScopedDelegate<
      Prisma.ResidentWhereInput,
      Resident,
      Omit<Prisma.ResidentCreateInput, "estateId" | "estate">,
      Prisma.ResidentUpdateInput
    >(prisma.resident, "Resident", estateId),

    vehicle: makeScopedDelegate<
      Prisma.VehicleWhereInput,
      Vehicle,
      Omit<Prisma.VehicleUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.VehicleUpdateInput
    >(prisma.vehicle, "Vehicle", estateId),

    charge: makeScopedDelegate<
      Prisma.ChargeWhereInput,
      Charge,
      Omit<Prisma.ChargeCreateInput, "estateId" | "estate">,
      Prisma.ChargeUpdateInput
    >(prisma.charge, "Charge", estateId),

    invoice: makeScopedDelegate<
      Prisma.InvoiceWhereInput,
      Invoice,
      Omit<Prisma.InvoiceUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.InvoiceUpdateInput
    >(prisma.invoice, "Invoice", estateId),

    payment: makeScopedDelegate<
      Prisma.PaymentWhereInput,
      Payment,
      Omit<Prisma.PaymentUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.PaymentUpdateInput
    >(prisma.payment, "Payment", estateId),

    receipt: makeScopedDelegate<
      Prisma.ReceiptWhereInput,
      Receipt,
      Omit<Prisma.ReceiptUncheckedCreateInput, "estateId" | "id" | "issuedAt">,
      Prisma.ReceiptUpdateInput
    >(prisma.receipt, "Receipt", estateId),

    visitorPass: makeScopedDelegate<
      Prisma.VisitorPassWhereInput,
      VisitorPass,
      Omit<Prisma.VisitorPassUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.VisitorPassUpdateInput
    >(prisma.visitorPass, "VisitorPass", estateId),

    gateEntry: makeScopedDelegate<
      Prisma.GateEntryWhereInput,
      GateEntry,
      Omit<Prisma.GateEntryUncheckedCreateInput, "estateId" | "id" | "checkInAt">,
      Prisma.GateEntryUpdateInput
    >(prisma.gateEntry, "GateEntry", estateId),

    vendor: makeScopedDelegate<
      Prisma.VendorWhereInput,
      Vendor,
      Omit<Prisma.VendorCreateInput, "estateId" | "estate">,
      Prisma.VendorUpdateInput
    >(prisma.vendor, "Vendor", estateId),

    maintenanceTicket: makeScopedDelegate<
      Prisma.MaintenanceTicketWhereInput,
      MaintenanceTicket,
      Omit<Prisma.MaintenanceTicketUncheckedCreateInput, "estateId" | "id" | "createdAt" | "updatedAt">,
      Prisma.MaintenanceTicketUncheckedUpdateInput
    >(prisma.maintenanceTicket, "MaintenanceTicket", estateId),

    maintenanceComment: makeScopedDelegate<
      Prisma.MaintenanceCommentWhereInput,
      MaintenanceComment,
      Omit<Prisma.MaintenanceCommentUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.MaintenanceCommentUpdateInput
    >(prisma.maintenanceComment, "MaintenanceComment", estateId),

    utilityMeter: makeScopedDelegate<
      Prisma.UtilityMeterWhereInput,
      UtilityMeter,
      Omit<Prisma.UtilityMeterUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.UtilityMeterUpdateInput
    >(prisma.utilityMeter, "UtilityMeter", estateId),

    meterReading: makeScopedDelegate<
      Prisma.MeterReadingWhereInput,
      MeterReading,
      Omit<Prisma.MeterReadingUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.MeterReadingUpdateInput
    >(prisma.meterReading, "MeterReading", estateId),

    utilityBill: makeScopedDelegate<
      Prisma.UtilityBillWhereInput,
      UtilityBill,
      Omit<Prisma.UtilityBillUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.UtilityBillUpdateInput
    >(prisma.utilityBill, "UtilityBill", estateId),

    announcement: makeScopedDelegate<
      Prisma.AnnouncementWhereInput,
      Announcement,
      Omit<Prisma.AnnouncementUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.AnnouncementUpdateInput
    >(prisma.announcement, "Announcement", estateId),

    notification: makeScopedDelegate<
      Prisma.NotificationWhereInput,
      Notification,
      Omit<Prisma.NotificationUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.NotificationUpdateInput
    >(prisma.notification, "Notification", estateId),

    communitySettings: makeScopedDelegate<
      Prisma.CommunitySettingsWhereInput,
      CommunitySettings,
      Omit<Prisma.CommunitySettingsUncheckedCreateInput, "estateId" | "id" | "createdAt" | "updatedAt">,
      Prisma.CommunitySettingsUpdateInput
    >(prisma.communitySettings, "CommunitySettings", estateId),

    classifiedCategory: makeScopedDelegate<
      Prisma.ClassifiedCategoryWhereInput,
      ClassifiedCategory,
      Omit<Prisma.ClassifiedCategoryUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.ClassifiedCategoryUpdateInput
    >(prisma.classifiedCategory, "ClassifiedCategory", estateId),

    classifiedListing: makeScopedDelegate<
      Prisma.ClassifiedListingWhereInput,
      ClassifiedListing,
      Omit<Prisma.ClassifiedListingUncheckedCreateInput, "estateId" | "id" | "createdAt" | "updatedAt">,
      Prisma.ClassifiedListingUncheckedUpdateInput
    >(prisma.classifiedListing, "ClassifiedListing", estateId),

    classifiedImage: makeScopedDelegate<
      Prisma.ClassifiedImageWhereInput,
      ClassifiedImage,
      Omit<Prisma.ClassifiedImageUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.ClassifiedImageUpdateInput
    >(prisma.classifiedImage, "ClassifiedImage", estateId),

    communitySavedListing: makeScopedDelegate<
      Prisma.CommunitySavedListingWhereInput,
      CommunitySavedListing,
      Omit<Prisma.CommunitySavedListingUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.CommunitySavedListingUpdateInput
    >(prisma.communitySavedListing, "CommunitySavedListing", estateId),

    listingInquiry: makeScopedDelegate<
      Prisma.ListingInquiryWhereInput,
      ListingInquiry,
      Omit<Prisma.ListingInquiryUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.ListingInquiryUpdateInput
    >(prisma.listingInquiry, "ListingInquiry", estateId),

    communityPost: makeScopedDelegate<
      Prisma.CommunityPostWhereInput,
      CommunityPost,
      Omit<Prisma.CommunityPostUncheckedCreateInput, "estateId" | "id" | "createdAt" | "updatedAt">,
      Prisma.CommunityPostUncheckedUpdateInput
    >(prisma.communityPost, "CommunityPost", estateId),

    communityPostImage: makeScopedDelegate<
      Prisma.CommunityPostImageWhereInput,
      CommunityPostImage,
      Omit<Prisma.CommunityPostImageUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.CommunityPostImageUpdateInput
    >(prisma.communityPostImage, "CommunityPostImage", estateId),

    communityComment: makeScopedDelegate<
      Prisma.CommunityCommentWhereInput,
      CommunityComment,
      Omit<Prisma.CommunityCommentUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.CommunityCommentUpdateInput
    >(prisma.communityComment, "CommunityComment", estateId),

    communityReaction: makeScopedDelegate<
      Prisma.CommunityReactionWhereInput,
      CommunityReaction,
      Omit<Prisma.CommunityReactionUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.CommunityReactionUpdateInput
    >(prisma.communityReaction, "CommunityReaction", estateId),

    communitySavedPost: makeScopedDelegate<
      Prisma.CommunitySavedPostWhereInput,
      CommunitySavedPost,
      Omit<Prisma.CommunitySavedPostUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.CommunitySavedPostUpdateInput
    >(prisma.communitySavedPost, "CommunitySavedPost", estateId),

    communityEvent: makeScopedDelegate<
      Prisma.CommunityEventWhereInput,
      CommunityEvent,
      Omit<Prisma.CommunityEventUncheckedCreateInput, "estateId" | "id" | "createdAt" | "updatedAt">,
      Prisma.CommunityEventUpdateInput
    >(prisma.communityEvent, "CommunityEvent", estateId),

    eventRsvp: makeScopedDelegate<
      Prisma.EventRsvpWhereInput,
      EventRsvp,
      Omit<Prisma.EventRsvpUncheckedCreateInput, "estateId" | "id" | "createdAt" | "updatedAt">,
      Prisma.EventRsvpUncheckedUpdateInput
    >(prisma.eventRsvp, "EventRsvp", estateId),

    communityReport: makeScopedDelegate<
      Prisma.CommunityReportWhereInput,
      CommunityReport,
      Omit<Prisma.CommunityReportUncheckedCreateInput, "estateId" | "id" | "createdAt">,
      Prisma.CommunityReportUncheckedUpdateInput
    >(prisma.communityReport, "CommunityReport", estateId),
  };
}

export type Scoped = ReturnType<typeof scoped>;
