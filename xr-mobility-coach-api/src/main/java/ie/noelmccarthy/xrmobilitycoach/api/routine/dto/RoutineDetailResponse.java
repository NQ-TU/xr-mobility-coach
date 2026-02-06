package ie.noelmccarthy.xrmobilitycoach.api.routine.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Detailed view of a routine including exercises. */
public record RoutineDetailResponse(
        UUID id,
        String title,
        String targetArea,
        Integer estimatedDuration,
        Instant createdAt,
        List<RoutineExerciseResponse> items
) {}
