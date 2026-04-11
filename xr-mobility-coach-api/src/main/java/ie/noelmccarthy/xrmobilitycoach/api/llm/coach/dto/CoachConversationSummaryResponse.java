package ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto;

import java.time.Instant;
import java.util.UUID;

/** Response model for listing a user's stored coach conversations. */
public record CoachConversationSummaryResponse(
        UUID conversationId,
        Instant createdAt,
        Instant updatedAt,
        String lastMessagePreview
) {}
