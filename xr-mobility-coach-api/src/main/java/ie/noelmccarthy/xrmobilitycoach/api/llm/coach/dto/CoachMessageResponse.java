package ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto;

import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.CoachMessageRole;

import java.time.Instant;
import java.util.UUID;

/** Response model for a persisted coach message. */
public record CoachMessageResponse(
        UUID id,
        CoachMessageRole role,
        String content,
        Instant createdAt
) {}
