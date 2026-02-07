package ie.noelmccarthy.xrmobilitycoach.api.sessions.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/** Request model for a single exercise metric within a session. */
public record SessionMetricRequest(
        @NotNull
        UUID exerciseId,

        @NotNull @Min(1)
        Integer setIndex,

        Boolean completed,
        Boolean skipped,
        Integer repsCompleted,
        BigDecimal timeUnderTension,
        Integer exerciseRpe,
        String notes
) {}
