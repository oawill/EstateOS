import QRCode from "qrcode";
import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { formatDateTime } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NotFoundError } from "@/lib/errors";
import { VISITOR_PASS_STATUS_TONE as STATUS_TONE } from "@/lib/statusTones";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { getEstateLocale } from "@/server/modules/estates/service";
import { getPassForResident, passStatus } from "@/server/modules/visitors/service";
import { signVisitorToken } from "@/server/modules/visitors/token";
import { cancelVisitorPassAction } from "../actions";

const PASS_TYPE_LABEL: Record<string, string> = {
  VISITOR: "Visitor",
  VEHICLE: "Vehicle",
  DELIVERY: "Delivery",
};

export default async function VisitorPassPage({
  params,
}: {
  params: Promise<{ estateSlug: string; passId: string }>;
}) {
  const { estateSlug, passId } = await params;

  const { membership, pass, estateLocale } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "own-visitors:*");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    const [pass, estateLocale] = await Promise.all([
      getPassForResident(membership.estateId, resident.id, passId),
      getEstateLocale(membership.estateId),
    ]);
    return { membership, pass, estateLocale };
  });
  const status = passStatus(pass);
  const fmt = (date: Date) => formatDateTime(date, estateLocale.timezone, estateLocale.locale);

  const token = signVisitorToken(membership.estateId, pass.id);
  const qrDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 240 });

  const whatsappMessage = encodeURIComponent(
    `Hi ${pass.visitorName}, you're invited to ${membership.estateName}. Your visitor PIN is ${pass.pin}, valid from ${fmt(
      pass.startTime,
    )} to ${fmt(pass.expiresAt)}. Show this PIN (or the QR code) at the gate.`,
  );

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <Link href={`/${estateSlug}/visitors`} className="text-sm text-slate-500 underline underline-offset-4">
        ← All visitors
      </Link>

      <Card className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Gate pass created</p>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{pass.visitorName}</h1>
          <div className="flex items-center gap-1.5">
            <Badge>{PASS_TYPE_LABEL[pass.passType] ?? pass.passType}</Badge>
            <Badge tone={STATUS_TONE[status]}>{status === "REVOKED" ? "CANCELLED" : status.replaceAll("_", " ")}</Badge>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {fmt(pass.startTime)} – {fmt(pass.expiresAt)}
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Visitor QR code" className="mx-auto mt-4 h-60 w-60" />

        <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">Backup PIN</p>
        <p className="text-3xl font-semibold tracking-widest">{pass.pin}</p>

        {pass.vehicleNumber && <p className="mt-3 text-sm text-slate-500">Vehicle: {pass.vehicleNumber}</p>}
        {pass.note && <p className="mt-1 text-sm text-slate-500">Note: {pass.note}</p>}

        {status === "VALID" || status === "NOT_YET_STARTED" ? (
          <a
            href={`https://wa.me/?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Share Pass via WhatsApp
          </a>
        ) : null}

        <div className="mt-3 space-y-2">
          {(status === "VALID" || status === "NOT_YET_STARTED") && (
            <form
              action={async () => {
                "use server";
                await cancelVisitorPassAction(estateSlug, pass.id);
              }}
            >
              <Button type="submit" variant="danger" className="w-full">
                Cancel Pass
              </Button>
            </form>
          )}
          <Link href={`/${estateSlug}/visitors/new`}>
            <Button type="button" variant="secondary" className="w-full">
              Invite Another Visitor
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
