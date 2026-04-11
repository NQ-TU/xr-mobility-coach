package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import ie.noelmccarthy.xrmobilitycoach.api.exercise.Exercise;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CreateRoutineDraftRequest;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftItemResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RoutineDraftPromptBuilderTests {

    private final RoutineDraftPromptBuilder promptBuilder = new RoutineDraftPromptBuilder();

    @Test
    void buildIncludesStructuredContractAllowedCatalogueAndNoTranscript() {
        Exercise childsPose = new Exercise(
                "Child's Pose",
                "Relaxed kneeling stretch",
                "Hips",
                1,
                30,
                "childs_pose"
        );
        Exercise catCow = new Exercise(
                "Cat-Cow",
                "Spinal mobility",
                "Spine",
                1,
                8,
                "cat_cow"
        );

        CreateRoutineDraftRequest request = new CreateRoutineDraftRequest(
                "Hips, Lower Back",
                List.of("Hips", "Lower Back"),
                RoutineType.RECOVERY,
                12,
                1,
                "Stiff after long desk days.",
                null,
                null
        );

        RoutineDraftPromptBuilder.RoutineDraftPrompt prompt = promptBuilder.build(
                request,
                List.of(childsPose, catCow),
                "exact target area and exact difficulty"
        );

        assertThat(prompt.instructions()).contains("Return strict JSON only");
        assertThat(prompt.instructions()).contains("\"title\"");
        assertThat(prompt.instructions()).contains("\"exerciseId\"");
        assertThat(prompt.instructions()).contains("Do not return prose");
        assertThat(prompt.instructions()).contains("Avoid one-set routines unless the time budget is extremely short");
        assertThat(prompt.instructions()).contains("defaultRepsOrHoldSeconds as the primary baseline");
        assertThat(prompt.input()).contains("targetArea=Hips, Lower Back");
        assertThat(prompt.input()).contains("targetAreas=Hips | Lower Back");
        assertThat(prompt.input()).contains("routineType=Recovery reset");
        assertThat(prompt.input()).contains("filterStrategy=exact target area and exact difficulty");
        assertThat(prompt.input()).contains("ALLOWED EXERCISE CATALOGUE");
        assertThat(prompt.input()).contains("Child's Pose");
        assertThat(prompt.input()).contains("Cat-Cow");
        assertThat(prompt.input()).doesNotContain("RECENT CONVERSATION");
    }

    @Test
    void buildIncludesPreviousDraftAndChangeRequestForRegenerateFlow() {
        UUID exerciseId = UUID.randomUUID();
        Exercise exercise = new Exercise(
                "Open Book",
                "Thoracic rotation stretch",
                "Upper Back",
                1,
                8,
                "open_book"
        );

        CreateRoutineDraftRequest request = new CreateRoutineDraftRequest(
                "Upper Back, Shoulders",
                List.of("Upper Back", "Shoulders"),
                RoutineType.MOBILITY,
                15,
                2,
                "Need something before work.",
                "Make it gentler and shorter.",
                new RoutineDraftResponse(
                        "Morning Reset",
                        "Upper Back, Shoulders",
                        RoutineType.MOBILITY,
                        8,
                        List.of(new RoutineDraftItemResponse(
                                exerciseId,
                                "Open Book",
                                "Upper Back",
                                1,
                                2,
                                8,
                                "Move slowly"
                        ))
                )
        );

        RoutineDraftPromptBuilder.RoutineDraftPrompt prompt = promptBuilder.build(
                request,
                List.of(exercise),
                "target area with loosened difficulty"
        );

        assertThat(prompt.input()).contains("CHANGE REQUEST");
        assertThat(prompt.input()).contains("Make it gentler and shorter.");
        assertThat(prompt.input()).contains("PREVIOUS DRAFT");
        assertThat(prompt.input()).contains("Morning Reset");
        assertThat(prompt.input()).contains(exerciseId.toString());
    }

    @Test
    void buildUsesAnyDifficultyLabelWhenDifficultyIsOmitted() {
        Exercise exercise = new Exercise(
                "Open Book",
                "Thoracic rotation stretch",
                "Upper Back",
                1,
                8,
                "open_book"
        );

        CreateRoutineDraftRequest request = new CreateRoutineDraftRequest(
                "Upper Back",
                List.of("Upper Back"),
                RoutineType.MOBILITY,
                15,
                null,
                "Need something before work.",
                null,
                null
        );

        RoutineDraftPromptBuilder.RoutineDraftPrompt prompt = promptBuilder.build(
                request,
                List.of(exercise),
                "target area only (any difficulty)"
        );

        assertThat(prompt.input()).contains("difficulty=Any");
        assertThat(prompt.input()).contains("filterStrategy=target area only (any difficulty)");
    }
}
