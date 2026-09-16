"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { submitInquiryAction, requestViewingAction } from "../actions";

interface ActionState {
  error?: string;
  success?: boolean;
}
const initialState: ActionState = {};

export function InquiryForm({ listingReference }: { listingReference: string }) {
  const [state, formAction, pending] = useActionState(submitInquiryAction, initialState);

  if (state.success) return <p className="text-sm text-success">Thanks — we&apos;ll be in touch shortly.</p>;

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormError message={state.error} />
      <input type="hidden" name="listingReference" value={listingReference} />
      <div>
        <Label htmlFor="iq-name">Name</Label>
        <Input id="iq-name" name="name" required />
      </div>
      <div>
        <Label htmlFor="iq-email">Email</Label>
        <Input id="iq-email" name="email" type="email" />
      </div>
      <div>
        <Label htmlFor="iq-phone">Phone</Label>
        <Input id="iq-phone" name="phone" />
      </div>
      <div>
        <Label htmlFor="iq-whatsapp">WhatsApp</Label>
        <Input id="iq-whatsapp" name="whatsapp" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="iq-message">Message</Label>
        <Textarea id="iq-message" name="message" rows={3} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}

export function ViewingRequestForm({ listingReference }: { listingReference: string }) {
  const [state, formAction, pending] = useActionState(requestViewingAction, initialState);

  if (state.success) return <p className="text-sm text-success">Viewing requested — we&apos;ll confirm a time with you shortly.</p>;

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormError message={state.error} />
      <input type="hidden" name="listingReference" value={listingReference} />
      <div>
        <Label htmlFor="vw-name">Name</Label>
        <Input id="vw-name" name="name" required />
      </div>
      <div>
        <Label htmlFor="vw-email">Email</Label>
        <Input id="vw-email" name="email" type="email" />
      </div>
      <div>
        <Label htmlFor="vw-phone">Phone</Label>
        <Input id="vw-phone" name="phone" />
      </div>
      <div>
        <Label htmlFor="vw-type">Viewing type</Label>
        <Select id="vw-type" name="type" defaultValue="PHYSICAL">
          <option value="PHYSICAL">In person</option>
          <option value="VIDEO">Video call</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="vw-date">Preferred date</Label>
        <Input id="vw-date" name="preferredDate" type="date" required />
      </div>
      <div>
        <Label htmlFor="vw-time">Preferred time</Label>
        <Input id="vw-time" name="preferredTime" placeholder="e.g. 2:00 PM" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Requesting…" : "Request Viewing"}
        </Button>
      </div>
    </form>
  );
}
