import { useEffect, useState } from "react";

const TIME_ZONE = "Asia/Karachi";

const formatOfficeTime = () =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(new Date());

/**
 * A live clock for the head office, next to an availability signal.
 *
 * This is the quietest element on the page and one of the most persuasive: it
 * says a real team is at real desks in a real timezone, and it is the first
 * thing a buyer abroad checks before they consider outsourcing to you. It also
 * quietly answers the overlap question that every European client asks.
 *
 * The dot's ping is decorative and dies under `prefers-reduced-motion`.
 */
const LiveStatus = () => {
  const [time, setTime] = useState(formatOfficeTime);

  useEffect(() => {
    const id = window.setInterval(() => setTime(formatOfficeTime()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card/60 px-4 py-2 backdrop-blur-md">
      <span aria-hidden="true" className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>

      <p className="text-xs tracking-[0.08em] text-muted-foreground">
        <span className="text-foreground">Accepting engagements</span>
        <span aria-hidden="true" className="mx-2 text-border">
          |
        </span>
        <span>
          {time} in Islamabad
          <span className="sr-only"> — head office local time</span>
        </span>
      </p>
    </div>
  );
};

export default LiveStatus;
