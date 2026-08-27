"use client";

import { useActionState } from "react";
import { ClassifiedListingStatus } from "@prisma/client";
import { Button, Card, FormError, Input } from "@/components/shared/ui";
import { sendListingInquiryAction, toggleSavedListingAction, updateListingStatusAction, type InquiryFormState } from "../actions";

const STATUS_OPTIONS: [ClassifiedListingStatus, string][] = [
  ["ACTIVE", "Active"],
  ["RESERVED", "Reserved"],
  ["SOLD", "Sold"],
  ["REMOVED", "Removed"],
];

const initialInquiryState: InquiryFormState = {};

export function SellerControls({ estateSlug, listingId, status }: { estateSlug: string; listingId: string; status: ClassifiedListingStatus }) {
  return (
    <Card>
      <p className="mb-2 text-sm font-medium">Manage your listing</p>
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.filter(([value]) => value !== status).map(([value, label]) => (
          <form key={value} action={async () => updateListingStatusAction(estateSlug, listingId, value)}>
            <Button type="submit" variant="secondary" className="text-xs">
              Mark {label}
            </Button>
          </form>
        ))}
      </div>
    </Card>
  );
}

export function SaveListingButton({ estateSlug, listingId }: { estateSlug: string; listingId: string }) {
  return (
    <form action={async () => toggleSavedListingAction(estateSlug, listingId)}>
      <Button type="submit" variant="secondary">
        Save listing
      </Button>
    </form>
  );
}

export function ContactSellerForm({
  estateSlug,
  listingId,
  whatsappNumber,
  phoneNumber,
  contactMethods,
}: {
  estateSlug: string;
  listingId: string;
  whatsappNumber: string | null;
  phoneNumber: string | null;
  contactMethods: string[];
}) {
  const action = sendListingInquiryAction.bind(null, estateSlug, listingId);
  const [state, formAction, pending] = useActionState(action, initialInquiryState);

  return (
    <Card>
      <p className="mb-3 font-medium">Contact seller</p>
      <div className="flex flex-wrap gap-2">
        {contactMethods.includes("WHATSAPP") && whatsappNumber && (
          <a href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
            <Button type="button" variant="success">
              WhatsApp
            </Button>
          </a>
        )}
        {contactMethods.includes("PHONE") && phoneNumber && (
          <a href={`tel:${phoneNumber}`}>
            <Button type="button" variant="secondary">
              Call {phoneNumber}
            </Button>
          </a>
        )}
      </div>

      {contactMethods.includes("IN_APP") && (
        <>
          {state.sent ? (
            <p className="mt-3 text-sm text-success">Message sent — the seller will see it on their listing.</p>
          ) : (
            <form action={formAction} className="mt-3 space-y-2">
              <FormError message={state.error} />
              <Input name="message" placeholder="Message the seller…" required />
              <Button type="submit" disabled={pending}>
                {pending ? "Sending…" : "Message Seller"}
              </Button>
            </form>
          )}
        </>
      )}
    </Card>
  );
}
