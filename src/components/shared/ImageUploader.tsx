"use client";

import { useRef, useState } from "react";
import { getUploadUrlAction } from "@/app/[estateSlug]/community/uploadActions";

const MAX_IMAGES = 6;

/**
 * Uploads directly to storage from the browser (presigned PUT — the file
 * never passes through our server) and tracks the resulting public URLs,
 * which the caller submits as hidden `name` inputs alongside the rest of
 * the surrounding form. Silently becomes a no-op with an explanatory note
 * if photo storage isn't configured for this estate — every other field
 * in the form still works.
 */
export function ImageUploader({ estateSlug, name, initialUrls = [] }: { estateSlug: string; name: string; initialUrls?: string[] }) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [unavailable, setUnavailable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(undefined);
    setPending(true);

    try {
      for (const file of Array.from(files)) {
        if (urls.length >= MAX_IMAGES) break;

        const result = await getUploadUrlAction(estateSlug, file.name, file.type);
        if (result.error || !result.uploadUrl || !result.publicUrl) {
          if (result.error?.includes("aren't set up")) setUnavailable(true);
          setError(result.error ?? "Couldn't upload that photo.");
          continue;
        }

        const putResponse = await fetch(result.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!putResponse.ok) {
          setError("Couldn't upload that photo. Please try again.");
          continue;
        }

        setUrls((prev) => [...prev, result.publicUrl!]);
      }
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeUrl(url: string) {
    setUrls((prev) => prev.filter((u) => u !== url));
  }

  if (unavailable && urls.length === 0) {
    return <p className="text-xs text-foreground-muted">Photo uploads aren&apos;t set up for this estate yet — you can still post without one.</p>;
  }

  return (
    <div className="space-y-2">
      {urls.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-navy/80 text-xs text-white"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {urls.length < MAX_IMAGES && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={pending}
            onChange={(e) => handleFiles(e.target.files)}
            className="block w-full text-sm text-foreground-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white disabled:opacity-50"
          />
          {pending && <p className="mt-1 text-xs text-foreground-muted">Uploading…</p>}
        </div>
      )}
      {error && !unavailable && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
