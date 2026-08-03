import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** One download idiom for the whole app: blob → anchor click → late revoke
 *  (revoking immediately cancels the download in some browsers). */
export function downloadFile(filename: string, content: BlobPart, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Supabase errors are plain objects, not Error instances — read both. */
export function errorMessage(caught: unknown, fallback = "Something went wrong."): string {
  if (caught instanceof Error) return caught.message;
  if (caught && typeof caught === "object" && "message" in caught) {
    return String((caught as { message: unknown }).message);
  }
  return fallback;
}
