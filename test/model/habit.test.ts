import { describe, expect, it } from "vitest";

import {
  countLines,
  countStanzas,
  dayStamp,
  longestRun,
  monthGrid,
  projectGoalFromFrontmatter,
  projectProgress,
  readingMinutes,
  recentRun,
  sessionProgress,
  sprintFinished,
  startSprint,
  writingDays,
} from "src/model/habit";

describe("habit", () => {
  it("counts lines and stanzas for the session unit", () => {
    expect(countLines("um\ndois\n")).toBe(2);
    expect(countStanzas("estrofe um\nainda\n\nestrofe dois")).toBe(2);
  });

  it("keeps the project goal apart from the day", () => {
    const goal = projectGoalFromFrontmatter({
      "longform-goal-amount": 80000,
      "longform-goal-unit": "words",
      "longform-goal-due": "2027-06-01",
    });
    expect(goal).toEqual({
      amount: 80000,
      unit: "words",
      due: "2027-06-01",
    });
    expect(projectProgress(20000, goal!).remaining).toBe(60000);
    expect(sessionProgress(500, 500).reached).toBe(true);
  });

  it("shows writing days without punishing a pause", () => {
    const days = writingDays([
      { start: new Date("2026-11-01T10:00:00"), total: 100 },
      { start: new Date("2026-11-02T10:00:00"), total: 50 },
      { start: new Date("2026-11-05T10:00:00"), total: 20 },
    ]);
    expect(days.map((mark) => mark.day)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-05",
    ]);
    expect(longestRun(days)).toBe(2);
    expect(recentRun(days, "2026-11-05")).toBe(1);
    expect(recentRun(days, "2026-11-06")).toBe(1);
    const grid = monthGrid(2026, 11, days);
    expect(grid[0].words).toBe(100);
    expect(grid[2].words).toBe(0);
  });

  it("estimates reading time for the reader", () => {
    expect(readingMinutes(400, 200)).toBe(2);
    expect(readingMinutes(0)).toBe(0);
  });

  it("ends a sprint without a ranking", () => {
    const sprint = startSprint(60, 1_000);
    expect(sprintFinished(sprint, 1_000 + 60_000)).toBe(true);
    expect(dayStamp(new Date("2026-11-04T15:00:00"))).toBe("2026-11-04");
  });
});
