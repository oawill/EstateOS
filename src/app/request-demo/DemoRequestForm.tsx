"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, Card, Checkbox, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { submitDemoRequestAction, type DemoRequestFormState } from "./actions";
import {
  CHALLENGE_AREA_OPTIONS,
  FEATURE_INTEREST_OPTIONS,
  MANAGEMENT_METHOD_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  PREFERRED_CONTACT_METHOD_OPTIONS,
} from "./labels";

const STEPS = ["About You", "Your Community", "What You Need", "Schedule a Demo"] as const;

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
  const [organizationType, setOrganizationType] = useState("");
  const [stepError, setStepError] = useState<string | undefined>();
  const formRef = useRef<HTMLFormElement>(null);
  const renderedAtInputRef = useRef<HTMLInputElement>(null);

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

      <form ref={formRef} action={formAction} onKeyDown={handleFormKeyDown} className="mt-4 space-y-6">
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
            <Label htmlFor="phone">Phone / WhatsApp number *</Label>
            <Input id="phone" name="phone" required maxLength={40} />
          </div>
          <div>
            <Label htmlFor="preferredContactMethod">Preferred contact method</Label>
            <Select id="preferredContactMethod" name="preferredContactMethod" defaultValue="">
              <option value="">No preference</option>
              {PREFERRED_CONTACT_METHOD_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="organizationName">Organization / estate / company name *</Label>
            <Input id="organizationName" name="organizationName" required maxLength={200} />
          </div>
        </div>

        {/* Step 2: Your Community */}
        <div data-step="2" className={step === 2 ? "space-y-4" : "hidden"}>
          <div>
            <Label htmlFor="organizationType">Organization type *</Label>
            <Select
              id="organizationType"
              name="organizationType"
              required
              defaultValue=""
              onChange={(e) => setOrganizationType(e.target.value)}
            >
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country *</Label>
              <Input id="country" name="country" required maxLength={100} />
            </div>
            <div>
              <Label htmlFor="region">State / province / region</Label>
              <Input id="region" name="region" maxLength={100} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input id="city" name="city" required maxLength={100} />
            </div>
            <div>
              <Label htmlFor="timezone">Time zone</Label>
              <Input id="timezone" name="timezone" placeholder="e.g. WAT (UTC+1)" maxLength={60} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numberOfEstates">Number of estates/communities managed</Label>
              <Input id="numberOfEstates" name="numberOfEstates" type="number" min={1} step={1} />
            </div>
            <div>
              <Label htmlFor="numberOfUnits">Number of units/properties *</Label>
              <Input id="numberOfUnits" name="numberOfUnits" type="number" min={1} step={1} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numberOfResidents">Approx. number of residents/occupants</Label>
              <Input id="numberOfResidents" name="numberOfResidents" type="number" min={1} step={1} />
            </div>
            {organizationType === "SHORTLET_OPERATOR" && (
              <div>
                <Label htmlFor="shortletUnits">Approx. number of shortlet units</Label>
                <Input id="shortletUnits" name="shortletUnits" type="number" min={1} step={1} />
              </div>
            )}
          </div>
        </div>

        {/* Step 3: What You Need */}
        <div data-step="3" className={step === 3 ? "space-y-6" : "hidden"}>
          <div>
            <Label>Current management method</Label>
            <CheckboxGroup name="currentManagementMethods" options={MANAGEMENT_METHOD_OPTIONS} />
          </div>
          <div>
            <Label>Main challenges</Label>
            <CheckboxGroup name="challenges" options={CHALLENGE_AREA_OPTIONS} />
          </div>
          <div>
            <Label>Features of interest</Label>
            <CheckboxGroup name="interestedFeatures" options={FEATURE_INTEREST_OPTIONS} />
          </div>
          <div>
            <Label htmlFor="currentSoftware">Current software, if any</Label>
            <Input id="currentSoftware" name="currentSoftware" maxLength={200} />
          </div>
          <div>
            <Label htmlFor="primaryObjective">Primary objective for EstateOS</Label>
            <Textarea id="primaryObjective" name="primaryObjective" rows={3} maxLength={1000} />
          </div>
        </div>

        {/* Step 4: Schedule a Demo */}
        <div data-step="4" className={step === 4 ? "space-y-4" : "hidden"}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="preferredDemoDate">Preferred demo date</Label>
              <Input id="preferredDemoDate" name="preferredDemoDate" type="date" />
            </div>
            <div>
              <Label htmlFor="preferredDemoTime">Preferred time</Label>
              <Input id="preferredDemoTime" name="preferredDemoTime" placeholder="e.g. Morning, 2pm WAT" maxLength={60} />
            </div>
          </div>
          <div>
            <Label htmlFor="alternateDemoDatetime">Alternative date/time</Label>
            <Input id="alternateDemoDatetime" name="alternateDemoDatetime" maxLength={200} />
          </div>
          <p className="text-xs text-foreground-muted">
            This is a scheduling preference, not a confirmed appointment — our team will follow up to confirm.
          </p>
          <div>
            <Label htmlFor="comments">Additional comments</Label>
            <Textarea id="comments" name="comments" rows={3} maxLength={2000} />
          </div>
          <div>
            <Label htmlFor="referralSource">How did you hear about EstateOS?</Label>
            <Input id="referralSource" name="referralSource" maxLength={200} />
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
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : "Submit request"}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
