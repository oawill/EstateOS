import QRCode from "qrcode";
import Link from "next/link";
import { Badge, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { getPassForResident, passStatus } from "@/server/modules/visitors/service";
import { signVisitorToken } from "@/server/modules/visitors/token";

const STATUS_TONE = {
  VALID: "success",
  NOT_YET_STARTED: "neutral",
  EXPIRED: "danger",
  REVOKED: "danger",
} as const;

export default async function VisitorPassPage({
  params,
}: {
  params: Promise<{ estateSlug: string; passId: string }>;
}) {
  const { estateSlug, passId } = await params;

  const { membership, pass } = await guardPage(async () => {
    const { user, membership } = await requireEstatePermission(estateSlug, "own-visitors:*");
    const resident = await getResidentByUserId(membership.estateId, user.id);
    if (!resident) throw new NotFoundError("Resident profile");
    const pass = await getPassForResident(membership.estateId, resident.id, passId);
    return { membership, pass };
  });
  const status = passStatus(pass);

  const token = signVisitorToken(membership.estateId, pass.id);
  const qrDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 240 });

  const whatsappMessage = encodeURIComponent(
    `Hi ${pass.visitorName}, you're invited to ${membership.estateName}. Your visitor PIN is ${pass.pin}, valid from ${formatDate(
      pass.startTime,
    )} to ${formatDate(pass.expiresAt)}. Show this PIN (or the QR code) at the gate.`,
  );

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <Link href={`/${estateSlug}/visitors`} className="text-sm text-slate-500 underline underline-offset-4">
        ← All visitors
      </Link>

      <Card className="text-center">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{pass.visitorName}</h1>
          <Badge tone={STATUS_TONE[status]}>{status.replaceAll("_", " ")}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {formatDate(pass.startTime)} – {formatDate(pass.expiresAt)}
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Visitor QR code" className="mx-auto mt-4 h-60 w-60" />

        <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">Backup PIN</p>
        <p className="text-3xl font-semibold tracking-widest">{pass.pin}</p>

        {pass.vehicleNumber && <p className="mt-3 text-sm text-slate-500">Vehicle: {pass.vehicleNumber}</p>}
        {pass.note && <p className="mt-1 text-sm text-slate-500">Note: {pass.note}</p>}

        <a
          href={`https://wa.me/?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 block rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Share via WhatsApp
        </a>
      </Card>
    </div>
  );
}
