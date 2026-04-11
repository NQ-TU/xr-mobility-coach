import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Flame,
  ListChecks,
  MessageSquareText,
  Save,
  SendHorizonal,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Wand2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import {
  ROUTINE_EDITOR_DRAFT_STORAGE_KEY,
  createRoutineDraft,
  deleteCoachConversation,
  getCoachMessages,
  listCoachConversations,
  sendCoachMessage,
  type CoachConversationSummaryResponse,
  type CreateRoutineDraftRequest,
  type CoachMessageResponse,
  type RoutineDraftResponse,
  type RoutineType,
} from "@/lib/coach";
import { listSessions, type SessionSummary } from "@/lib/sessions";
import { createRoutine, type UpsertRoutinePayload } from "@/lib/routines";
import { cn } from "@/lib/utils";

type CoachTab = "chat" | "builder";

const promptStarters = [
  "My hips feel tight after sitting all day. What would help?",
  "What is the purpose of a cool-down?",
  "What should I do if my legs feel sore today?",
  "How often should I train shoulder mobility?",
  "What should I do when my lower back feels stiff after work?",
];

type RoutineBuilderAnswers = {
  targetAreas: string[];
  routineType: RoutineType | null;
  availableMinutes: number | null;
  difficulty: number | "ANY" | null;
  userNotes: string;
};

type RoutineBuilderPrefill = RoutineBuilderAnswers & {
  requestId: number;
};

type CoachInsightData = {
  title: string;
  body: string;
  suggestionLabel: string;
  targetAreaLabel: string;
  durationLabel: string;
  difficultyLabel: string;
  actionLabel: string;
  prefill: Omit<RoutineBuilderPrefill, "requestId">;
};

const routineBuilderStepLabels = [
  "Focus area",
  "Session type",
  "Time",
  "Difficulty",
  "Notes",
] as const;

const routineTargetAreaOptions = [
  { value: "Hips", label: "Hips", description: "Hips, glutes, and flexors." },
  { value: "Shoulders", label: "Shoulders", description: "Upper-body prep and overhead mobility." },
  { value: "Spine", label: "Spine", description: "Thoracic rotation and posture-focused work." },
  { value: "Ankles", label: "Ankles", description: "Balance, dorsiflexion, and lower-leg prep." },
  { value: "Lower Back", label: "Lower back", description: "Gentle support around stiffness and control." },
  { value: "Full Body", label: "Full body", description: "A broader reset across multiple areas." },
] as const;

const routineTypeOptions: Array<{
  value: RoutineType;
  label: string;
  description: string;
}> = [
  { value: "WARMUP", label: "Warm-up", description: "Prime your body before training or movement work." },
  { value: "MOBILITY", label: "Mobility flow", description: "Build range, control, and movement quality." },
  { value: "RECOVERY", label: "Recovery reset", description: "Ease stiffness and reset after long days or sessions." },
  { value: "COOLDOWN", label: "Cool-down", description: "Bring intensity down and restore positions after training." },
];

const routineDurationOptions = [
  { value: 5, label: "5 min", description: "Quick reset" },
  { value: 10, label: "10 min", description: "Short focused block" },
  { value: 15, label: "15 min", description: "Balanced routine" },
  { value: 20, label: "20 min", description: "More complete session" },
  { value: 30, label: "30 min", description: "Longer guided flow" },
] as const;

const routineDifficultyOptions = [
  { value: "ANY", label: "Any", description: "Let the coach choose the best fit." },
  { value: 1, label: "Gentle", description: "Low intensity and easier positions." },
  { value: 2, label: "Moderate", description: "Steady work for most normal days." },
  { value: 3, label: "Challenging", description: "More demanding positions." },
  { value: 4, label: "Advanced", description: "Higher effort when you want a tougher block." },
] as const;

const emptyRoutineBuilderAnswers: RoutineBuilderAnswers = {
  targetAreas: [],
  routineType: null,
  availableMinutes: null,
  difficulty: null,
  userNotes: "",
};

const coachHelpCards = [
  {
    title: "Warm-up ideas",
    description: "Short prep blocks before lifting, cardio, or desk breaks.",
    icon: Clock3,
  },
  {
    title: "Recovery advice",
    description: "Soreness, stiffness, and what to do on lower-energy days.",
    icon: Sparkles,
  },
  {
    title: "Mobility planning",
    description: "Simple ideas for hips, shoulders, ankles, and lower back.",
    icon: Target,
  },
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  pending?: boolean;
};

type CoachConversationSummary = {
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
};

function mapCoachMessage(message: CoachMessageResponse): ChatMessage {
  return {
    id: message.id,
    role: message.role === "ASSISTANT" ? "assistant" : "user",
    text: message.content,
    createdAt: message.createdAt,
  };
}

function mapCoachConversationSummary(
  conversation: CoachConversationSummaryResponse,
): CoachConversationSummary {
  return {
    conversationId: conversation.conversationId,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    lastMessagePreview: conversation.lastMessagePreview?.trim() || "Untitled conversation",
  };
}

function normalizeCoachConversations(
  conversations: CoachConversationSummaryResponse[],
): CoachConversationSummary[] {
  const seen = new Set<string>();

  return conversations
    .map(mapCoachConversationSummary)
    .filter((conversation) => {
      if (seen.has(conversation.conversationId)) return false;
      seen.add(conversation.conversationId);
      return true;
    });
}

function coachConversationStorageKey(userId: string) {
  return `coach_conversation_id:${userId}`;
}

function getCoachGreetingName(firstName?: string | null, email?: string | null) {
  if (firstName?.trim()) return firstName.trim();
  if (email?.trim()) return email.split("@")[0];
  return "there";
}

function formatCoachMessageTime(createdAt: string) {
  const value = new Date(createdAt);
  if (Number.isNaN(value.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function MarkdownMessage({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mt-0 first:mt-0 [&:not(:first-child)]:mt-3">{children}</p>,
        ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-black/12 px-1.5 py-0.5 text-[0.95em]">{children}</code>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function formatCoachConversationDate(createdAt: string) {
  const value = new Date(createdAt);
  if (Number.isNaN(value.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function titleCaseWords(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function parseTargetAreaLabels(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((area) => titleCaseWords(area.trim()))
    .filter(Boolean);
}

function getRoutineTypeLabel(value: RoutineType | null) {
  return routineTypeOptions.find((option) => option.value === value)?.label ?? "Not set";
}

// The coach insight card is derived entirely from the latest completed session so the chat view
// can surface a quick recovery-focused CTA without requiring a dedicated backend endpoint.
function buildCoachInsightFromLastSession(lastSession: SessionSummary | null): CoachInsightData {
  if (!lastSession) {
    return {
      title: "No recent target area yet",
      body: "Once you complete a session, the coach can suggest a focused reset based on what you trained last.",
      suggestionLabel: "Suggested block",
      targetAreaLabel: "Ankles",
      durationLabel: "8-10 minutes",
      difficultyLabel: "Gentle",
      actionLabel: "Generate ankle reset",
      prefill: {
        targetAreas: ["Ankles"],
        routineType: "RECOVERY",
        availableMinutes: 10,
        difficulty: 1,
        userNotes:
          "Create a gentle ankle reset to improve balance, reduce stiffness, and restore range of motion.",
      },
    };
  }

  const targetAreas = parseTargetAreaLabels(lastSession.targetArea);
  const selectedTargetAreas = targetAreas.length > 0 ? targetAreas : ["Full Body"];
  const targetAreaLabel = selectedTargetAreas.join(", ");
  const primaryArea = selectedTargetAreas[0];
  const primaryAreaLower = primaryArea.toLowerCase();
  const lastTrainedDate = formatCoachConversationDate(lastSession.endedAt) || "recently";

  return {
    title: `Last trained: ${targetAreaLabel}`,
    body: `Your most recent session on ${lastTrainedDate} focused on ${targetAreaLabel.toLowerCase()}. Build a short ${primaryAreaLower} reset to recover cleanly and keep that area moving well.`,
    suggestionLabel: "Suggested block",
    targetAreaLabel,
    durationLabel: "10 minutes",
    difficultyLabel: "Gentle",
    actionLabel: `Generate ${primaryAreaLower} reset`,
    prefill: {
      targetAreas: selectedTargetAreas,
      routineType: "RECOVERY",
      availableMinutes: 10,
      difficulty: 1,
      userNotes: `My last completed session focused on ${targetAreaLabel.toLowerCase()}. Create a gentle ${primaryAreaLower} recovery reset to reduce stiffness and maintain range of motion.`,
    },
  };
}

function buildRoutineDraftRegenerationRequest(userNotes: string) {
  const trimmedNotes = userNotes.trim();
  if (!trimmedNotes) {
    return "Create an alternative version of this routine while keeping the same brief and intent.";
  }

  return [
    "Create an alternative version of this routine while keeping the same brief and intent.",
    `Use the current user brief during regeneration: ${trimmedNotes}`,
  ].join(" ");
}

// Both first-generation and regeneration use the same API contract. Regeneration is activated by
// attaching the previous draft plus a change request while keeping the user's current brief intact.
function buildRoutineDraftPayload(
  answers: RoutineBuilderAnswers,
  options?: {
    previousDraft?: RoutineDraftResponse | null;
    changeRequest?: string | null;
  },
): CreateRoutineDraftRequest {
  return {
    targetAreas: answers.targetAreas,
    routineType: answers.routineType ?? "MOBILITY",
    availableMinutes: answers.availableMinutes ?? 0,
    difficulty: answers.difficulty === "ANY" ? null : answers.difficulty,
    userNotes: answers.userNotes.trim() || "No additional notes provided.",
    ...(options?.previousDraft
      ? {
          changeRequest:
            options.changeRequest ??
            buildRoutineDraftRegenerationRequest(answers.userNotes),
          previousDraft: options.previousDraft,
        }
      : {}),
  };
}

function mapRoutineDraftToUpsertPayload(draft: RoutineDraftResponse): UpsertRoutinePayload {
  return {
    title: draft.title,
    targetArea: draft.targetArea,
    estimatedDuration: draft.estimatedDuration,
    items: draft.items.map((item) => ({
      exerciseId: item.exerciseId,
      sets: item.sets,
      repsOrHoldSeconds: item.repsOrHoldSeconds,
      tempo: null,
      coachingNotes: item.notes ?? null,
    })),
  };
}

function SectionTabs({
  activeTab,
  onChange,
}: {
  activeTab: CoachTab;
  onChange: (tab: CoachTab) => void;
}) {
  const tabs: Array<{ id: CoachTab; label: string; icon: typeof MessageSquareText }> = [
    { id: "chat", label: "Coach Chat", icon: MessageSquareText },
    { id: "builder", label: "Create Routine", icon: ListChecks },
  ];

  return (
    <div className="inline-flex flex-wrap gap-3">
      {tabs.map(({ id, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              isActive
                ? "border-white bg-white text-slate-900 shadow-sm"
                : "border-white/20 bg-white/10 text-white/90 hover:bg-white/14 hover:text-white"
            }`}
          >
            <Icon className="size-4" />
            {id === "chat" ? "Coach Chat" : "Generate Routine"}
          </button>
        );
      })}
    </div>
  );
}

function RoutineDraftPreviewCard({
  draft,
  userNotes,
  generating,
  saving,
  onUserNotesChange,
  onRegenerate,
  onEdit,
  onSave,
}: {
  draft: RoutineDraftResponse;
  userNotes: string;
  generating: boolean;
  saving: boolean;
  onUserNotesChange: (value: string) => void;
  onRegenerate: () => void;
  onEdit: () => void;
  onSave: () => void;
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/14 bg-[linear-gradient(180deg,rgba(17,24,39,0.16),rgba(15,23,42,0.26))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            <Dumbbell className="size-3.5" />
            Draft routine
          </div>
          <h2 className="mt-3 text-2xl font-display font-semibold text-white">{draft.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
            Here's the routine the coach generated based on your answers and notes. You can edit the brief and regenerate if you want to see a different variation, or you can edit the routine directly before saving it to your library.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/72">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-300/12 px-2.5 py-1 font-semibold text-cyan-100">
              <Clock3 className="size-3.5" />
              {draft.estimatedDuration} min
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold text-white/85">
              {getRoutineTypeLabel(draft.routineType)}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold text-white/85">
              {draft.targetArea}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2">
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-100">
            <CheckCircle2 className="size-3.5" />
            Routine ready to review
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/16 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
            <MessageSquareText className="size-3.5" />
            Current brief
          </div>
          <p className="text-xs text-white/50">{userNotes.trim().length}/2000 characters</p>
        </div>
        <textarea
          value={userNotes}
          onChange={(event) => onUserNotesChange(event.target.value.slice(0, 2000))}
          placeholder="Refine the request before regenerating this routine."
          rows={4}
          className="mt-3 w-full resize-none rounded-2xl border border-transparent bg-slate-950/20 px-4 py-4 text-sm text-white outline-none placeholder:text-white/40"
        />
        <p className="mt-2 text-xs leading-5 text-white/54">
          Regenerate uses the current brief above together with the selected focus areas, session
          type, time, and difficulty.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {draft.items.map((item) => (
          <div
            key={`${item.exerciseId}-${item.sequenceIndex}`}
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {item.sequenceIndex}. {item.exerciseName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  <span>{item.muscleGroup}</span>
                  <span>{item.sets} sets</span>
                  <span>{item.repsOrHoldSeconds} reps/hold</span>
                </div>
              </div>
            </div>
            {item.notes ? (
              <p className="mt-2 text-sm leading-6 text-white/72">{item.notes}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={generating || saving}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/22 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/36 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className="size-4" />
          {generating ? "Regenerating..." : "Regenerate with brief"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={generating || saving}
          className="inline-flex items-center gap-2 rounded-xl border border-white/14 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/22 hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Edit routine
          <ArrowRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={generating || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-4" />
          {saving ? "Saving..." : "Save routine"}
        </button>
      </div>
    </section>
  );
}

function PromptStartersCard({
  className = "",
  onSelect,
}: {
  className?: string;
  onSelect?: (prompt: string) => void;
}) {
  return (
    <aside
      className={`rounded-3xl border border-white/45 bg-white/75 p-4 shadow-lg backdrop-blur-xl xl:flex xl:h-[22rem] xl:flex-col ${className}`}
    >
      <div className="mb-4 inline-flex items-center gap-2 self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Wand2 className="size-3.5" />
        Try Asking...
      </div>
      <div className="space-y-2 xl:flex-1 xl:overflow-y-auto xl:pr-1">
        {promptStarters.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect?.(prompt)}
            className="w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-primary/30 hover:bg-primary/[0.08]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </aside>
  );
}

function CoachInsightCard({
  className = "",
  insight,
  loading,
  onGenerate,
}: {
  className?: string;
  insight: CoachInsightData;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <aside
      className={`rounded-3xl border border-amber-200/70 bg-amber-50/80 p-4 shadow-lg backdrop-blur-xl xl:flex xl:h-[22rem] xl:flex-col ${className}`}
    >
      <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        <AlertCircle className="size-3.5" />
        Coach Insight
      </p>
      <div className="xl:flex-1">
        <p className="mt-3 text-sm font-semibold text-amber-900">
          {loading ? "Loading insight..." : insight.title}
        </p>
        <p className="mt-1 text-xs text-amber-900/80">
          {loading
            ? "Checking your latest training focus so the coach can suggest the next reset."
            : insight.body}
        </p>
        <div className="mt-4 space-y-2 text-xs text-amber-900/85">
          <p className="inline-flex items-center gap-2">
            <Clock3 className="size-3.5 text-amber-700" />
            {insight.suggestionLabel}: {insight.durationLabel}
          </p>
          <p className="inline-flex items-center gap-2">
            <Target className="size-3.5 text-amber-700" />
            Priority area: {insight.targetAreaLabel}
          </p>
          <p className="inline-flex items-center gap-2">
            <Flame className="size-3.5 text-amber-700" />
            Difficulty: {insight.difficultyLabel}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        disabled={loading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-500/90"
      >
        {insight.actionLabel}
        <ArrowRight className="size-4" />
      </button>
    </aside>
  );
}

function CoachChatTab({
  onGenerateInsightRoutine,
}: {
  onGenerateInsightRoutine: (prefill: Omit<RoutineBuilderPrefill, "requestId">) => void;
}) {
  const { user, profile } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<CoachConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [loadingConversationList, setLoadingConversationList] = useState(true);
  const [showConversationList, setShowConversationList] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSession, setLastSession] = useState<SessionSummary | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const displayName = getCoachGreetingName(profile?.firstName, user?.email ?? null);
  const emptyStatePrompt = `Hi ${displayName}, I'm here to help if you want advice related to training, recovery, movement health, or any questions that you've got. Just let me know what it is that feels tight or off, and I can provide advice.`;
  const coachInsight = buildCoachInsightFromLastSession(lastSession);

  // Keep the latest message pinned in view while history is loading or new assistant turns arrive.
  useEffect(() => {
    if (!messagesEndRef.current) return;

    messagesEndRef.current.scrollIntoView({
      block: "end",
      behavior: messages.length > 0 ? "smooth" : "auto",
    });
  }, [messages, sending, loadingConversation]);

  // Restore both the conversation list and the last open thread for this signed-in user from
  // session storage so the chat feels persistent across refreshes.
  useEffect(() => {
    if (!user) {
      setConversationId(null);
      setConversations([]);
      setMessages([]);
      setLoadingConversation(false);
      setLoadingConversationList(false);
      return;
    }

    const storedConversationId = sessionStorage.getItem(coachConversationStorageKey(user.userId));
    let cancelled = false;
    setLoadingConversation(Boolean(storedConversationId));
    setLoadingConversationList(true);
    setError(null);

    Promise.allSettled([
      listCoachConversations(),
      storedConversationId ? getCoachMessages(storedConversationId) : Promise.resolve(null),
    ]).then(([conversationsResult, messagesResult]) => {
      if (cancelled) return;

      if (conversationsResult.status === "fulfilled") {
        setConversations(normalizeCoachConversations(conversationsResult.value));
      } else {
        setConversations([]);
        setError(
          conversationsResult.reason instanceof Error
            ? conversationsResult.reason.message
            : "Unable to load previous chats.",
        );
      }
      setLoadingConversationList(false);

      if (!storedConversationId) {
        setConversationId(null);
        setMessages([]);
        setLoadingConversation(false);
        return;
      }

      if (messagesResult.status === "fulfilled" && messagesResult.value) {
        setConversationId(storedConversationId);
        setMessages(messagesResult.value.map(mapCoachMessage));
      } else {
        sessionStorage.removeItem(coachConversationStorageKey(user.userId));
        setConversationId(null);
        setMessages([]);
        setError(
          messagesResult.status === "rejected" && messagesResult.reason instanceof Error
            ? messagesResult.reason.message
            : "Unable to load previous coach chat.",
        );
      }
      setLoadingConversation(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // The insight CTA only needs the user's most recent completed session, so fetch a lightweight
  // history window here and derive the recommendation client-side.
  useEffect(() => {
    if (!user) {
      setLastSession(null);
      setLoadingInsight(false);
      return;
    }

    let active = true;
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 180);
    const formatDate = (value: Date) =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
        value.getDate(),
      ).padStart(2, "0")}`;

    setLoadingInsight(true);
    listSessions({ from: formatDate(from), to: formatDate(today) })
      .then((sessions) => {
        if (!active) return;
        const mostRecentSession =
          [...sessions].sort(
            (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
          )[0] ?? null;
        setLastSession(mostRecentSession);
      })
      .catch(() => {
        if (active) {
          setLastSession(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingInsight(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  async function refreshConversationList() {
    if (!user) {
      setConversations([]);
      setLoadingConversationList(false);
      return;
    }

    setLoadingConversationList(true);

    try {
      const nextConversations = await listCoachConversations();
      setConversations(normalizeCoachConversations(nextConversations));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load previous chats.");
    } finally {
      setLoadingConversationList(false);
    }
  }

  async function handleSelectConversation(nextConversationId: string) {
    if (!user || sending || deletingConversationId || nextConversationId === conversationId) return;

    setLoadingConversation(true);
    setError(null);

    try {
      const history = await getCoachMessages(nextConversationId);
      setConversationId(nextConversationId);
      setMessages(history.map(mapCoachMessage));
      setInput("");
      setShowConversationList(false);
      sessionStorage.setItem(coachConversationStorageKey(user.userId), nextConversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load selected coach chat.");
    } finally {
      setLoadingConversation(false);
    }
  }

  async function handleDeleteConversation(targetConversationId: string) {
    if (!user || sending || deletingConversationId) return;

    setDeletingConversationId(targetConversationId);
    setError(null);

    try {
      await deleteCoachConversation(targetConversationId);

      setConversations((current) =>
        current.filter((conversation) => conversation.conversationId !== targetConversationId),
      );

      if (conversationId === targetConversationId) {
        sessionStorage.removeItem(coachConversationStorageKey(user.userId));
        setConversationId(null);
        setMessages([]);
        setInput("");
        setLoadingConversation(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete selected coach chat.");
    } finally {
      setDeletingConversationId(null);
    }
  }

  async function handleSend(messageText: string) {
    const trimmed = messageText.trim();
    if (!trimmed || sending || !user) return;

    const optimisticUserMessage: ChatMessage = {
      id: `pending-user-${Date.now()}`,
      role: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setError(null);
    setSending(true);
    setMessages((current) => [...current, optimisticUserMessage]);
    setInput("");

    try {
      const response = await sendCoachMessage({
        conversationId,
        message: trimmed,
      });

      setConversationId(response.conversationId);
      sessionStorage.setItem(coachConversationStorageKey(user.userId), response.conversationId);

      setMessages((current) => [
        ...current.map((message) =>
          message.id === optimisticUserMessage.id ? { ...message, pending: false } : message,
        ),
        {
          id: `assistant-${response.createdAt}`,
          role: "assistant",
          text: response.message,
          createdAt: response.createdAt,
        },
      ]);
      void refreshConversationList();
    } catch (err) {
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticUserMessage.id ? { ...message, pending: false } : message,
        ),
      );
      setError(err instanceof Error ? err.message : "Unable to send coach message.");
    } finally {
      setSending(false);
    }
  }

  function handleNewChat() {
    if (user) {
      sessionStorage.removeItem(coachConversationStorageKey(user.userId));
    }
    setConversationId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setShowConversationList(false);
    setLoadingConversation(false);
  }

  return (
    <div className="space-y-6">
      <section className="grid items-start gap-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-stretch">
        <div className="space-y-6 xl:flex xl:h-[calc(100vh-18rem)] xl:min-h-[620px] xl:max-h-[780px] xl:flex-col xl:space-y-0">
          <CoachInsightCard
            insight={coachInsight}
            loading={loadingInsight}
            onGenerate={() => onGenerateInsightRoutine(coachInsight.prefill)}
          />

          <div className="hidden xl:flex xl:flex-1 xl:flex-col xl:items-center xl:justify-center">
            <div className="flex h-full flex-col items-center py-5">
              <div className="w-px flex-1 bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
              <div className="rounded-full border border-white/55 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm backdrop-blur-md">
                Quick ways to start
              </div>
              <div className="w-px flex-1 bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
            </div>
          </div>

          <PromptStartersCard onSelect={setInput} />
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/35 bg-[linear-gradient(135deg,rgba(44,67,92,0.86),rgba(55,94,102,0.76),rgba(79,93,150,0.74))] shadow-[0_24px_80px_rgba(15,23,42,0.24)] xl:h-[calc(100vh-18rem)] xl:min-h-[620px] xl:max-h-[780px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(45,212,191,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />

          <div className="relative flex min-h-[640px] flex-col p-3 md:p-4 xl:h-full xl:min-h-0">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.08))] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-white/12 px-5 py-4 text-white">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
                    <Bot className="size-3.5 text-cyan-300" />
                    Coach Chat
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConversationList((current) => !current)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
                      showConversationList
                        ? "border-cyan-300/35 bg-cyan-300/12 text-white"
                        : "border-white/20 bg-white/12 text-white/90 hover:bg-white/18",
                    )}
                  >
                    <MessageSquareText className="size-3.5 text-cyan-300" />
                    Previous chats
                  </button>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 transition hover:bg-white/18"
                  >
                    <Sparkles className="size-3.5 text-cyan-300" />
                    New chat
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
                {showConversationList ? (
                  <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-black/8 p-4 md:min-h-0 md:w-72 md:border-b-0 md:border-r md:border-white/10">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                        <MessageSquareText className="size-3.5 text-cyan-300" />
                        Previous chats
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowConversationList(false)}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60 transition hover:text-white/90"
                      >
                        Close
                      </button>
                    </div>

                    {loadingConversationList ? (
                      <p className="text-sm text-white/70">Loading previous chats...</p>
                    ) : conversations.length === 0 ? (
                      <p className="text-sm text-white/70">
                        Your previous conversations will appear here once you start chatting.
                      </p>
                    ) : (
                      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 pb-4">
                        {conversations.map((conversation) => {
                          const isActive = conversationId === conversation.conversationId;
                          const isDeleting = deletingConversationId === conversation.conversationId;

                          return (
                            <button
                              key={conversation.conversationId}
                              type="button"
                              onClick={() => void handleSelectConversation(conversation.conversationId)}
                              className={cn(
                                "w-full rounded-2xl border px-3 py-3 text-left transition",
                                isActive
                                  ? "border-cyan-300/30 bg-cyan-300/12"
                                  : "border-white/12 bg-white/8 hover:bg-white/12",
                              )}
                              title={conversation.lastMessagePreview}
                              disabled={isDeleting}
                            >
                              <p className="text-sm font-semibold leading-6 text-white">
                                {conversation.lastMessagePreview}
                              </p>
                              <div className="mt-1 flex items-center justify-between gap-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                                  {formatCoachConversationDate(conversation.updatedAt)}
                                </p>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleDeleteConversation(conversation.conversationId);
                                  }}
                                  disabled={isDeleting}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:border-rose-300/30 hover:bg-rose-400/10 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label={`Delete conversation from ${formatCoachConversationDate(conversation.updatedAt)}`}
                                >
                                  <Trash2 className="size-3" />
                                  {isDeleting ? "Deleting" : "Delete"}
                                </button>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </aside>
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
                  {loadingConversation ? (
                  <div className="grid min-h-[280px] place-items-center rounded-[1.5rem] border border-dashed border-white/16 bg-white/8 px-6 text-center text-white">
                    <div>
                      <div className="mx-auto grid size-12 place-items-center rounded-full bg-white/14 text-cyan-300">
                        <Bot className="size-5" />
                      </div>
                      <p className="mt-4 text-base font-semibold text-white">Loading your coach chat</p>
                      <p className="mt-1 text-sm text-white/74">Restoring your recent conversation history.</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="grid min-h-[420px] place-items-center rounded-[1.75rem] border border-white/16 bg-[linear-gradient(180deg,rgba(28,45,77,0.44),rgba(20,36,59,0.22))] p-6 text-white shadow-inner">
                    <div className="max-w-3xl text-center">
                      <div className="mx-auto grid size-28 place-items-center rounded-full border-2 border-cyan-300/35 bg-white/8 text-cyan-100">
                        <Bot className="size-14" />
                      </div>
                      <h3 className="mt-6 text-3xl font-display font-semibold text-white">
                        Start with how you feel.
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-white/78">{emptyStatePrompt}</p>
                      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                        You could start with...
                      </p>

                      <div className="mt-4 grid gap-3 text-left sm:grid-cols-3">
                        {coachHelpCards.map(({ title, description, icon: Icon }) => (
                          <div
                            key={title}
                            className="rounded-2xl border border-white/14 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                          >
                            <div className="inline-flex size-9 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100">
                              <Icon className="size-4" />
                            </div>
                            <p className="mt-3 text-sm font-semibold text-white">{title}</p>
                            <p className="mt-1 text-xs leading-5 text-white/68">{description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                      {messages.map((message) => {
                        const isAssistant = message.role === "assistant";
                        const timestamp = formatCoachMessageTime(message.createdAt);

                      return (
                        <div
                          key={message.id}
                          className={cn("flex gap-3", isAssistant ? "justify-start" : "justify-end")}
                        >
                          {isAssistant ? (
                            <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/26 bg-cyan-300/12 text-cyan-100 shadow-[0_12px_24px_rgba(14,165,233,0.10)]">
                              <Bot className="size-4" />
                            </div>
                          ) : null}

                          <div className={cn("max-w-[88%] sm:max-w-[78%]", isAssistant ? "" : "order-first")}>
                            <div
                              className={cn(
                                "mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]",
                                isAssistant ? "text-white/60" : "justify-end text-white/60",
                              )}
                            >
                              <span>{isAssistant ? "AI coach" : "You"}</span>
                              {timestamp ? <span className="text-white/40">{timestamp}</span> : null}
                              {message.pending ? <span className="text-cyan-300/90">Sending</span> : null}
                            </div>

                            <div
                              className={cn(
                                "rounded-[1.4rem] px-4 py-3 text-sm leading-6 shadow-[0_18px_40px_rgba(15,23,42,0.16)]",
                                isAssistant
                                  ? "border border-white/18 bg-white/16 text-white/95"
                                  : "bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--secondary)))] text-white",
                                message.pending && "opacity-75",
                              )}
                            >
                              <MarkdownMessage text={message.text} />
                            </div>
                          </div>

                          {!isAssistant ? (
                            <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/18 bg-white/14 text-white/90">
                              <UserRound className="size-4" />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    {sending ? (
                      <div className="flex gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/26 bg-cyan-300/12 text-cyan-100">
                          <Bot className="size-4" />
                        </div>
                        <div className="rounded-[1.4rem] border border-white/18 bg-white/16 px-4 py-3 text-white/70">
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-white/50 animate-pulse" />
                            <span className="size-2 rounded-full bg-white/40 animate-pulse [animation-delay:140ms]" />
                            <span className="size-2 rounded-full bg-white/30 animate-pulse [animation-delay:280ms]" />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div ref={messagesEndRef} />
                  </div>
                  )}
                </div>
              </div>

              <div className="border-t border-white/8 bg-black/10 p-4 md:p-5">
                {error ? (
                  <div className="mb-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSend(input);
                  }}
                  className="rounded-[1.65rem] border border-white/18 bg-white/14 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  <div className="flex items-center gap-2">
                    <input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleSend(input);
                        }
                      }}
                      placeholder="Ask about soreness, recovery, stiffness, mobility work, or what to do next..."
                      className="h-11 w-full rounded-[1.15rem] border border-transparent bg-slate-950/12 px-4 text-sm text-white outline-none placeholder:text-white/50"
                    />

                    <button
                      type="submit"
                      disabled={sending || !input.trim()}
                      className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-slate-900 shadow-sm transition hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <SendHorizonal className="size-4" />
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RoutineBuilderTab({
  prefillRequest,
}: {
  prefillRequest?: RoutineBuilderPrefill | null;
}) {
  const [, setLocation] = useLocation();
  const { profile, user } = useAuth();
  const [answers, setAnswers] = useState<RoutineBuilderAnswers>(emptyRoutineBuilderAnswers);
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<RoutineDraftResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = routineBuilderStepLabels.length;
  const displayName = getCoachGreetingName(profile?.firstName, user?.email ?? null);
  const canGenerate =
    answers.targetAreas.length > 0 &&
    Boolean(answers.routineType) &&
    Boolean(answers.availableMinutes) &&
    answers.difficulty !== null;
  // Step 5 doubles as the review surface once a draft exists so users stay in one builder flow.
  const showDraftReview = Boolean(draft) && currentStep === totalSteps - 1;

  // Insight-driven shortcuts can jump directly into the builder. requestId gives each launch a
  // unique identity so selecting the same preset twice still rehydrates the form.
  useEffect(() => {
    if (!prefillRequest) return;

    setAnswers({
      targetAreas: prefillRequest.targetAreas,
      routineType: prefillRequest.routineType,
      availableMinutes: prefillRequest.availableMinutes,
      difficulty: prefillRequest.difficulty,
      userNotes: prefillRequest.userNotes,
    });
    setCurrentStep(totalSteps - 1);
    setDraft(null);
    setError(null);
  }, [prefillRequest, totalSteps]);

  function updateAnswers(
    patch: Partial<RoutineBuilderAnswers>,
    options?: { clearDraft?: boolean },
  ) {
    setAnswers((current) => ({ ...current, ...patch }));
    if (options?.clearDraft ?? true) {
      setDraft(null);
    }
    setError(null);
  }

  function toggleTargetArea(targetArea: string) {
    updateAnswers({
      targetAreas: answers.targetAreas.includes(targetArea)
        ? answers.targetAreas.filter((value) => value !== targetArea)
        : [...answers.targetAreas, targetArea],
    });
  }

  const furthestUnlockedStep = (() => {
    if (answers.targetAreas.length === 0) return 0;
    if (!answers.routineType) return 1;
    if (!answers.availableMinutes) return 2;
    if (answers.difficulty === null) return 3;
    return 4;
  })();

  const currentStepComplete =
    currentStep === 0
      ? answers.targetAreas.length > 0
      : currentStep === 1
        ? Boolean(answers.routineType)
        : currentStep === 2
          ? Boolean(answers.availableMinutes)
          : currentStep === 3
            ? answers.difficulty !== null
            : true;

  function advanceStep() {
    if (!currentStepComplete) return;
    setCurrentStep((step) => Math.min(step + 1, totalSteps - 1));
  }

  // Passing the current draft back in switches the API into "generate another version" mode.
  async function handleGenerate(nextDraft?: RoutineDraftResponse | null) {
    if (!canGenerate) return;

    setGenerating(true);
    setError(null);

    try {
      const generatedDraft = await createRoutineDraft(
        buildRoutineDraftPayload(answers, nextDraft
          ? {
              previousDraft: nextDraft,
              changeRequest: buildRoutineDraftRegenerationRequest(answers.userNotes),
            }
          : undefined),
      );
      setDraft(generatedDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate a routine draft.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft() {
    if (!draft) return;

    setSavingDraft(true);
    setError(null);

    try {
      const savedRoutine = await createRoutine(mapRoutineDraftToUpsertPayload(draft));
      setLocation(`/routines?selected=${savedRoutine.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this routine draft.");
    } finally {
      setSavingDraft(false);
    }
  }

  function handleEditDraft() {
    if (!draft) return;
    sessionStorage.setItem(ROUTINE_EDITOR_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setLocation("/routines/new");
  }

  const stepConfig = [
    {
      eyebrow: "Step 1",
      title: "What do you want to work on today?",
      description: "Choose one or more focus areas for this routine.",
    },
    {
      eyebrow: "Step 2",
      title: "What kind of session do you want?",
      description: "Choose the intent so the routine feels right for today.",
    },
    {
      eyebrow: "Step 3",
      title: "How much time do you have?",
      description: "This helps guide the number of exercises, sets, and reps.",
    },
    {
      eyebrow: "Step 4",
      title: "How hard should it feel today?",
      description: "Set the level so the routine matches your energy and tolerance.",
    },
    {
      eyebrow: "Step 5",
      title: "Anything else you want the coach to consider?",
      description: "Share anything useful, like where you feel tight, what to avoid, or how you want the session to feel.",
    },
  ] as const;

  const currentStepConfig = showDraftReview
    ? {
        eyebrow: "Draft review",
        title: "Review your generated routine",
        description:
          "Tighten the brief if needed, regenerate a new variation, then edit or save when it looks right.",
      }
    : stepConfig[currentStep];

  return (
    <div className="space-y-6">
      <section className="space-y-6">
        <section className="flex flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-[linear-gradient(135deg,rgba(34,55,88,0.84),rgba(51,110,129,0.72),rgba(88,98,162,0.62))] text-white shadow-[0_32px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl md:min-h-[760px]">
          <div className="border-b border-white/10 px-4 py-4 sm:px-5 md:px-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0 max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
                  <Bot className="size-3.5 text-cyan-300" />
                  Routine builder
                </div>
                <p className="mt-3 text-sm text-white/74">
                  I&apos;ll ask a few quick questions, then generate a structured draft you can review,
                  edit, or save.
                </p>
              </div>
              <div className="justify-self-end rounded-2xl border border-white/16 bg-white/10 px-4 py-3 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  {showDraftReview ? "Status" : "Progress"}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {showDraftReview ? "Draft ready" : `${currentStep + 1} of ${totalSteps}`}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
              {routineBuilderStepLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (index <= furthestUnlockedStep) {
                      setCurrentStep(index);
                    }
                  }}
                  disabled={index > furthestUnlockedStep}
                  className={cn(
                    "min-h-11 min-w-[7.25rem] shrink-0 rounded-full px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed sm:min-w-0 sm:rounded-2xl lg:rounded-full",
                    index === currentStep
                      ? "bg-white text-slate-900"
                      : index < currentStep
                        ? "bg-white/18 text-white"
                        : index <= furthestUnlockedStep
                          ? "bg-white/8 text-white/50 hover:bg-white/12 hover:text-white/78"
                          : "bg-white/6 text-white/30",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6">
            <div className="flex min-h-0 flex-1 flex-col rounded-[1.75rem] border border-white/14 bg-[linear-gradient(180deg,rgba(17,24,39,0.12),rgba(15,23,42,0.22))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5 md:p-6">
              <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
                <div className="text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-cyan-100 sm:size-14">
                    <Sparkles className="size-5 sm:size-6" />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/78">
                    {currentStepConfig.eyebrow}
                  </p>
                  <h2 className="mt-2 text-center text-2xl font-display font-semibold text-white sm:text-3xl">
                    {currentStepConfig.title}
                  </h2>
                  <p className="mt-3 text-center text-sm leading-6 text-white/74">
                    {currentStepConfig.description}
                  </p>
                </div>

                <div className="mt-6 flex-1 sm:mt-8">
                  {showDraftReview && draft ? (
                    <RoutineDraftPreviewCard
                      draft={draft}
                      userNotes={answers.userNotes}
                      generating={generating}
                      saving={savingDraft}
                      onUserNotesChange={(value) =>
                        updateAnswers({ userNotes: value }, { clearDraft: false })
                      }
                      onRegenerate={() => void handleGenerate(draft)}
                      onEdit={handleEditDraft}
                      onSave={() => void handleSaveDraft()}
                    />
                  ) : null}

                  {!showDraftReview && currentStep === 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {routineTargetAreaOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleTargetArea(option.value)}
                          className={cn(
                            "rounded-2xl border px-4 py-4 text-left transition",
                            answers.targetAreas.includes(option.value)
                              ? "border-cyan-300/40 bg-cyan-300/16 shadow-[0_20px_40px_rgba(6,182,212,0.12)]"
                              : "border-white/14 bg-white/8 hover:border-white/22 hover:bg-white/12",
                          )}
                        >
                          <p className="text-sm font-semibold text-white">{option.label}</p>
                          <p className="mt-1 text-xs leading-5 text-white/65">{option.description}</p>
                        </button>
                      ))}
                      <div className="sm:col-span-2 xl:col-span-3">
                        <p className="text-center text-xs text-white/56">
                          {answers.targetAreas.length > 0
                            ? `Selected: ${answers.targetAreas.join(", ")}`
                            : "Select at least one area to continue."}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {!showDraftReview && currentStep === 1 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {routineTypeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateAnswers({ routineType: option.value })}
                          className={cn(
                            "rounded-2xl border px-4 py-4 text-left transition",
                            answers.routineType === option.value
                              ? "border-cyan-300/40 bg-cyan-300/16 shadow-[0_20px_40px_rgba(6,182,212,0.12)]"
                              : "border-white/14 bg-white/8 hover:border-white/22 hover:bg-white/12",
                          )}
                        >
                          <p className="text-sm font-semibold text-white">{option.label}</p>
                          <p className="mt-1 text-xs leading-5 text-white/65">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {!showDraftReview && currentStep === 2 ? (
                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
                      {routineDurationOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateAnswers({ availableMinutes: option.value })}
                          className={cn(
                            "rounded-2xl border px-4 py-4 text-center transition",
                            answers.availableMinutes === option.value
                              ? "border-cyan-300/40 bg-cyan-300/16 shadow-[0_20px_40px_rgba(6,182,212,0.12)]"
                              : "border-white/14 bg-white/8 hover:border-white/22 hover:bg-white/12",
                          )}
                        >
                          <p className="text-base font-semibold text-white">{option.label}</p>
                          <p className="mt-1 text-xs leading-5 text-white/65">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {!showDraftReview && currentStep === 3 ? (
                    <div className="mx-auto max-w-3xl space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        {routineDifficultyOptions.slice(0, 3).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateAnswers({ difficulty: option.value })}
                            className={cn(
                              "h-full rounded-2xl border px-4 py-4 text-left transition",
                              answers.difficulty === option.value
                                ? "border-cyan-300/40 bg-cyan-300/16 shadow-[0_20px_40px_rgba(6,182,212,0.12)]"
                                : "border-white/14 bg-white/8 hover:border-white/22 hover:bg-white/12",
                            )}
                          >
                            <p className="text-sm font-semibold text-white">{option.label}</p>
                            <p className="mt-1 text-xs leading-5 text-white/65">{option.description}</p>
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-center gap-4">
                        {routineDifficultyOptions.slice(3).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateAnswers({ difficulty: option.value })}
                            className={cn(
                              "w-full max-w-[240px] rounded-2xl border px-4 py-4 text-left transition",
                              answers.difficulty === option.value
                                ? "border-cyan-300/40 bg-cyan-300/16 shadow-[0_20px_40px_rgba(6,182,212,0.12)]"
                                : "border-white/14 bg-white/8 hover:border-white/22 hover:bg-white/12",
                            )}
                          >
                            <p className="text-sm font-semibold text-white">{option.label}</p>
                            <p className="mt-1 text-xs leading-5 text-white/65">{option.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!showDraftReview && currentStep === 4 ? (
                    <div className="mx-auto max-w-3xl space-y-4">
                      <div className="rounded-2xl border border-white/14 bg-white/8 p-5">
                        <textarea
                          value={answers.userNotes}
                          onChange={(event) => updateAnswers({ userNotes: event.target.value.slice(0, 2000) })}
                          placeholder="Example: My hips feel tight after sitting most of the day, and I want something gentle to ease into."
                          rows={6}
                          className="w-full resize-none rounded-2xl border border-transparent bg-slate-950/12 px-4 py-4 text-sm text-white outline-none placeholder:text-white/45"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/14 bg-white/8 px-4 py-3">
                        <p className="text-sm text-white/72">
                          Ready, {displayName}? Generate a draft and review it before saving.
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleGenerate()}
                          disabled={!canGenerate || generating || savingDraft}
                          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Sparkles className="size-4" />
                          {generating ? "Generating..." : "Generate routine draft"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-8 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (showDraftReview) {
                        setDraft(null);
                        return;
                      }
                      setCurrentStep((step) => Math.max(step - 1, 0));
                    }}
                    disabled={(currentStep === 0 && !showDraftReview) || generating || savingDraft}
                    className="rounded-xl border border-white/14 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white/82 transition hover:border-white/22 hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {showDraftReview ? "Back to notes" : "Back"}
                  </button>
                  <div className="min-w-[96px] text-right">
                    {showDraftReview ? (
                      <p className="text-xs leading-5 text-white/52">
                        Adjust the brief above and regenerate if you want another variation.
                      </p>
                    ) : currentStep < totalSteps - 1 ? (
                      <button
                        type="button"
                        onClick={advanceStep}
                        disabled={!currentStepComplete || generating || savingDraft}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                        <ArrowRight className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              {error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}

export default function CoachPage() {
  const [activeTab, setActiveTab] = useState<CoachTab>("chat");
  const [builderPrefillRequest, setBuilderPrefillRequest] = useState<RoutineBuilderPrefill | null>(
    null,
  );
  const helperText =
    activeTab === "chat"
      ? "Start with a question and let the coach guide you toward the right next step."
      : "Answer a few quick questions and generate a routine you can review, edit, or save.";

  function handleGenerateInsightRoutine(prefill: Omit<RoutineBuilderPrefill, "requestId">) {
    setBuilderPrefillRequest({
      ...prefill,
      requestId: Date.now(),
    });
    setActiveTab("builder");
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/45 bg-slate-900/70 px-7 py-6 text-white shadow-2xl backdrop-blur-xl md:px-8 md:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(45,212,191,0.28),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(99,102,241,0.34),transparent_40%)]" />
        <div className="relative max-w-4xl">
          <h1 className="text-4xl font-display font-bold text-white md:text-5xl">
            Train smarter with your AI coach
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-white/85 md:text-base">
            Get personalised mobility guidance, recovery advice, and routines tailored to how you feel.
          </p>

          <div className="mt-5">
            <SectionTabs activeTab={activeTab} onChange={setActiveTab} />
          </div>

          <p className="mt-3 text-sm text-white/75">{helperText}</p>
        </div>
      </section>

      {activeTab === "chat" ? (
        <CoachChatTab onGenerateInsightRoutine={handleGenerateInsightRoutine} />
      ) : (
        <RoutineBuilderTab prefillRequest={builderPrefillRequest} />
      )}
    </div>
  );
}
