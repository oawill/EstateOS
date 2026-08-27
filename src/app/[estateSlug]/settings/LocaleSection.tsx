"use client";

import { useActionState } from "react";
import { Button, Card, FormError, Input, Label, Select } from "@/components/shared/ui";
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/locale";
import { updateEstateLocaleAction, type LocaleSettingsFormState } from "./localeActions";

const initialState: LocaleSettingsFormState = {};

interface EstateLocale {
  country: string;
  currency: string;
  timezone: string;
  locale: string;
  phoneCountryCode: string;
}

export function LocaleSection({ estateSlug, locale }: { estateSlug: string; locale: EstateLocale }) {
  const action = updateEstateLocaleAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card>
      <h2 className="mb-1 font-medium">Regional & Finance</h2>
      <p className="mb-3 text-sm text-foreground-muted">
        Nigeria remains the default market, but every community can configure its own country, currency and
        timezone.
      </p>
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="country">Country</Label>
            <Select id="country" name="country" defaultValue={locale.country}>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select id="currency" name="currency" defaultValue={locale.currency}>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select id="timezone" name="timezone" defaultValue={locale.timezone}>
              {TIMEZONE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="phoneCountryCode">Phone country code</Label>
            <Input id="phoneCountryCode" name="phoneCountryCode" defaultValue={locale.phoneCountryCode} placeholder="+234" />
          </div>
        </div>
        <input type="hidden" name="locale" value={locale.locale} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save regional settings"}
        </Button>
      </form>
    </Card>
  );
}
