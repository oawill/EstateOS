"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, Card, Checkbox, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { submitDemoRequestAction, type DemoRequestFormState } from "./actions";
import {
  FEATURE_INTEREST_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  PRIMARY_CHALLENGE_OPTIONS,
  UNIT_RANGE_OPTIONS,
} from "./labels";

const STEPS = ["About You", "Your Operation", "What Do You Need", "Demo Preference"] as const;

const initialState: DemoRequestFormState = {};

/** Every step's fields stay mounted (just hidden) so nothing is ever lost moving between steps. */
function CheckboxGroup({ name, options }: { name: string; options: [string, string][] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map(([value, label]) => (
        <Checkbox key={value} name={name} value={value} label={label} />
      ))}
    </div>
  );
}

export function DemoRequestForm() {
  const [state, formAction, pending] = useActionState(submitDemoRequestAction, initialState);
  const [step, setStep] = useState(1);
  const [interestedFeatures, setInterestedFeatures] = useState<string[]>([]);
  const [stepError, setStepError] = useState<string | undefined>();
  const formRef = useRef<HTMLFormElement>(null);
  const renderedAtInputRef = useRef<HTMLInputElement>(null);
  // Belt-and-braces double-submit guard, alongside the disabled-while-pending
  // button below — blocks a second Server Action call if a click lands
  // before `pending` has visually updated.
  const hasSubmittedRef = useRef(false);

  const wantsShortlet = interestedFeatures.includes("SHORTLET_MANAGEMENT");

  useEffect(() => {
    if (renderedAtInputRef.current) renderedAtInputRef.current.value = String(Date.now());
  }, []);

  function goToStep(target: number) {
    setStepError(undefined);
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNext() {
    const container = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (container) {
      const requiredFields = container.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[required]");
      for (const field of requiredFields) {
        if (!field.reportValidity()) {
          setStepError("Please fill in the required fields before continuing.");
          return;
        }
      }
    }
    goToStep(Math.min(step + 1, STEPS.length));
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && step < STEPS.length) {
      e.preventDefault();
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (hasSubmittedRef.current) {
      e.preventDefault();
      return;
    }
    hasSubmittedRef.current = true;
  }

  return (
    <Card>
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-medium text-foreground-muted">
          <span>
            Step {step} of {STEPS.length}
          </span>
          <span>{STEPS[step - 1]}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <FormError message={state.error ?? stepError} />

      <form ref={formRef} action={formAction} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="mt-4 space-y-6">
        {/* Honeypot — real users never see or fill this. */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <input ref={renderedAtInputRef} type="hidden" name="renderedAt" defaultValue={0} />

        {/* Step 1: About You */}
        <div data-step="1" className={step === 1 ? "space-y-4" : "hidden"}>
          <div>
            <Label htmlFor="fullName">Full name *</Label>
            <Input id="fullName" name="fullName" required maxLength={160} />
          </div>
          <div>
            <Label htmlFor="email">Work email *</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="phone">WhatsApp / phone number *</Label>
            <Input id="phone" name="phone" required maxLength={40} />
          </div>
          <div>
            <Label htmlFor="organizationName">Organization name *</Label>
            <Input id="organizationName" name="organizationName" required maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country *</Label>
              <Input id="country" name="country" required maxLength={100} />
            </div>
            <div>
              <Label htmlFor="city">City *</Label>
              <Input id="city" name="city" required maxLength={100} />
            </div>
          </div>
        </div>

        {/* Step 2: Your Operation */}
        <div data-step="2" className={step === 2 ? "space-y-4" : "hidden"}>
          <div>
            <Label htmlFor="organizationType">What best describes your organization? *</Label>
            <Select id="organizationType" name="organizationType" required defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              {ORGANIZATION_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="unitRange">How many units/properties do you manage? *</Label>
            <Select id="unitRange" name="unitRange" required defaultValue="">
              <option value="" disabled>
                Select a range
              </option>
              {UNIT_RANGE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="primaryChallenge">What is your biggest operational challenge?</Label>
            <Select id="primaryChallenge" name="primaryChallenge" defaultValue="">
              <option value="">Select one (optional)</option>
              {PRIMARY_CHALLENGE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Step 3: What Do You Need */}
        <div data-step="3" className={step === 3 ? "space-y-6" : "hidden"}>
          <div>
            <Label>What do you need?</Label>
            <div
              onChange={(e) => {
                const checkbox = e.target as HTMLInputElement;
                if (checkbox.name !== "interestedFeatures") return;
                setInterestedFeatures((prev) =>
                  checkbox.checked ? [...prev, checkbox.value] : prev.filter((v) => v !== checkbox.value),
                );
              }}
            >
              <CheckboxGroup name="interestedFeatures" options={FEATURE_INTEREST_OPTIONS} />
            </div>
          </div>

          {wantsShortlet && (
            <div className="space-y-4 rounded-lg border border-border bg-surface-muted p-4">
              <p className="text-sm font-medium">A bit more about your shortlet operation</p>
              <div>
                <Label htmlFor="shortletUnits">Number of shortlet units</Label>
                <Input id="shortletUnits" name="shortletUnits" type="number" min={1} step={1} />
              </div>
              <div>
                <Label htmlFor="shortletBookingProcess">Current booking process</Label>
                <Input id="shortletBookingProcess" name="shortletBookingProcess" maxLength={500} />
              </div>
              <div>
                <Label htmlFor="shortletChallenge">Main shortlet challenge</Label>
                <Input id="shortletChallenge" name="shortletChallenge" maxLength={500} />
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Demo Preference */}
        <div data-step="4" className={step === 4 ? "space-y-4" : "hidden"}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="preferredDemoDate">Preferred date</Label>
              <Input id="preferredDemoDate" name="preferredDemoDate" type="date" />
            </div>
            <div>
              <Label htmlFor="preferredDemoTime">Preferred time</Label>
              <Input id="preferredDemoTime" name="preferredDemoTime" placeholder="e.g. Morning, 2pm WAT" maxLength={60} />
            </div>
          </div>
          <div>
            <Label htmlFor="timezone">Time zone</Label>
            <Input id="timezone" name="timezone" placeholder="e.g. WAT (UTC+1)" maxLength={60} />
          </div>
          <p className="text-xs text-foreground-muted">
            This is a scheduling preference, not a confirmed appointment — our team will follow up to confirm.
          </p>
          <div>
            <Label htmlFor="comments">Additional comments</Label>
            <Textarea id="comments" name="comments" rows={3} maxLength={2000} />
          </div>
          <Checkbox
            name="consent"
            required
            label="I agree that EstateOS may contact me regarding my demo request. *"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          {step > 1 ? (
            <Button type="button" variant="secondary" onClick={() => goToStep(step - 1)} disabled={pending}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length ? (
            <Button type="button" onClick={handleNext}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : "Request My Demo"}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
