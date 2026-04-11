package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import ie.noelmccarthy.xrmobilitycoach.api.llm.LlmLog;
import ie.noelmccarthy.xrmobilitycoach.api.llm.LlmLogRepository;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CoachChatRequest;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CoachChatResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CoachConversationSummaryResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CoachMessageResponse;
import ie.noelmccarthy.xrmobilitycoach.api.profile.UserProfileService;
import ie.noelmccarthy.xrmobilitycoach.api.profile.dto.UserProfileResponse;
import ie.noelmccarthy.xrmobilitycoach.api.routine.Routine;
import ie.noelmccarthy.xrmobilitycoach.api.routine.RoutineRepository;
import ie.noelmccarthy.xrmobilitycoach.api.sessions.Session;
import ie.noelmccarthy.xrmobilitycoach.api.sessions.SessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** Orchestrates persisted coach conversations and outbound LLM calls. */
@Service
public class CoachService {

    private static final Logger log = LoggerFactory.getLogger(CoachService.class);
    private static final int RECENT_ROUTINES_LIMIT = 5;
    private static final int RECENT_SESSIONS_LIMIT = 5;

    private final CoachConversationRepository conversations;
    private final CoachMessageRepository messages;
    private final UserProfileService profiles;
    private final RoutineRepository routines;
    private final SessionRepository sessions;
    private final CoachPromptBuilder promptBuilder;
    private final OpenAiClient openAiClient;
    private final CoachResponseValidator responseValidator;
    private final LlmLogRepository llmLogs;
    private final OpenAiProperties openAiProperties;

    public CoachService(CoachConversationRepository conversations,
                        CoachMessageRepository messages,
                        UserProfileService profiles,
                        RoutineRepository routines,
                        SessionRepository sessions,
                        CoachPromptBuilder promptBuilder,
                        OpenAiClient openAiClient,
                        CoachResponseValidator responseValidator,
                        LlmLogRepository llmLogs,
                        OpenAiProperties openAiProperties) {
        this.conversations = conversations;
        this.messages = messages;
        this.profiles = profiles;
        this.routines = routines;
        this.sessions = sessions;
        this.promptBuilder = promptBuilder;
        this.openAiClient = openAiClient;
        this.responseValidator = responseValidator;
        this.llmLogs = llmLogs;
        this.openAiProperties = openAiProperties;
    }

    public CoachChatResponse chat(UUID userId, CoachChatRequest request) {
        CoachConversation conversation = getOrCreateConversation(userId, request.conversationId());
        persistMessage(conversation, CoachMessageRole.USER, request.message());

        UserProfileResponse profile = profiles.getOrCreate(userId);
        List<Routine> recentRoutines = routines.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(0, RECENT_ROUTINES_LIMIT));
        List<Session> recentSessions = sessions.findByUserIdOrderByEndedAtDesc(
                userId, PageRequest.of(0, RECENT_SESSIONS_LIMIT));
        List<CoachMessage> recentMessages = recentMessages(conversation.getId());

        CoachPromptBuilder.CoachPrompt prompt = promptBuilder.build(
                profile,
                recentRoutines,
                recentSessions,
                recentMessages
        );

        OpenAiClient.OpenAiChatResult llmResult = openAiClient.generateCoachReply(prompt);
        try {
            String assistantReply = responseValidator.validateChatReply(llmResult.message());
            CoachMessage savedAssistantMessage = persistMessage(conversation, CoachMessageRole.ASSISTANT, assistantReply);
            llmLogs.save(new LlmLog(userId, llmResult.requestJson(), llmResult.responseJson(), true));

            log.info("Coach chat response created: userId={}, conversationId={}, assistantMessageId={}",
                    userId, conversation.getId(), savedAssistantMessage.getId());

            return new CoachChatResponse(conversation.getId(), savedAssistantMessage.getContent(),
                    savedAssistantMessage.getCreatedAt());
        } catch (RuntimeException ex) {
            llmLogs.save(new LlmLog(userId, llmResult.requestJson(), llmResult.responseJson(), false));
            throw ex;
        }
    }

    public List<CoachMessageResponse> messages(UUID userId, UUID conversationId) {
        CoachConversation conversation = requireConversation(userId, conversationId);
        return messages.findByConversationIdOrderByCreatedAtAsc(conversation.getId()).stream()
                .map(message -> new CoachMessageResponse(
                        message.getId(),
                        message.getRole(),
                        message.getContent(),
                        message.getCreatedAt()
                ))
                .toList();
    }

    public List<CoachConversationSummaryResponse> conversations(UUID userId) {
        return conversations.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .map(conversation -> new CoachConversationSummaryResponse(
                        conversation.getId(),
                        conversation.getCreatedAt(),
                        conversation.getUpdatedAt(),
                        buildPreview(messages.findFirstByConversationIdOrderByCreatedAtDesc(conversation.getId()))
                ))
                .toList();
    }

    public void deleteConversation(UUID userId, UUID conversationId) {
        CoachConversation conversation = requireConversation(userId, conversationId);
        conversations.delete(conversation);
        log.info("Deleted coach conversation: userId={}, conversationId={}", userId, conversationId);
    }

    private CoachConversation getOrCreateConversation(UUID userId, UUID conversationId) {
        if (conversationId == null) {
            CoachConversation conversation = conversations.save(new CoachConversation(userId));
            log.info("Created coach conversation: userId={}, conversationId={}", userId, conversation.getId());
            return conversation;
        }

        return requireConversation(userId, conversationId);
    }

    private CoachMessage persistMessage(CoachConversation conversation, CoachMessageRole role, String content) {
        String normalizedContent = normalizeRequired(content);
        conversation.touch();
        conversations.save(conversation);
        return messages.save(new CoachMessage(conversation.getId(), role, normalizedContent));
    }

    private List<CoachMessage> recentMessages(UUID conversationId) {
        List<CoachMessage> latest = messages.findByConversationIdOrderByCreatedAtDesc(
                conversationId,
                PageRequest.of(0, Math.max(1, openAiProperties.getMaxHistoryMessages()))
        );
        List<CoachMessage> ordered = new ArrayList<>(latest);
        ordered.sort(Comparator.comparing(CoachMessage::getCreatedAt));
        return ordered;
    }

    private CoachConversation requireConversation(UUID userId, UUID conversationId) {
        return conversations.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
    }

    private static String normalizeRequired(String value) {
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required");
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required");
        }
        return trimmed;
    }

    private static String buildPreview(CoachMessage message) {
        if (message == null) {
            return null;
        }
        String content = message.getContent();
        if (content == null) {
            return null;
        }
        String normalized = content.replace("\r\n", "\n").trim();
        if (normalized.length() <= 120) {
            return normalized;
        }
        return normalized.substring(0, 117).trim() + "...";
    }
}
