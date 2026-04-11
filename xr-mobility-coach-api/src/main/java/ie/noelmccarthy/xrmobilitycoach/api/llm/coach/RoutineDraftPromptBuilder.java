package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import ie.noelmccarthy.xrmobilitycoach.api.exercise.Exercise;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CreateRoutineDraftRequest;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftItemResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftResponse;
import org.springframework.stereotype.Component;

import java.util.List;

/** Builds the structured prompt for unsaved routine draft generation. */
@Component
public class RoutineDraftPromptBuilder {

    public RoutineDraftPrompt build(CreateRoutineDraftRequest request,
                                    List<Exercise> allowedExercises,
                                    String filterStrategy) {
        String instructions = """
                You generate unsaved mobility routine drafts for MoFlow.
                Return strict JSON only. Do not return prose, markdown, commentary, or code fences.
                The JSON must contain exactly:
                {
                  "title": "string",
                  "targetArea": "string",
                  "items": [
                    {
                      "exerciseId": "uuid",
                      "sets": 1,
                      "repsOrHoldSeconds": 1,
                      "notes": "string or null"
                    }
                  ]
                }
                Use only exerciseId values from the allowed exercise catalogue in the input.
                Respect the requested target areas, routine type, time budget, and difficulty.
                The targetArea value in the JSON must exactly match the targetArea label provided in the request.
                Keep the item order intentional because the array order is the routine order.
                Every item must include real exerciseId values, sets, repsOrHoldSeconds, and notes.
                Use the catalogue's defaultRepsOrHoldSeconds as the primary baseline for repsOrHoldSeconds unless there is a clear reason to vary slightly.
                Avoid one-set routines unless the time budget is extremely short.
                Prefer 2-3 sets for most exercises and vary sets intentionally to fit the requested time budget.
                Do not add extra top-level keys.
                """;

        StringBuilder input = new StringBuilder();
        input.append("ROUTINE REQUEST\n")
                .append("targetArea=").append(request.targetArea()).append('\n')
                .append("targetAreas=").append(String.join(" | ", request.targetAreas())).append('\n')
                .append("routineType=").append(request.routineType().promptLabel()).append('\n')
                .append("availableMinutes=").append(request.availableMinutes()).append('\n')
                .append("difficulty=").append(request.difficulty() == null ? "Any" : request.difficulty()).append('\n')
                .append("userNotes=").append(request.userNotes()).append('\n')
                .append("filterStrategy=").append(filterStrategy).append("\n\n");

        if (request.changeRequest() != null && request.previousDraft() != null) {
            input.append("CHANGE REQUEST\n")
                    .append(request.changeRequest())
                    .append("\n\n");
            input.append("PREVIOUS DRAFT\n");
            appendDraft(input, request.previousDraft());
            input.append('\n');
        }

        input.append("ALLOWED EXERCISE CATALOGUE\n");
        for (Exercise exercise : allowedExercises) {
            input.append("- id=").append(exercise.getId())
                    .append(" | name=").append(exercise.getName())
                    .append(" | muscleGroup=").append(valueOrUnknown(exercise.getMuscleGroup()))
                    .append(" | difficulty=").append(valueOrUnknown(exercise.getDifficulty()))
                    .append(" | defaultRepsOrHoldSeconds=").append(valueOrUnknown(exercise.getDefaultHoldTimeOrReps()))
                    .append('\n');
        }

        return new RoutineDraftPrompt(instructions, input.toString());
    }

    private static void appendDraft(StringBuilder input, RoutineDraftResponse previousDraft) {
        input.append("title=").append(previousDraft.title()).append('\n')
                .append("targetArea=").append(previousDraft.targetArea()).append('\n')
                .append("routineType=").append(previousDraft.routineType()).append('\n')
                .append("estimatedDuration=").append(previousDraft.estimatedDuration()).append('\n')
                .append("items:\n");
        for (RoutineDraftItemResponse item : previousDraft.items()) {
            input.append("  - sequenceIndex=").append(item.sequenceIndex())
                    .append(" | exerciseId=").append(item.exerciseId())
                    .append(" | exerciseName=").append(item.exerciseName())
                    .append(" | muscleGroup=").append(item.muscleGroup())
                    .append(" | sets=").append(item.sets())
                    .append(" | repsOrHoldSeconds=").append(item.repsOrHoldSeconds())
                    .append(" | notes=").append(valueOrUnknown(item.notes()))
                    .append('\n');
        }
    }

    private static String valueOrUnknown(Object value) {
        return value == null ? "not set" : value.toString();
    }

    public record RoutineDraftPrompt(String instructions, String input) {}
}
