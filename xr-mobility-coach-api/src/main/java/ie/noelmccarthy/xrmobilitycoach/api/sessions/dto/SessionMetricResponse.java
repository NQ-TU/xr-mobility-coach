package ie.noelmccarthy.xrmobilitycoach.api.sessions.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Detailed metric view for a session exercise. */
public record SessionMetricResponse(
        UUID exerciseId,
        String exerciseName,
        String muscleGroup,
        Integer setIndex,
        Boolean completed,
        Boolean skipped,
        Integer repsCompleted,
        BigDecimal timeUnderTension,
        Integer exerciseRpe,
        String notes
) {}
