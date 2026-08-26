"use client";

import Papa from "papaparse";
import { useRef, useState } from "react";
import { Button, Card } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";

function displayValue(value: unknown): string {
  if (value instanceof Date) return formatDate(value);
  return String(value ?? "");
}

export interface ValidatedRowClient<T extends Record<string, unknown>> {
  rowNumber: number;
  data: T;
  errors: string[];
}

export interface ImportResultClient {
  succeeded: number;
  failed: { rowNumber: number; error: string }[];
}

type Step = "upload" | "preview" | "done";

/**
 * Generic CSV upload -> validate -> preview -> confirm wizard. Rows never
 * touch the database until the estate admin explicitly confirms — the
 * "validate" step only reads data to check it (block/street/property
 * existence, duplicates), and "confirm" re-validates from scratch
 * server-side rather than trusting what this component already showed.
 */
export function CsvImportWizard<T extends Record<string, unknown>>({
  estateSlug,
  entityLabel,
  templateCsv,
  templateFilename,
  columns,
  validateAction,
  confirmAction,
}: {
  estateSlug: string;
  entityLabel: string;
  templateCsv: string;
  templateFilename: string;
  columns: { key: keyof T; label: string }[];
  validateAction: (estateSlug: string, rows: Record<string, string>[]) => Promise<ValidatedRowClient<T>[]>;
  confirmAction: (estateSlug: string, rows: ValidatedRowClient<T>[]) => Promise<ImportResultClient>;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [pasted, setPasted] = useState("");
  const [validatedRows, setValidatedRows] = useState<ValidatedRowClient<T>[]>([]);
  const [result, setResult] = useState<ImportResultClient | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errorCount = validatedRows.filter((r) => r.errors.length > 0).length;

  function downloadTemplate() {
    const blob = new Blob([templateCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = templateFilename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function parseAndValidate() {
    setError(undefined);
    const file = fileInputRef.current?.files?.[0];
    const text = file ? await file.text() : pasted;
    if (!text.trim()) {
      setError("Upload a file or paste CSV content first.");
      return;
    }

    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      setError(`Couldn't parse CSV: ${parsed.errors[0].message}`);
      return;
    }
    if (parsed.data.length === 0) {
      setError("No rows found in that file.");
      return;
    }

    setPending(true);
    try {
      const rows = await validateAction(estateSlug, parsed.data);
      setValidatedRows(rows);
      setStep("preview");
    } catch {
      setError("Validation failed unexpectedly. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function confirmImport() {
    setPending(true);
    try {
      const outcome = await confirmAction(estateSlug, validatedRows);
      setResult(outcome);
      setStep("done");
    } catch {
      setError("Import failed unexpectedly. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function startOver() {
    setStep("upload");
    setPasted("");
    setValidatedRows([]);
    setResult(null);
    setError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (step === "done" && result) {
    return (
      <Card>
        <h2 className="font-medium">Import complete</h2>
        {result.succeeded > 0 && (
          <p className="mt-2 text-sm font-medium text-success">
            {result.succeeded} {entityLabel} imported successfully.
          </p>
        )}
        {result.failed.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-sm font-medium text-danger">{result.failed.length} row(s) failed:</p>
            {result.failed.map((f) => (
              <p key={f.rowNumber} className="text-sm text-danger">
                Row {f.rowNumber}: {f.error}
              </p>
            ))}
          </div>
        )}
        <Button className="mt-4" onClick={startOver} variant="secondary">
          Import more
        </Button>
      </Card>
    );
  }

  if (step === "preview") {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Preview</h2>
          <p className="text-sm text-foreground-muted">
            {validatedRows.length} rows · {errorCount > 0 ? `${errorCount} with errors` : "all valid"}
          </p>
        </div>
        <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-foreground-muted">
              <tr>
                <th className="px-3 py-2">Row</th>
                {columns.map((c) => (
                  <th key={String(c.key)} className="px-3 py-2">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2">Errors</th>
              </tr>
            </thead>
            <tbody>
              {validatedRows.map((row) => (
                <tr key={row.rowNumber} className={row.errors.length > 0 ? "bg-danger/10" : "border-t border-border"}>
                  <td className="px-3 py-2 text-foreground-muted">{row.rowNumber}</td>
                  {columns.map((c) => (
                    <td key={String(c.key)} className="px-3 py-2">
                      {displayValue(row.data[c.key])}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-danger">{row.errors.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={confirmImport} disabled={pending || errorCount > 0}>
            {pending ? "Importing…" : `Confirm import (${validatedRows.length})`}
          </Button>
          <Button variant="secondary" onClick={startOver} disabled={pending}>
            Start over
          </Button>
        </div>
        {errorCount > 0 && (
          <p className="mt-2 text-sm text-foreground-muted">Fix the rows above in your CSV and re-upload to continue.</p>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Upload CSV</h2>
        <button type="button" onClick={downloadTemplate} className="text-sm text-primary underline underline-offset-4">
          Download template
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm text-foreground-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        <p className="text-center text-xs text-foreground-muted">— or paste CSV content —</p>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={6}
          placeholder="addressLabel,propertyType,..."
          className="w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
        />
      </div>
      <Button className="mt-4" onClick={parseAndValidate} disabled={pending}>
        {pending ? "Validating…" : "Parse & validate"}
      </Button>
    </Card>
  );
}
