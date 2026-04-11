package ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Structured request for first-pass routine generation or regeneration. */
public record CreateRoutineDraftRequest(
        @Size(max = 100)
        String targetArea,

        List<@NotBlank @Size(max = 100) String> targetAreas,

        @NotNull
        RoutineType routineType,

        @NotNull @Min(1) @Max(180)
        Integer availableMinutes,

        @Min(1) @Max(4)
        Integer difficulty,

        @NotBlank @Size(max = 2000)
        String userNotes,

        @Size(max = 2000)
        String changeRequest,

        @Valid
        RoutineDraftResponse previousDraft
) {}
