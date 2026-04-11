import { apiJson } from "@/lib/api";

export type CoachChatRequest = {
  conversationId: string | null;
  message: string;
};

export type CoachChatResponse = {
  conversationId: string;
  message: string;
  createdAt: string;
};

export type CoachMessageResponse = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
};

export type CoachConversationSummaryResponse = {
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string | null;
};

export type RoutineType = "MOBILITY" | "WARMUP" | "RECOVERY" | "COOLDOWN";

export type RoutineDraftItemResponse = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sequenceIndex: number;
  sets: number;
  repsOrHoldSeconds: number;
  notes?: string | null;
};

export type RoutineDraftResponse = {
  title: string;
  targetArea: string;
  routineType: RoutineType;
  estimatedDuration: number;
  items: RoutineDraftItemResponse[];
};

export type CreateRoutineDraftRequest = {
  targetAreas?: string[];
  targetArea?: string | null;
  routineType: RoutineType;
  availableMinutes: number;
  difficulty: number | null;
  userNotes: string;
  changeRequest?: string | null;
  previousDraft?: RoutineDraftResponse | null;
};

export const ROUTINE_EDITOR_DRAFT_STORAGE_KEY = "routine_editor_draft";

export async function sendCoachMessage(payload: CoachChatRequest): Promise<CoachChatResponse> {
  return apiJson<CoachChatResponse>("/api/coach/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCoachMessages(conversationId: string): Promise<CoachMessageResponse[]> {
  return apiJson<CoachMessageResponse[]>(`/api/coach/conversations/${conversationId}/messages`);
}

export async function listCoachConversations(): Promise<CoachConversationSummaryResponse[]> {
  return apiJson<CoachConversationSummaryResponse[]>("/api/coach/conversations");
}

export async function deleteCoachConversation(conversationId: string): Promise<void> {
  await apiJson<void>(`/api/coach/conversations/${conversationId}`, {
    method: "DELETE",
  });
}

export async function createRoutineDraft(
  payload: CreateRoutineDraftRequest,
): Promise<RoutineDraftResponse> {
  return apiJson<RoutineDraftResponse>("/api/coach/routine-drafts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
