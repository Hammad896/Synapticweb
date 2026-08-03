import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

/**
 * Click-to-sort for tables: first click ascending, second descending, third
 * back to the table's natural order. One hook + one header cell, used by
 * every sortable table so they all behave identically.
 */

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

export function useSort<T>(
  items: T[],
  accessors: Record<string, (item: T) => string | number>,
) {
  const [sort, setSort] = useState<SortState | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return items;
    const accessor = accessors[sort.key];
    if (!accessor) return items;
    const copy = [...items].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
    // accessors is a fresh object literal each render by design; key it by sort only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sort]);

  const toggle = (key: string) =>
    setSort((current) =>
      current?.key !== key
        ? { key, dir: "asc" }
        : current.dir === "asc"
          ? { key, dir: "desc" }
          : null,
    );

  return { sorted, sort, toggle };
}

export const SortTh = ({
  label,
  sortKey,
  sort,
  onToggle,
  className = "",
}: {
  label: string;
  sortKey: string;
  sort: SortState | null;
  onToggle: (key: string) => void;
  className?: string;
}) => {
  const active = sort?.key === sortKey;
  return (
    <th scope="col" className={`whitespace-nowrap px-5 py-4 ${className}`}>
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        aria-label={`Sort by ${label}`}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
        className={`flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] transition-colors ${
          active ? "text-accent" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
        {active &&
          (sort.dir === "asc" ? (
            <ArrowUp size={11} aria-hidden="true" />
          ) : (
            <ArrowDown size={11} aria-hidden="true" />
          ))}
      </button>
    </th>
  );
};
