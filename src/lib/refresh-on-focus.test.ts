import { describe, it, expect } from "vitest";
import {
  REFRESH_MIN_INTERVAL_MS,
  shouldRefreshOnFocus,
} from "./refresh-on-focus";

describe("shouldRefreshOnFocus", () => {
  it("refreshes when the tab is visible and the last refresh is old enough", () => {
    // The reader comes back to a tab that has been sitting in the background
    // while an article was deleted in the admin tab.
    expect(
      shouldRefreshOnFocus({
        visible: true,
        now: 60_000,
        lastRefreshAt: 0,
      }),
    ).toBe(true);
  });

  it("does not refresh while the tab is hidden", () => {
    expect(
      shouldRefreshOnFocus({
        visible: false,
        now: 60_000,
        lastRefreshAt: 0,
      }),
    ).toBe(false);
  });

  it("does not refresh again inside the minimum interval", () => {
    // `visibilitychange` and `focus` both fire on one tab switch, and a reader
    // can alt-tab rapidly; neither should cost more than one request.
    expect(
      shouldRefreshOnFocus({
        visible: true,
        now: 1_000 + REFRESH_MIN_INTERVAL_MS - 1,
        lastRefreshAt: 1_000,
      }),
    ).toBe(false);
  });

  it("refreshes again once the minimum interval has fully elapsed", () => {
    expect(
      shouldRefreshOnFocus({
        visible: true,
        now: 1_000 + REFRESH_MIN_INTERVAL_MS,
        lastRefreshAt: 1_000,
      }),
    ).toBe(true);
  });
});
