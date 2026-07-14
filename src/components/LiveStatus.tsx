import { useEffect, useMemo, useState } from "react";

const HOME_TZ = "Asia/Karachi";
const CLIENT_TZ = "Europe/Oslo";

const timeIn = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date());

const hourIn = (timeZone: string) =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone,
    }).format(new Date()),
  );

/**
 * The live status bar above the headline.
 *
 * It is the quietest element on the page and one of the most persuasive, because
 * every claim on it is CHECKABLE — and it answers the two questions a European
 * buyer actually has before they consider outsourcing:
 *
 *   1. "Are they real people at real desks?"  → the live office clock.
 *   2. "Will they be awake when I am?"        → Oslo's time, side by side, and
 *      an honest "in overlap / outside hours" state computed from both.
 *
 * We SAY we hold daily European overlap. This proves it, live, in the first
 * thing anyone sees — and it tells the truth at 3am rather than pretending.
 */
const LiveStatus = () => {
  const [, setTick] = useState(0);

  // Re-render every 30s so the clock and the overlap state stay honest.
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { home, client, inOverlap } = useMemo(() => {
    const homeHour = hourIn(HOME_TZ);
    const clientHour = hourIn(CLIENT_TZ);

    // Overlap = both sides inside a normal working day.
    const working = (hour: number) => hour >= 9 && hour < 18;

    return {
      home: timeIn(HOME_TZ),
      client: timeIn(CLIENT_TZ),
      inOverlap: working(homeHour) && working(clientHour),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(Date.now() / 30_000)]);

  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full border border-border bg-card/60 px-4 py-2 backdrop-blur-md">
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="relative flex h-2 w-2">
          {inOverlap && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              inOverlap ? "bg-accent" : "bg-muted-foreground/50"
            }`}
          />
        </span>

        <span className="text-xs text-foreground">Accepting engagements</span>
      </span>

      <span aria-hidden="true" className="hidden text-border sm:inline">
        |
      </span>

      {/* Two clocks. The claim is "daily European overlap" — this is the receipt. */}
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {home} <span className="text-muted-foreground/70">Islamabad</span>
        </span>
        <span aria-hidden="true" className="text-border">
          ·
        </span>
        <span className="tabular-nums">
          {client} <span className="text-muted-foreground/70">Oslo</span>
        </span>
      </span>

      <span
        className={`rounded-full px-2 py-0.5 text-[11px] ${
          inOverlap
            ? "bg-accent/10 text-accent"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {inOverlap ? "In overlap now" : "Outside office hours"}
      </span>

      <span className="sr-only">
        Head office local time {home}. Client time in Oslo {client}.{" "}
        {inOverlap
          ? "Currently within working hours in both."
          : "Currently outside working hours."}
      </span>
    </div>
  );
};

export default LiveStatus;
