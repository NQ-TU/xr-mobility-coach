import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Clock3,
  Flame,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { listRoutines } from "@/lib/routines";
import { getSessionDetail, listSessions, type SessionDetail, type SessionSummary } from "@/lib/sessions";
import { cn } from "@/lib/utils";

// Constants defining the lookback period for data analysis, trend visualization, and consistency milestones.
const LOOKBACK_DAYS = 120;
const TREND_DAYS = 7;
const FAVORITE_ROUTINE_DAYS = 28;
const CONSISTENCY_MILESTONES = [3, 5, 7] as const;
const INSIGHT_RANGE_OPTIONS = [7, 14, 28] as const;
const DEFAULT_INSIGHT_RANGE_DAYS = INSIGHT_RANGE_OPTIONS[0];
const DEFAULT_WEEKLY_GOAL_MINUTES = 150;
const DISTRIBUTION_COLORS = ["#4F46E5", "#14B8A6", "#06B6D4", "#EAB308", "#94A3B8"];

type TrendPoint = {
  key: string;
  dayLabel: string;
  shortDate: string;
  minutes: number;
};

type DistributionSlice = {
  label: string;
  value: number;
  share: number;
  color: string;
};

type CoachInsight = {
  tone: "positive" | "neutral" | "alert";
  title: string;
  body: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateParam(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, amount: number) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  value.setDate(value.getDate() + amount);
  return value;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toLocalDateKey(isoDateTime: string) {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatDateParam(parsed);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function minutesFromSeconds(seconds: number) {
  return Math.max(1, Math.round(seconds / 60));
}

function formatMinutes(minutes: number) {
  return `${minutes}m`;
}

function formatMinutesLong(minutes: number) {
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function parseTargetAreas(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((area) => titleCase(area.trim()))
    .filter(Boolean);
}

function resolveName(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
) {
  const first = firstName?.trim();
  if (first) return first;

  const last = lastName?.trim();
  if (last) return last;

  if (!email) return "Athlete";
  const handle = email.split("@")[0] || "Athlete";
  const head = handle.split(/[._-]/).filter(Boolean)[0] || handle;
  return head[0]?.toUpperCase() + head.slice(1);
}

function getWeeklyGoal(preferredSessionLength?: number | null) {
  if (!preferredSessionLength || preferredSessionLength <= 0) return DEFAULT_WEEKLY_GOAL_MINUTES;
  return clamp(preferredSessionLength * 4, 80, 320);
}

function getStreak(dayKeys: Set<string>, today: Date) {
  const todayKey = formatDateParam(today);
  const yesterday = addDays(today, -1);
  const yesterdayKey = formatDateParam(yesterday);

  const hasToday = dayKeys.has(todayKey);
  const hasYesterday = dayKeys.has(yesterdayKey);
  if (!hasToday && !hasYesterday) return { days: 0, atRisk: false };

  let cursor = hasToday ? today : yesterday;
  let days = 0;

  while (dayKeys.has(formatDateParam(cursor))) {
    days += 1;
    cursor = addDays(cursor, -1);
  }

  return { days, atRisk: !hasToday };
}

function buildCoachInsight(
  weeklyMinutes: number,
  previousWeekMinutes: number,
  streakDays: number,
  streakAtRisk: boolean,
  goalProgress: number,
  goalMinutes: number,
): CoachInsight {
  if (weeklyMinutes === 0) {
    return {
      tone: "alert",
      title: "No activity recorded this week",
      body: "Run one routine in XR to kick-start your trend and restore momentum.",
    };
  }

  if (goalProgress >= 100) {
    return {
      tone: "positive",
      title: "Weekly goal completed",
      body: `Excellent consistency. You have already hit your ${goalMinutes} minute weekly target.`,
    };
  }

  if (streakAtRisk && streakDays > 0) {
    return {
      tone: "alert",
      title: "Streak is at risk today",
      body: `You are on a ${streakDays}-day streak. One XR session today keeps it alive.`,
    };
  }

  if (weeklyMinutes > previousWeekMinutes && previousWeekMinutes > 0) {
    return {
      tone: "positive",
      title: "Trending upward",
      body: "You are pacing ahead of last week. Keep the same cadence to finish strong.",
    };
  }

  return {
    tone: "neutral",
    title: "Consistent base",
    body: "Steady progress this week. A focused XR session on a priority area will move you forward.",
  };
}

function getRhythmLabel(activeDays: number) {
  if (activeDays >= 7) return "Perfect rhythm";
  if (activeDays >= 5) return "Strong rhythm";
  if (activeDays >= 3) return "Building rhythm";
  if (activeDays > 0) return "Getting started";
  return "No activity yet";
}

function TrendChart({
  data,
  rangeDays,
  className,
}: {
  data: TrendPoint[];
  rangeDays: number;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(Math.max(0, data.length - 1));

  const maxMinutes = Math.max(...data.map((point) => point.minutes), 20);
  const chartMax = Math.ceil(maxMinutes / 10) * 10;
  const width = 700;
  const height = 280;
  const padding = { top: 20, right: 22, bottom: 48, left: 36 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const points = data.map((point, index) => {
    const x = padding.left + stepX * index;
    const y = padding.top + innerHeight - (point.minutes / chartMax) * innerHeight;
    return { ...point, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? padding.left} ${padding.top + innerHeight} L ${points[0]?.x ?? padding.left} ${padding.top + innerHeight} Z`;

  const activePoint = points[activeIndex] ?? points[points.length - 1];
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((factor) => {
    const value = Math.round(chartMax * factor);
    const y = padding.top + innerHeight - innerHeight * factor;
    return { value, y };
  });

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur-xl",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{rangeDays}-Day Trend</p>
          <h3 className="text-2xl font-display font-semibold">Daily Minutes</h3>
        </div>
        {activePoint && (
          <div className="rounded-2xl border border-primary/20 bg-white/85 px-4 py-2 shadow-sm">
            <p className="text-xs text-muted-foreground">{activePoint.shortDate}</p>
            <p className="text-lg font-semibold text-primary">
              {activePoint.minutes} min
            </p>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={tick.y}
              y2={tick.y}
              stroke="rgba(15,23,42,0.08)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-slate-400 text-[10px]"
            >
              {tick.value}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#trendFill)" />
        <path d={linePath} fill="none" stroke="#14B8A6" strokeWidth="3" strokeLinecap="round" />

        {activePoint && (
          <line
            x1={activePoint.x}
            x2={activePoint.x}
            y1={padding.top}
            y2={padding.top + innerHeight}
            stroke="rgba(15,23,42,0.18)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        )}

        {points.map((point, index) => {
          const active = index === activeIndex;
          return (
            <g key={point.key}>
              <circle
                cx={point.x}
                cy={point.y}
                r={active ? 5 : 3.5}
                fill={active ? "#14B8A6" : "#0EA5A0"}
                stroke="#ffffff"
                strokeWidth="2"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="16"
                fill="transparent"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
              />
              <text
                x={point.x}
                y={height - 18}
                textAnchor="middle"
                className={cn(
                  "text-[11px]",
                  active ? "fill-slate-700 font-semibold" : "fill-slate-500",
                )}
              >
                {point.dayLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DistributionChart({
  slices,
  totalSets,
  rangeDays,
  rangeOptions,
  onRangeChange,
  className,
}: {
  slices: DistributionSlice[];
  totalSets: number;
  rangeDays: number;
  rangeOptions?: readonly number[];
  onRangeChange?: (days: number) => void;
  className?: string;
}) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const gap = 4;
  const arcSizes = slices.map((slice) => slice.share * circumference);
  const arcOffsets = arcSizes.map((_, index) =>
    arcSizes.slice(0, index).reduce((sum, size) => sum + size, 0),
  );

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Focus Distribution</p>
          <h3 className="text-2xl font-display font-semibold">Last {rangeDays} Days</h3>
        </div>
        {onRangeChange && rangeOptions && rangeOptions.length > 0 && (
          <div className="inline-flex items-center rounded-full border border-white/55 bg-white/60 p-1 shadow-sm">
            {rangeOptions.map((days) => {
              const active = rangeDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold transition",
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-600 hover:bg-white/80",
                  )}
                  onClick={() => onRangeChange(days)}
                >
                  {days}D
                </button>
              );
            })}
          </div>
        )}
      </div>

      {totalSets === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Complete a routine in XR to populate your focus split.
        </p>
      ) : (
        <>
          <div className="mt-4 grid place-items-center">
            <div className="relative grid size-48 place-items-center">
              <svg width="192" height="192" viewBox="0 0 192 192" className="-rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  fill="none"
                  stroke="rgba(148,163,184,0.25)"
                  strokeWidth="18"
                />
                {slices.map((slice, index) => {
                  const segment = Math.max(0, slice.share * circumference - gap);
                  const strokeDasharray = `${segment} ${circumference}`;
                  const strokeDashoffset = -arcOffsets[index];

                  return (
                    <circle
                      key={slice.label}
                      cx="96"
                      cy="96"
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="18"
                      strokeLinecap="round"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                    />
                  );
                })}
                </svg>
                <div className="absolute text-center">
                  <p className="text-3xl font-display font-bold text-foreground">
                    {Math.round(totalSets)}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed Sets</p>
                </div>
              </div>
            </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {slices.map((slice) => (
              <div
                key={slice.label}
                className="flex items-center justify-between rounded-xl border border-white/40 bg-white/70 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-sm font-medium">{slice.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.round(slice.share * 100)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon,
  badge,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  badge?: string;
  tone?: "default" | "teal" | "indigo";
}) {
  const iconToneClass =
    tone === "teal"
      ? "bg-teal-500/15 text-teal-700"
      : tone === "indigo"
        ? "bg-indigo-500/15 text-indigo-700"
        : "bg-orange-500/12 text-orange-700";

  const badgeToneClass =
    tone === "teal"
      ? "bg-teal-100 text-teal-700"
      : tone === "indigo"
        ? "bg-indigo-100 text-indigo-700"
        : "bg-orange-100 text-orange-700";

  return (
    <div className="rounded-2xl border border-white/45 bg-white/78 p-4 shadow-md backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-2xl", iconToneClass)}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            {badge && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  badgeToneClass,
                )}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-4xl font-display font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { user, profile } = useAuth();
  const [, setLocation] = useLocation();

  const [selectedRangeDays, setSelectedRangeDays] = useState<number>(DEFAULT_INSIGHT_RANGE_DAYS);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionDetails, setSessionDetails] = useState<Record<string, SessionDetail>>({});
  const [sessionDetailFailures, setSessionDetailFailures] = useState<Record<string, true>>({});
  const [routineCount, setRoutineCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const today = startOfDay(new Date());
    const from = formatDateParam(addDays(today, -(LOOKBACK_DAYS - 1)));
    const to = formatDateParam(today);

    Promise.allSettled([
      listSessions({ from, to }),
      listRoutines({ page: 0, size: 1, sort: "createdAt,desc" }),
    ])
      .then(([sessionsResult, routinesResult]) => {
        if (!active) return;

        if (sessionsResult.status === "fulfilled") {
          setSessions(sessionsResult.value);
        } else {
          setSessions([]);
          setError(
            sessionsResult.reason instanceof Error
              ? sessionsResult.reason.message
              : "Failed to load overview activity.",
          );
        }

        if (routinesResult.status === "fulfilled") {
          setRoutineCount(routinesResult.value.totalElements);
        } else {
          setRoutineCount(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);
  const greetingName = resolveName(profile?.firstName, profile?.lastName, user?.email);
  const displayDate = formatLongDate(today);

  useEffect(() => {
    if (sessions.length === 0) return;

    const distributionFrom = addDays(today, -(selectedRangeDays - 1));
    const inRangeSessions = sessions.filter((session) => {
      const endedAt = new Date(session.endedAt);
      return !Number.isNaN(endedAt.getTime()) && endedAt >= distributionFrom;
    });

    const missingIds = inRangeSessions
      .map((session) => session.id)
      .filter((id) => !sessionDetails[id] && !sessionDetailFailures[id]);

    if (missingIds.length === 0) return;

    let active = true;

    Promise.allSettled(missingIds.map((id) => getSessionDetail(id))).then((results) => {
      if (!active) return;

      const detailUpdates: Record<string, SessionDetail> = {};
      const failed: Record<string, true> = {};

      results.forEach((result, index) => {
        const id = missingIds[index];
        if (result.status === "fulfilled") {
          detailUpdates[id] = result.value;
        } else {
          failed[id] = true;
        }
      });

      if (Object.keys(detailUpdates).length > 0) {
        setSessionDetails((prev) => ({ ...prev, ...detailUpdates }));
      }
      if (Object.keys(failed).length > 0) {
        setSessionDetailFailures((prev) => ({ ...prev, ...failed }));
      }
    });

    return () => {
      active = false;
    };
  }, [sessions, today, selectedRangeDays, sessionDetails, sessionDetailFailures]);

  const analytics = useMemo(() => {
    const dailyMinutes: Record<string, number> = {};
    const activeDayKeys = new Set<string>();

    sessions.forEach((session) => {
      const dayKey = toLocalDateKey(session.endedAt);
      if (!dayKey) return;
      const minutes = minutesFromSeconds(session.durationSeconds);
      dailyMinutes[dayKey] = (dailyMinutes[dayKey] ?? 0) + minutes;
      activeDayKeys.add(dayKey);
    });

    const chartTrend: TrendPoint[] = [];
    for (let i = selectedRangeDays - 1; i >= 0; i -= 1) {
      const date = addDays(today, -i);
      const key = formatDateParam(date);
      chartTrend.push({
        key,
        dayLabel: formatDayLabel(date),
        shortDate: formatShortDate(date),
        minutes: dailyMinutes[key] ?? 0,
      });
    }

    const weeklyTrend: TrendPoint[] = [];
    for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
      const date = addDays(today, -i);
      const key = formatDateParam(date);
      weeklyTrend.push({
        key,
        dayLabel: formatDayLabel(date),
        shortDate: formatShortDate(date),
        minutes: dailyMinutes[key] ?? 0,
      });
    }

    let weeklyMinutes = 0;
    let previousWeekMinutes = 0;

    for (let i = 0; i < TREND_DAYS; i += 1) {
      weeklyMinutes += dailyMinutes[formatDateParam(addDays(today, -i))] ?? 0;
      previousWeekMinutes += dailyMinutes[formatDateParam(addDays(today, -(TREND_DAYS + i)))] ?? 0;
    }

    const hasCustomWeeklyGoal = Boolean(
      profile?.preferredSessionLength && profile.preferredSessionLength > 0,
    );
    const weeklyGoalMinutes = getWeeklyGoal(profile?.preferredSessionLength);
    const goalProgress = clamp((weeklyMinutes / weeklyGoalMinutes) * 100, 0, 999);
    const remainingMinutes = Math.max(0, weeklyGoalMinutes - weeklyMinutes);

    const streak = getStreak(activeDayKeys, today);

    const distributionFrom = addDays(today, -(selectedRangeDays - 1));
    const areaSetCounts = new Map<string, number>();
    let distributionTotalSets = 0;

    sessions.forEach((session) => {
      const endedAt = new Date(session.endedAt);
      if (Number.isNaN(endedAt.getTime())) return;
      if (endedAt < distributionFrom) return;

      const detail = sessionDetails[session.id];

      if (detail) {
        const completedSets = detail.metrics.filter((metric) => metric.completed && !metric.skipped);
        if (completedSets.length > 0) {
          completedSets.forEach((metric) => {
            const areaLabels = parseTargetAreas(metric.muscleGroup ?? session.targetArea);
            const labels = areaLabels.length > 0 ? areaLabels : ["Unspecified"];
            const weight = 1 / labels.length;
            labels.forEach((label) => {
              areaSetCounts.set(label, (areaSetCounts.get(label) ?? 0) + weight);
            });
            distributionTotalSets += 1;
          });
          return;
        }
      }

      // Fallback when detailed metrics are unavailable: spread proxy set count across target areas.
      const labels = parseTargetAreas(session.targetArea);
      const proxySets = Math.max(1, session.exerciseCount);
      const targetLabels = labels.length > 0 ? labels : ["Unspecified"];
      const weight = proxySets / targetLabels.length;
      targetLabels.forEach((label) => {
        areaSetCounts.set(label, (areaSetCounts.get(label) ?? 0) + weight);
      });
      distributionTotalSets += proxySets;
    });

    const sortedAreas = Array.from(areaSetCounts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const topAreas = sortedAreas.slice(0, 4);
    if (sortedAreas.length > 4) {
      const remaining = sortedAreas.slice(4).reduce((sum, item) => sum + item.value, 0);
      topAreas.push({ label: "Other", value: remaining });
    }

    const distribution: DistributionSlice[] = topAreas.map((item, index) => ({
      label: item.label,
      value: item.value,
      share: distributionTotalSets > 0 ? item.value / distributionTotalSets : 0,
      color: DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length],
    }));

    const recentSessions = [...sessions]
      .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
      .slice(0, 3);

    const weeklyActiveDays = weeklyTrend.filter((day) => day.minutes > 0).length;
    const consistencyScore = Math.round((weeklyActiveDays / TREND_DAYS) * 100);
    const rhythmLabel = getRhythmLabel(weeklyActiveDays);
    const topTrendDay = weeklyTrend.reduce(
      (best, day) => (day.minutes > best.minutes ? day : best),
      weeklyTrend[0],
    );
    const weeklySessions = sessions.filter((session) => {
      const endedAt = new Date(session.endedAt);
      return !Number.isNaN(endedAt.getTime()) && endedAt >= addDays(today, -(TREND_DAYS - 1));
    });
    const averageSessionMinutes =
      weeklySessions.length > 0
        ? Math.round(
            weeklySessions.reduce((sum, session) => sum + session.durationSeconds, 0) /
              weeklySessions.length /
              60,
          )
        : 0;
    const favoriteRoutineCounts = new Map<string, { count: number; minutes: number }>();
    const favoriteRoutineFrom = addDays(today, -(FAVORITE_ROUTINE_DAYS - 1));
    sessions.forEach((session) => {
      const endedAt = new Date(session.endedAt);
      if (Number.isNaN(endedAt.getTime()) || endedAt < favoriteRoutineFrom) return;
      const title = session.routineTitle || "Untitled routine";
      const current = favoriteRoutineCounts.get(title) ?? { count: 0, minutes: 0 };
      current.count += 1;
      current.minutes += minutesFromSeconds(session.durationSeconds);
      favoriteRoutineCounts.set(title, current);
    });
    const favoriteRoutine = Array.from(favoriteRoutineCounts.entries())
      .map(([title, data]) => ({ title, ...data }))
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : b.minutes - a.minutes))[0] ?? null;
    const insight = buildCoachInsight(
      weeklyMinutes,
      previousWeekMinutes,
      streak.days,
      streak.atRisk,
      goalProgress,
      weeklyGoalMinutes,
    );

    return {
      trend: chartTrend,
      weeklyMinutes,
      previousWeekMinutes,
      weeklyGoalMinutes,
      hasCustomWeeklyGoal,
      goalProgress,
      remainingMinutes,
      streak,
      distribution,
      distributionTotalSets,
      recentSessions,
      weeklyTrend,
      weeklyActiveDays,
      consistencyScore,
      rhythmLabel,
      topTrendDay,
      averageSessionMinutes,
      favoriteRoutine,
      insight,
      totalSessions: sessions.length,
    };
  }, [sessions, sessionDetails, today, selectedRangeDays, profile]);

  const weekOverWeekDelta =
    analytics.previousWeekMinutes > 0
      ? ((analytics.weeklyMinutes - analytics.previousWeekMinutes) / analytics.previousWeekMinutes) *
        100
      : null;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-white/35 bg-gradient-to-br from-slate-900/85 via-slate-800/75 to-cyan-900/70 p-6 shadow-2xl md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.22),transparent_52%)]" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-medium text-white/85">{displayDate}</p>
            <h1 className="mt-2 text-4xl font-display font-bold leading-tight text-white lg:text-5xl">
              {`Welcome back, ${greetingName}`}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85 md:text-base">
              Monitor your mobility progress and let AI recommend exercises tailored to your goals.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-medium text-white">
                <CalendarDays className="size-3.5" />
                {analytics.totalSessions} sessions in view
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-medium text-white">
                <Target className="size-3.5" />
                {routineCount ?? "-"} routines built
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-medium text-white">
                <Sparkles className="size-3.5" />
                XR execution workflow
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/35 bg-white/15 p-4 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white">
                <Bot className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                  AI Coach
                </p>
                <p className="text-sm leading-relaxed text-white/95">
                  Chat with our AI Coach to develop a personalized routine.
                </p>
              </div>
            </div>

            <Button
              className="mt-2 w-full justify-between rounded-xl bg-white text-slate-900 hover:bg-white/90"
              onClick={() => setLocation("/coach")}
            >
              Chat with AI Coach
              <ArrowRight className="size-4" />
            </Button>

            <p className="mt-1.5 text-xs text-white/75">
              Try: "Build a 20-min hip mobility routine."
            </p>

            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              <Button
                variant="secondary"
                className="justify-between rounded-xl bg-teal-500 text-white hover:bg-teal-500/90"
                onClick={() => setLocation("/history")}
              >
                View history
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="justify-between rounded-xl border-white/20 bg-white/8 text-white/80 hover:border-white/30 hover:bg-white/12 hover:text-white/90"
                onClick={() => setLocation("/routines")}
              >
                Manage routines
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <div className="rounded-2xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur-xl">
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading overview metrics...
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Streak"
              value={`${analytics.streak.days} day${analytics.streak.days === 1 ? "" : "s"}`}
              helper={
                analytics.streak.atRisk
                  ? "Miss today and streak resets"
                  : "Active days in a row"
              }
              icon={<Flame className="size-4 text-orange-600" />}
              badge={
                analytics.streak.days === 0
                  ? "Start"
                  : analytics.streak.atRisk
                    ? "Risk"
                    : "Live"
              }
              tone="default"
            />
            <StatCard
              label="Weekly minutes"
              value={formatMinutes(analytics.weeklyMinutes)}
              helper={
                weekOverWeekDelta === null
                  ? "No previous-week baseline yet"
                  : `${weekOverWeekDelta >= 0 ? "+" : ""}${Math.round(weekOverWeekDelta)}% vs last week`
              }
              icon={<Clock3 className="size-4 text-teal-600" />}
              badge="7D"
              tone="teal"
            />
            <StatCard
              label="Goal progress"
              value={`${Math.round(clamp(analytics.goalProgress, 0, 100))}%`}
              helper={
                analytics.hasCustomWeeklyGoal
                  ? `${analytics.weeklyMinutes}/${analytics.weeklyGoalMinutes} min this week - ${analytics.remainingMinutes > 0 ? `${analytics.remainingMinutes} min left` : "goal achieved"}`
                  : `${analytics.weeklyMinutes}/${analytics.weeklyGoalMinutes} min this week - baseline target`
              }
              icon={<Target className="size-4 text-indigo-700" />}
              tone="indigo"
              badge={analytics.hasCustomWeeklyGoal ? "Custom" : "Default"}
            />
          </section>

          <section className="rounded-3xl border border-white/50 bg-white/70 p-4 shadow-lg backdrop-blur-xl md:p-5">
            <div className="grid items-start gap-4 xl:grid-cols-[1.7fr_1fr]">
              <TrendChart
                data={analytics.trend}
                rangeDays={selectedRangeDays}
                className="h-full border-white/35 bg-white/55 shadow-none"
              />
              <DistributionChart
                slices={analytics.distribution}
                totalSets={analytics.distributionTotalSets}
                rangeDays={selectedRangeDays}
                rangeOptions={INSIGHT_RANGE_OPTIONS}
                onRangeChange={setSelectedRangeDays}
                className="h-full rounded-none border-0 bg-transparent p-3 shadow-none backdrop-blur-none"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Coach Insight</p>
                <h3
                  className={cn(
                    "mt-1 text-xl font-display font-semibold",
                    analytics.insight.tone === "positive"
                      ? "text-emerald-700"
                      : analytics.insight.tone === "alert"
                        ? "text-amber-700"
                        : "text-slate-800",
                  )}
                >
                  {analytics.insight.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{analytics.insight.body}</p>
              </div>

              <Button
                variant="outline"
                className="justify-between rounded-xl bg-white/75"
                onClick={() => setLocation("/history")}
              >
                Review session history
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur-xl">
              <p className="text-sm font-semibold text-muted-foreground">Activity Context</p>
              <h3 className="text-2xl font-display font-semibold">Recent Sessions</h3>

              {analytics.recentSessions.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  No sessions logged yet. Once XR sessions are completed, this panel will
                  summarize their context and quality signals.
                </p>
              )}

              {analytics.recentSessions.length > 0 && (
                <div className="mt-4 space-y-3">
                  {analytics.recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-white/45 bg-white/70 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-semibold">
                            {session.routineTitle || "Untitled routine"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {new Intl.DateTimeFormat("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }).format(new Date(session.endedAt))}
                          </p>
                        </div>
                        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {formatMinutesLong(minutesFromSeconds(session.durationSeconds))}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                          {titleCase(session.targetArea?.trim() || "Unspecified")}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                          {session.exerciseCount} exercise
                          {session.exerciseCount === 1 ? "" : "s"}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                          {session.overallRpe !== null && session.overallRpe !== undefined
                            ? `RPE ${session.overallRpe}/10`
                            : "RPE n/a"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur-xl">
              <p className="text-sm font-semibold text-muted-foreground">Consistency Signal</p>
              <h3 className="text-2xl font-display font-semibold">Weekly Rhythm</h3>

              <div className="mt-4 rounded-2xl border border-white/45 bg-white/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-display font-bold text-primary">
                    {analytics.weeklyActiveDays}/{TREND_DAYS}
                  </p>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {analytics.rhythmLabel}
                  </span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {analytics.weeklyActiveDays}/{TREND_DAYS} active days
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CONSISTENCY_MILESTONES.map((milestone) => (
                    <span
                      key={milestone}
                      className={cn(
                        "rounded-full border px-2 py-1 text-[10px] font-semibold tracking-wide",
                        analytics.weeklyActiveDays >= milestone
                          ? "border-teal-300 bg-teal-100 text-teal-700"
                          : "border-slate-200 bg-slate-100 text-slate-500",
                      )}
                    >
                      {milestone}/7
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1.5">
                  {analytics.weeklyTrend.map((day) => (
                    <div
                      key={day.key}
                      className={cn(
                        "rounded-md border px-1.5 py-1 text-center",
                        day.minutes > 0
                          ? "border-teal-300 bg-teal-100/70 text-teal-700"
                          : "border-slate-200 bg-slate-100/80 text-slate-400",
                      )}
                    >
                      <p className="text-[10px] font-semibold">{day.dayLabel}</p>
                      <p className="text-[10px]">{day.minutes > 0 ? `${day.minutes}m` : "-"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-2">
                  <span className="text-muted-foreground">Favorite routine (28 days)</span>
                  <span className="max-w-[210px] truncate text-right font-semibold">
                    {analytics.favoriteRoutine
                      ? `${analytics.favoriteRoutine.title} (${analytics.favoriteRoutine.count})`
                      : "No data yet"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-2">
                  <span className="text-muted-foreground">Average session length this week</span>
                  <span className="font-semibold">
                    {analytics.averageSessionMinutes > 0
                      ? `${analytics.averageSessionMinutes}m`
                      : "No sessions yet"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-2">
                  <span className="text-muted-foreground">Best day this week</span>
                  <span className="font-semibold">
                    {analytics.topTrendDay.dayLabel} ({analytics.topTrendDay.minutes}m)
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="mt-4 w-full justify-between rounded-xl bg-white/75"
                onClick={() => setLocation("/history")}
              >
                Review weekly pattern
                <TrendingUp className="size-4" />
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
