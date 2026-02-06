package ie.noelmccarthy.xrmobilitycoach.api.routine.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Request model for creating or updating a routine. */
public record UpsertRoutineRequest(
        @NotBlank @Size(max = 255)
        String title,

        @Size(max = 100)
        String targetArea,

        @Min(1)
        Integer estimatedDuration,

        @NotEmpty @Valid
        List<RoutineExerciseRequest> items
) {}
