package ie.noelmccarthy.xrmobilitycoach.api.routine.dto;

import java.util.UUID;

/** Detailed view of an exercise in a routine. */
public record RoutineExerciseResponse(
        UUID exerciseId,
        String exerciseName,
        String muscleGroup,
        Integer sequenceIndex,
        Integer sets,
        Integer repsOrHoldSeconds,
        String tempo,
        String coachingNotes
) {}
