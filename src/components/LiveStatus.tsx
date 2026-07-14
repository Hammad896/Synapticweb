import { useEffect, useMemo, useState } from "react";
import { useSiteContent } from "@/hooks/use-site-content";

const TZ = "Asia/Karachi";

const timeNow = () =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(new Date());

const hourNow = () =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: TZ,
    }).format(new Date()),
  );

/**
 * The Hijri date, straight from the browser's own calendar support. No library,
 * no lookup table, and nothing invented: `Intl` ships the Umm al-Qura
 * implementation, so the date is as correct as the platform can make it.
 */
const hijriToday = () =>
  new Intl.DateTimeFormat("en-TN-u-ca-islamic", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date());

const DAY_MS = 86_400_000;

/**
 * The live status bar above the headline.
 *
 * Three signals, and each earns its place:
 *
 *   1. Availability + the office clock. Real people, at real desks, right now.
 *   2. The Hijri date. It says plainly where this company is from. A Gulf or
 *      Pakistani client reads it instantly; nobody else is confused by it.
 *   3. The NEXT OFFICE CLOSURE. This is the one that actually helps a buyer:
 *      they want to know when you are shut. "It is a public holiday somewhere in
 *      the world today" would be trivia, and trivia here dilutes the signals
 *      that sell.
 */
const LiveStatus = () => {
  const { content } = useSiteContent();
  const [, setTick] = useState(0);

  // Re-render every 30s so the clock and the open/closed state stay honest.
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { time, hijri, isOpen, nextClosure } = useMemo(() => {
    const hour = hourNow();
    const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    const weekday = day !== 0 && day !== 6;

    // Today, at midnight, so a closure *today* still counts as upcoming.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = [...content.holidays]
      .filter((h) => h.name.trim() !== "" && h.date)
      .map((h) => ({ ...h, when: new Date(`${h.date}T00:00:00`) }))
      .filter((h) => !Number.isNaN(h.when.getTime()) && h.when >= today)
      .sort((a, b) => a.when.getTime() - b.when.getTime())[0];

    const closedToday =
      upcoming && upcoming.when.getTime() === today.getTime();

    return {
      time: timeNow(),
      hijri: hijriToday(),
      isOpen: weekday && hour >= 9 && hour < 18 && !closedToday,
      nextClosure: upcoming
        ? {
            name: upcoming.name,
            label: closedToday
              ? "Closed today"
              : upcoming.when.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                }),
            days: Math.round((upcoming.when.getTime() - today.getTime()) / DAY_MS),
          }
        : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.holidays, Math.floor(Date.now() / 30_000)]);

  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full border border-border bg-card/60 px-4 py-2 backdrop-blur-md">
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="relative flex h-2 w-2">
          {isOpen && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isOpen ? "bg-accent" : "bg-muted-foreground/50"
            }`}
          />
        </span>

        <span className="text-xs text-foreground">Accepting engagements</span>
      </span>

      <span aria-hidden="true" className="hidden text-border sm:inline">
        |
      </span>

      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">{time}</span>
        <span className="text-muted-foreground/70">Islamabad</span>
      </span>

      <span aria-hidden="true" className="hidden text-border sm:inline">
        |
      </span>

      <span className="text-xs text-muted-foreground">{hijri}</span>

      {nextClosure && (
        <>
          <span aria-hidden="true" className="hidden text-border sm:inline">
            |
          </span>

          <span
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              nextClosure.days === 0
                ? "bg-amber-500/10 text-amber-500"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {nextClosure.days === 0
              ? `Closed today, ${nextClosure.name}`
              : `Closed ${nextClosure.label}, ${nextClosure.name}`}
          </span>
        </>
      )}

      <span className="sr-only">
        Head office local time {time} in Islamabad. {hijri}.{" "}
        {isOpen ? "Currently open." : "Currently outside office hours."}
        {nextClosure ? ` Next closure: ${nextClosure.name}.` : ""}
      </span>
    </div>
  );
};

export default LiveStatus;
