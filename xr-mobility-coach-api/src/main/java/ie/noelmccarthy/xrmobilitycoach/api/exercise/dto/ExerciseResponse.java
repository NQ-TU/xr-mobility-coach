package ie.noelmccarthy.xrmobilitycoach.api.exercise.dto;

import java.util.UUID;

/** Response model for exercise catalogue entries. */
public record ExerciseResponse(
        UUID id,
        String name,
        String description,
        String muscleGroup,
        Integer difficulty,
        Integer defaultHoldTimeOrReps,
        String animationAssetId
) {}
