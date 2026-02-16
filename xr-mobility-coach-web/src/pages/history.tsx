import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSessionDetail, listSessions } from "@/lib/sessions";
import type { SessionDetail, SessionSummary } from "@/lib/sessions";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Loader2 } from "lucide-react";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Utility functions for date formatting and calendar calculations
function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateParam(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalDateKey(isoDateTime: string) {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateParam(date);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getOrdinal(day: number) {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  if (day % 10 === 1) return "st";
  if (day % 10 === 2) return "nd";
  if (day % 10 === 3) return "rd";
  return "th";
}

// Formatting functions for display of dates, times, durations, and heatmap labels in the UI
function formatDayHeader(dateKey: string) {
  if (!dateKey) return "Select a day";
  const date = parseDateKey(dateKey);
  if (Number.isNaN(date.getTime())) return "Select a day";

  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
  const year = date.getFullYear();
  const day = date.getDate();
  return `${month} ${day}${getOrdinal(day)}, ${year}`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

// Formats session end time with month, day, and time for display in the session detail header.
function formatSessionDateTime(isoDateTime: string) {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatSessionTime(isoDateTime: string) {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDurationMinutes(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function formatMonthlyTotal(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes}m`;
}

function monthPrefix(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

// Formats exercise count with proper pluralization for display in session cards and details.
function buildCalendarCells(viewMonth: Date) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ key: string; day: number } | null> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = formatDateParam(new Date(year, month, day));
    cells.push({ key, day });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}


type YearHeatmapCell = {
  dateKey: string;
  inYear: boolean;
  count: number;
};

type YearHeatmapWeek = {
  weekIndex: number;
  days: YearHeatmapCell[];
};

type YearHeatmapMonthLabel = {
  weekIndex: number;
  label: string;
};

function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function endOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d;
}

// Builds the data structure needed to render a year long heatmap calendar, including counts of sessions per day and labels for each month.
function buildYearHeatmap(year: number, dayCounts: Record<string, number>) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const gridStart = startOfWeek(start);
  const gridEnd = endOfWeek(end);

  const weeks: YearHeatmapWeek[] = [];
  const cursor = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate());
  let weekIndex = 0;

  while (cursor <= gridEnd) {
    const days: YearHeatmapCell[] = [];

    for (let i = 0; i < 7; i += 1) {
      const dateKey = formatDateParam(cursor);
      days.push({
        dateKey,
        inYear: cursor.getFullYear() === year,
        count: dayCounts[dateKey] ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push({ weekIndex, days });
    weekIndex += 1;
  }

  const monthLabels: YearHeatmapMonthLabel[] = [];
  for (let month = 0; month < 12; month += 1) {
    const monthStart = new Date(year, month, 1);
    // Month labels are positioned by week index so headers align with the heatmap columns.
    const monthWeekIndex = Math.floor(
      (startOfWeek(monthStart).getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24 * 7),
    );
    const label = new Intl.DateTimeFormat("en-US", { month: "short" }).format(monthStart);
    if (!monthLabels.some((entry) => entry.weekIndex === monthWeekIndex)) {
      monthLabels.push({ weekIndex: monthWeekIndex, label });
    }
  }

  return { weeks, monthLabels };
}

type AggregatedExerciseMetric = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string | null;
  setCount: number;
  completedSets: number;
  skippedSets: number;
  repsTotal: number;
  tutTotal: number;
  averageRpe: number | null;
};

function aggregateMetrics(detail: SessionDetail): AggregatedExerciseMetric[] {
  const byExercise = new Map<
    string,
    {
      exerciseId: string;
      exerciseName: string;
      muscleGroup?: string | null;
      setCount: number;
      completedSets: number;
      skippedSets: number;
      repsTotal: number;
      tutTotal: number;
      rpeSum: number;
      rpeCount: number;
    }
  >();

  detail.metrics.forEach((metric) => {
    // Aggregate set level records into one row per exercise for a compact detail panel.
    const current = byExercise.get(metric.exerciseId) ?? {
      exerciseId: metric.exerciseId,
      exerciseName: metric.exerciseName,
      muscleGroup: metric.muscleGroup,
      setCount: 0,
      completedSets: 0,
      skippedSets: 0,
      repsTotal: 0,
      tutTotal: 0,
      rpeSum: 0,
      rpeCount: 0,
    };

    // Count every record as a set, even if it was skipped, to reflect total volume attempted.
    current.setCount += 1;
    if (metric.completed) current.completedSets += 1;
    if (metric.skipped) current.skippedSets += 1;
    if (metric.repsCompleted !== null && metric.repsCompleted !== undefined) {
      current.repsTotal += metric.repsCompleted;
    }
    if (metric.timeUnderTension !== null && metric.timeUnderTension !== undefined) {
      current.tutTotal += metric.timeUnderTension;
    }
    if (metric.exerciseRpe !== null && metric.exerciseRpe !== undefined) {
      current.rpeSum += metric.exerciseRpe;
      current.rpeCount += 1;
    }

    byExercise.set(metric.exerciseId, current);
  });

  return Array.from(byExercise.values()).map((metric) => ({
    exerciseId: metric.exerciseId,
    exerciseName: metric.exerciseName,
    muscleGroup: metric.muscleGroup,
    setCount: metric.setCount,
    completedSets: metric.completedSets,
    skippedSets: metric.skippedSets,
    repsTotal: metric.repsTotal,
    tutTotal: metric.tutTotal,
    averageRpe:
      metric.rpeCount > 0 ? Number((metric.rpeSum / metric.rpeCount).toFixed(1)) : null,
  }));
}

export default function HistoryPage() {
  // State for currently visible month in the calendar, list of sessions for that month, and loading/error states for the month feed.
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDayKey, setSelectedDayKey] = useState(() => formatDateParam(new Date()));
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, SessionDetail>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [yearData, setYearData] = useState<{
    year: number;
    sessions: SessionSummary[];
    error: string | null;
  } | null>(null);
  const selectedDayKeyRef = useRef(selectedDayKey);
  // Carries a clicked heatmap day across month switches so selection can be restored after fetch.
  const pendingFocusDayKeyRef = useRef<string | null>(null);

  useEffect(() => {
    selectedDayKeyRef.current = selectedDayKey;
  }, [selectedDayKey]);

  const activeYear = viewMonth.getFullYear();

  useEffect(() => {
    let active = true;
    const from = `${activeYear}-01-01`;
    const to = `${activeYear}-12-31`;

    // Separate yearly fetch powers the heatmap without coupling it to the visible month feed.
    listSessions({ from, to })
      .then((data) => {
        if (!active) return;
        setYearData({ year: activeYear, sessions: data, error: null });
      })
      .catch((err) => {
        if (!active) return;
        setYearData({
          year: activeYear,
          sessions: [],
          error: err instanceof Error ? err.message : "Failed to load yearly sessions.",
        });
      });

    return () => {
      active = false;
    };
  }, [activeYear]);

  useEffect(() => {
    let active = true;
    const from = formatDateParam(startOfMonth(viewMonth));
    const to = formatDateParam(endOfMonth(viewMonth));

    // Month fetch drives calendar highlights + grouped session cards.
    listSessions({ from, to })
      .then((data) => {
        if (!active) return;

        const monthKey = monthPrefix(viewMonth);
        const localDayKeys = Array.from(
          new Set(data.map((session) => toLocalDateKey(session.endedAt)).filter(Boolean)),
        );
        const focusDayKey =
          pendingFocusDayKeyRef.current &&
          pendingFocusDayKeyRef.current.startsWith(monthKey)
            ? pendingFocusDayKeyRef.current
            : null;

        let nextDayKey = focusDayKey;
        if (!nextDayKey) {
          const currentDayKey = selectedDayKeyRef.current;
          if (currentDayKey.startsWith(monthKey)) {
            nextDayKey = currentDayKey;
          } else if (localDayKeys.length > 0) {
            nextDayKey = localDayKeys[0];
          } else {
            const todayKey = formatDateParam(new Date());
            nextDayKey = todayKey.startsWith(monthKey)
              ? todayKey
              : formatDateParam(startOfMonth(viewMonth));
          }
        }

        const sessionsForNextDay = data.filter(
          (session) => toLocalDateKey(session.endedAt) === nextDayKey,
        );

        setSessions(data);
        setSelectedDayKey(nextDayKey);
        setSelectedSessionId((current) => {
          // If navigation came from heatmap, prioritize first session on that focused day.
          if (focusDayKey) {
            return sessionsForNextDay[0]?.id ?? null;
          }
          if (current && data.some((session) => session.id === current)) {
            return current;
          }
          return sessionsForNextDay[0]?.id ?? data[0]?.id ?? null;
        });
        pendingFocusDayKeyRef.current = null;
      })
      .catch((err) => {
        if (!active) return;
        setSessions([]);
        setError(err instanceof Error ? err.message : "Failed to load sessions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [viewMonth]);

  // Memoized calculations for session counts by day, sessions grouped by day, and currently selected session details to drive the UI efficiently.
  const dayCounts = useMemo(() => {
    return sessions.reduce<Record<string, number>>((acc, session) => {
      const key = toLocalDateKey(session.endedAt);
      if (!key) return acc;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [sessions]);

  const sessionsByDay = useMemo(() => {
    return sessions.reduce<Record<string, SessionSummary[]>>((acc, session) => {
      const key = toLocalDateKey(session.endedAt);
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(session);
      return acc;
    }, {});
  }, [sessions]);

  const sessionGroups = useMemo(() => {
    return Object.keys(sessionsByDay)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((dayKey) => ({
        dayKey,
        sessions: sessionsByDay[dayKey],
      }));
  }, [sessionsByDay]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const selectedDetail = selectedSessionId ? detailCache[selectedSessionId] : null;
  const selectedDetailError = selectedSessionId ? detailErrors[selectedSessionId] : null;
  const selectedDetailLoading = Boolean(
    selectedSessionId && !selectedDetail && !selectedDetailError,
  );

  const selectedExerciseSummaries = useMemo(
    () => (selectedDetail ? aggregateMetrics(selectedDetail) : []),
    [selectedDetail],
  );

  useEffect(() => {
    if (
      !selectedSessionId ||
      detailCache[selectedSessionId] ||
      detailErrors[selectedSessionId]
    ) {
      return;
    }

    let active = true;

    getSessionDetail(selectedSessionId)
      .then((detail) => {
        if (!active) return;
        setDetailCache((prev) => ({ ...prev, [selectedSessionId]: detail }));
      })
      .catch((err) => {
        if (!active) return;
        setDetailErrors((prev) => ({
          ...prev,
          [selectedSessionId]:
            err instanceof Error ? err.message : "Failed to load session details.",
        }));
      });

    return () => {
      active = false;
    };
  }, [selectedSessionId, detailCache, detailErrors]);

  const calendarCells = useMemo(() => buildCalendarCells(viewMonth), [viewMonth]);

  const monthlySessionCount = sessions.length;
  const monthlyDurationSeconds = sessions.reduce(
    (sum, session) => sum + session.durationSeconds,
    0,
  );
  const yearSessions = useMemo(
    () => (yearData?.year === activeYear ? yearData.sessions : []),
    [yearData, activeYear],
  );
  const yearLoading = !yearData || yearData.year !== activeYear;
  const yearError = yearData?.year === activeYear ? yearData.error : null;

  const yearDayCounts = useMemo(() => {
    return yearSessions.reduce<Record<string, number>>((acc, session) => {
      const key = toLocalDateKey(session.endedAt);
      if (!key) return acc;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [yearSessions]);

  const { weeks: yearHeatmapWeeks, monthLabels: yearHeatmapMonthLabels } = useMemo(
    () => buildYearHeatmap(activeYear, yearDayCounts),
    [activeYear, yearDayCounts],
  );

  const yearHeatmapMonthLabelMap = useMemo(
    () =>
      new Map(
        yearHeatmapMonthLabels.map((entry) => [entry.weekIndex, entry.label] as const),
      ),
    [yearHeatmapMonthLabels],
  );

  const handleSelectDay = (dayKey: string) => {
    const dayDate = parseDateKey(dayKey);
    if (Number.isNaN(dayDate.getTime())) return;

    const targetMonth = startOfMonth(dayDate);
    const targetMonthKey = monthPrefix(targetMonth);
    const currentMonthKey = monthPrefix(viewMonth);

    if (targetMonthKey !== currentMonthKey) {
      // When a day is outside the visible month, switch month first and resolve selection post load.
      pendingFocusDayKeyRef.current = dayKey;
      setLoading(true);
      setError(null);
      setViewMonth(targetMonth);
      return;
    }

    const sessionsForDay = sessionsByDay[dayKey] ?? [];
    setSelectedDayKey(dayKey);
    setSelectedSessionId(sessionsForDay[0]?.id ?? null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-display font-bold">Session History</h1>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md">
          <CalendarDays className="size-3.5" />
          <span>{formatMonthLabel(viewMonth)}</span>
          <span>-</span>
          <span>
            {monthlySessionCount} session{monthlySessionCount === 1 ? "" : "s"}
          </span>
          <span>-</span>
          <span>{formatMonthlyTotal(monthlyDurationSeconds)}</span>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
        <div className="order-2 space-y-4 lg:order-1">
          <div className="rounded-3xl border border-white/40 bg-white/80 p-4 shadow-lg backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={() => {
                  pendingFocusDayKeyRef.current = null;
                  setLoading(true);
                  setError(null);
                  setViewMonth(
                    (current) =>
                      new Date(current.getFullYear(), current.getMonth() - 1, 1),
                  );
                }}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <p className="text-sm font-semibold">{formatMonthLabel(viewMonth)}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={() => {
                  pendingFocusDayKeyRef.current = null;
                  setLoading(true);
                  setError(null);
                  setViewMonth(
                    (current) =>
                      new Date(current.getFullYear(), current.getMonth() + 1, 1),
                  );
                }}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-y-2 text-center text-xs text-muted-foreground">
              {DAY_LABELS.map((label) => (
                <div key={label} className="font-medium">
                  {label}
                </div>
              ))}

              {calendarCells.map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className="h-10" aria-hidden="true" />;
                }

                const count = dayCounts[cell.key] ?? 0;
                const isSelected = selectedDayKey === cell.key;
                const hasSessions = count > 0;

                return (
                  <div key={cell.key} className="relative flex h-10 items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleSelectDay(cell.key)}
                      className={cn(
                        "relative z-10 grid size-9 place-items-center rounded-xl text-sm transition",
                        isSelected
                          ? "bg-primary text-white shadow-sm"
                          : hasSessions
                            ? "bg-primary/10 font-semibold text-primary hover:bg-primary/15"
                            : "text-foreground/80 hover:bg-black/5",
                      )}
                    >
                      {cell.day}
                    </button>

                    {count > 1 && (
                      <span className="absolute right-0 top-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                        {count}
                      </span>
                    )}

                    {count === 1 && !isSelected && (
                      <span className="absolute bottom-0 h-1.5 w-1.5 rounded-full bg-secondary" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-lg backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Selected Session</p>
              {selectedSession && (
                <span className="text-xs text-muted-foreground">
                  {formatSessionDateTime(selectedSession.endedAt)}
                </span>
              )}
            </div>

            {!selectedSession && (
              <p className="text-sm text-muted-foreground">
                Select a session from the list to review exercise details.
              </p>
            )}

            {selectedSession && (
              <div className="space-y-3">
                <div>
                  <p className="text-base font-semibold">{selectedSession.routineTitle || "Untitled routine"}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatSessionTime(selectedSession.endedAt)} - {formatDurationMinutes(selectedSession.durationSeconds)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                      {selectedSession.targetArea || "Full body"}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                      {selectedSession.exerciseCount} exercise
                      {selectedSession.exerciseCount === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                      {selectedSession.overallRpe !== null && selectedSession.overallRpe !== undefined
                        ? `RPE ${selectedSession.overallRpe}/10`
                        : "RPE n/a"}
                    </span>
                  </div>
                </div>

                {selectedDetailLoading && (
                  <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading session details...
                  </p>
                )}

                {!selectedDetailLoading && selectedDetailError && (
                  <p className="text-sm text-red-600">{selectedDetailError}</p>
                )}

                {!selectedDetailLoading && !selectedDetailError && selectedDetail && (
                  <div className="max-h-45 space-y-2 overflow-y-auto pr-1">
                    {selectedExerciseSummaries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No exercise metrics found.</p>
                    ) : (
                      selectedExerciseSummaries.map((metric) => (
                        <div
                          key={metric.exerciseId}
                          className="rounded-xl border border-border/60 bg-white/70 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">{metric.exerciseName}</p>
                            {metric.muscleGroup && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {metric.muscleGroup}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                              Sets: {metric.setCount}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                              Completed: {metric.completedSets}/{metric.setCount}
                            </span>
                            {metric.repsTotal > 0 && (
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">
                                Reps: {metric.repsTotal}
                              </span>
                            )}
                            {metric.tutTotal > 0 && (
                              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-teal-700">
                                TUT: {metric.tutTotal}s
                              </span>
                            )}
                            {metric.averageRpe !== null && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                                Avg RPE {metric.averageRpe}/10
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-emerald-300/40 bg-emerald-100/50 p-5 shadow-sm backdrop-blur-md">
            <p className="text-sm font-semibold text-emerald-800">Monthly Summary</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-4xl font-display font-semibold text-emerald-700">
                  {monthlySessionCount}
                </p>
                <p className="text-xs uppercase tracking-wide text-emerald-700/80">
                  Sessions
                </p>
              </div>
              <div>
                <p className="text-4xl font-display font-semibold text-emerald-700">
                  {formatMonthlyTotal(monthlyDurationSeconds)}
                </p>
                <p className="text-xs uppercase tracking-wide text-emerald-700/80">
                  Total Time
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 rounded-3xl border border-white/40 bg-white/80 p-5 shadow-lg backdrop-blur-xl flex h-full min-h-0 flex-col lg:order-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-display font-semibold">Sessions</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {loading && (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading month...
                </>
              )}
              {!loading && (
                <>
                  <CalendarDays className="size-3.5" />
                  {monthlySessionCount} total session{monthlySessionCount === 1 ? "" : "s"}
                </>
              )}
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {!error && !loading && sessionGroups.length === 0 && (
            <div className="mt-3 rounded-2xl border border-dashed border-border/70 bg-white/60 px-4 py-5">
              <p className="text-sm font-medium text-foreground/90">
                No sessions recorded for this month.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                When you record a session, it will appear here grouped by day.
              </p>
            </div>
          )}

          <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-6">
            {sessionGroups.map((group) => (
              <section key={group.dayKey} className="space-y-3">
                <div
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2",
                    selectedDayKey === group.dayKey
                      ? "bg-primary/10 text-primary"
                      : "bg-white/60 text-foreground/85",
                  )}
                >
                  <h3 className="text-lg font-display font-semibold">
                    {formatDayHeader(group.dayKey)}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {group.sessions.length} session{group.sessions.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-3">
                  {group.sessions.map((session) => {
                    const isSelected = selectedSessionId === session.id;

                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                          setSelectedDayKey(group.dayKey);
                          setSelectedSessionId(session.id);
                          if (detailErrors[session.id]) {
                            setDetailErrors((prev) => {
                              if (!prev[session.id]) return prev;
                              const next = { ...prev };
                              delete next[session.id];
                              return next;
                            });
                          }
                        }}
                        className={cn(
                          "w-full rounded-2xl border border-border/60 bg-white/90 p-4 text-left shadow-sm transition",
                          isSelected
                            ? "border-primary/55 bg-primary/[0.06] shadow-md shadow-primary/10"
                            : "hover:border-primary/25 hover:bg-white",
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              "mt-1 size-3 rounded-full border-2",
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-slate-300 bg-slate-100",
                            )}
                            aria-hidden="true"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-xl font-semibold leading-tight">
                                  {session.routineTitle || "Untitled routine"}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {formatSessionTime(session.endedAt)} - {formatDurationMinutes(session.durationSeconds)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                                    Selected
                                  </span>
                                )}
                                <div className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                  {session.overallRpe !== null && session.overallRpe !== undefined
                                    ? `RPE ${session.overallRpe}/10`
                                    : "RPE n/a"}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">
                                {session.targetArea || "Full body"}
                              </span>
                              <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700">
                                {session.exerciseCount} exercise{session.exerciseCount === 1 ? "" : "s"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="size-3" />
                                {formatSessionDateTime(session.endedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/40 bg-white/80 p-5 shadow-lg backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-display font-semibold">Yearly Activity</h2>
          <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {activeYear}
          </div>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Click a day to jump to that month and load sessions above.
        </p>

        {yearLoading && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading yearly activity...
          </p>
        )}

        {!yearLoading && yearError && (
          <p className="mt-4 text-sm text-red-600">{yearError}</p>
        )}

        {!yearLoading && !yearError && (
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[820px] w-full">
              <div className="mb-2 flex gap-1 pl-7">
                {yearHeatmapWeeks.map((week) => (
                  <div
                    key={`month-${week.weekIndex}`}
                    className="flex-1 text-[10px] text-muted-foreground/80"
                  >
                    {yearHeatmapMonthLabelMap.get(week.weekIndex) ?? ""}
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2">
                <div className="grid grid-rows-7 gap-1 pt-0.5 text-[10px] text-muted-foreground/80">
                  <span className="h-3" />
                  <span className="h-3">Mon</span>
                  <span className="h-3" />
                  <span className="h-3">Wed</span>
                  <span className="h-3" />
                  <span className="h-3">Fri</span>
                  <span className="h-3" />
                </div>

                <div className="flex flex-1 gap-1">
                  {yearHeatmapWeeks.map((week) => (
                    <div key={week.weekIndex} className="grid flex-1 grid-rows-7 gap-1">
                      {week.days.map((day) => {
                        const isSelected = selectedDayKey === day.dateKey;
                        const toneClass = !day.inYear
                          ? "bg-transparent border-transparent"
                          : day.count === 0
                            ? "bg-slate-100 border-slate-200"
                            : day.count === 1
                              ? "bg-emerald-200 border-emerald-300"
                              : day.count === 2
                                ? "bg-emerald-300 border-emerald-400"
                                : "bg-emerald-500 border-emerald-600";

                        const title = `${formatDayHeader(day.dateKey)}: ${day.count} session${
                          day.count === 1 ? "" : "s"
                        }`;

                        return (
                          <button
                            key={day.dateKey}
                            type="button"
                            className={cn(
                              "h-3 w-full rounded-sm border transition",
                              day.inYear ? "hover:scale-110" : "cursor-default",
                              toneClass,
                              isSelected && day.inYear ? "ring-2 ring-primary/60" : "",
                            )}
                            onClick={() => day.inYear && handleSelectDay(day.dateKey)}
                            disabled={!day.inYear}
                            title={title}
                            aria-label={title}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
                <span>Less</span>
                <span className="size-3 rounded-sm border border-slate-200 bg-slate-100" />
                <span className="size-3 rounded-sm border border-emerald-300 bg-emerald-200" />
                <span className="size-3 rounded-sm border border-emerald-400 bg-emerald-300" />
                <span className="size-3 rounded-sm border border-emerald-600 bg-emerald-500" />
                <span>More</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
