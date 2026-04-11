package ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Item returned in an unsaved generated routine draft. */
public record RoutineDraftItemResponse(
        @NotNull
        UUID exerciseId,

        @NotBlank @Size(max = 255)
        String exerciseName,

        @NotBlank @Size(max = 100)
        String muscleGroup,

        @NotNull @Min(1)
        Integer sequenceIndex,

        @NotNull @Min(1)
        Integer sets,

        @NotNull @Min(1)
        Integer repsOrHoldSeconds,

        @Size(max = 1000)
        String notes
) {}
