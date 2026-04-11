package ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto;

import java.time.Instant;
import java.util.UUID;

/** Response model for a coach chat turn. */
public record CoachChatResponse(
        UUID conversationId,
        String message,
        Instant createdAt
) {}
