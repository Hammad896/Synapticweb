/** Formatters shared across the admin panel. One definition, one behaviour. */

export const money = (amount: number, currency: string): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: amount >= 1_000_000 ? "compact" : "standard",
  }).format(amount);

export const shortDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const initialsOf = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

export const monthsSince = (iso: string): number =>
  iso ? (Date.now() - new Date(iso).getTime()) / MS_PER_MONTH : 0;

export const tenure = (iso: string): string => {
  if (!iso) return "—";
  const months = monthsSince(iso);
  if (months < 1) return "New";
  if (months < 12) return `${Math.floor(months)} mo`;
  return `${(months / 12).toFixed(1)} yr`;
};
