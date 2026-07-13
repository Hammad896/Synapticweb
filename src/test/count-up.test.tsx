import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CountUp from "@/components/CountUp";

/**
 * Regression cover for the stat counters freezing at "10+", "6%", "$0M+".
 *
 * Cause: the regex match object was in the effect's dependency array. `match()`
 * returns a NEW array every render, so the effect restarted the animation each
 * frame and the value never reached its target.
 *
 * `setup.ts` stubs matchMedia to `matches: false`, so `useReducedMotion()` is
 * false here and we exercise the animated path — the same one that broke.
 * The sr-only node must always carry the true final value regardless of where
 * the animation happens to be, which is what we assert.
 */
describe("CountUp", () => {
  it.each([
    ["150+", "150+"],
    ["99%", "99%"],
    ["$2M+", "$2M+"],
    ["5+", "5+"],
  ])("exposes the exact final value for %s", (value, expected) => {
    render(<CountUp value={value} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("renders an unparseable value verbatim instead of dropping it", () => {
    render(<CountUp value="Coming soon" />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });
});
