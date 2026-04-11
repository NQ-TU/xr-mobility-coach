package ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Unsaved generated routine draft returned to the frontend. */
public record RoutineDraftResponse(
        @NotBlank @Size(max = 255)
        String title,

        @NotBlank @Size(max = 100)
        String targetArea,

        @NotNull
        RoutineType routineType,

        @NotNull @Min(1)
        Integer estimatedDuration,

        @NotEmpty @Valid
        List<RoutineDraftItemResponse> items
) {}
