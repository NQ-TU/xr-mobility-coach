package ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Request model for a coach chat turn. */
public record CoachChatRequest(
        UUID conversationId,

        @NotBlank
        @Size(max = 4000)
        String message
) {}
