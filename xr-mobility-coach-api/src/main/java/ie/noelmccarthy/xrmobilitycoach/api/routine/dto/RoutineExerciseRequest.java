package ie.noelmccarthy.xrmobilitycoach.api.routine.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Request model for a routine exercise item. */
public record RoutineExerciseRequest(
        @NotNull
        UUID exerciseId,

        @Min(1)
        Integer sets,

        @NotNull @Min(1)
        Integer repsOrHoldSeconds,

        String tempo,
        String coachingNotes
) {}
