package ie.noelmccarthy.xrmobilitycoach.api.routine.dto;

import java.time.Instant;
import java.util.UUID;

/** Summary view of a routine for list endpoints. */
public record RoutineSummaryResponse(
        UUID id,
        String title,
        String targetArea,
        Integer estimatedDuration,
        Instant createdAt,
        long exerciseCount
) {}
