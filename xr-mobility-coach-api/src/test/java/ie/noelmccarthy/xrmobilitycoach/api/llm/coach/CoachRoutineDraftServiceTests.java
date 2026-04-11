package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import com.fasterxml.jackson.databind.ObjectMapper;
import ie.noelmccarthy.xrmobilitycoach.api.exercise.Exercise;
import ie.noelmccarthy.xrmobilitycoach.api.exercise.ExerciseRepository;
import ie.noelmccarthy.xrmobilitycoach.api.llm.LlmLogRepository;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CreateRoutineDraftRequest;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftItemResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Sort;

import java.lang.reflect.Field;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CoachRoutineDraftServiceTests {

    private final ExerciseRepository exercises = mock(ExerciseRepository.class);
    private final RoutineDraftPromptBuilder promptBuilder = new RoutineDraftPromptBuilder();
    private final OpenAiClient openAiClient = mock(OpenAiClient.class);
    private final RoutineDraftValidator validator = new RoutineDraftValidator();
    private final LlmLogRepository llmLogs = mock(LlmLogRepository.class);
    private final CoachRoutineDraftService service = new CoachRoutineDraftService(
            exercises,
            promptBuilder,
            openAiClient,
            validator,
            llmLogs
    );

    @Test
    void generateDraftUsesFilteredCatalogueAndReturnsValidatedResponse() {
        Exercise hipsEasy = exercise(UUID.randomUUID(), "Child's Pose", "Hips", 1, 30);
        Exercise shouldersEasy = exercise(UUID.randomUUID(), "Wall Angels", "Shoulders", 1, 10);
        when(exercises.findAll(Sort.by(Sort.Direction.ASC, "name"))).thenReturn(List.of(hipsEasy, shouldersEasy));
        when(openAiClient.generateRoutineDraft(any())).thenReturn(new OpenAiClient.OpenAiRoutineDraftResult(
                new RoutineDraftRawResponse(
                        "Desk Reset",
                        "Hips",
                        List.of(new RoutineDraftRawItemResponse(hipsEasy.getId(), 2, 30, "Breathe"))
                ),
                new ObjectMapper().createObjectNode(),
                new ObjectMapper().createObjectNode()
        ));

        RoutineDraftResponse response = service.generateDraft(UUID.randomUUID(), new CreateRoutineDraftRequest(
                null,
                List.of("Hips"),
                RoutineType.RECOVERY,
                10,
                1,
                "Tight after sitting",
                null,
                null
        ));

        ArgumentCaptor<RoutineDraftPromptBuilder.RoutineDraftPrompt> promptCaptor =
                ArgumentCaptor.forClass(RoutineDraftPromptBuilder.RoutineDraftPrompt.class);
        verify(openAiClient).generateRoutineDraft(promptCaptor.capture());

        assertThat(promptCaptor.getValue().input()).contains(hipsEasy.getId().toString());
        assertThat(promptCaptor.getValue().input()).doesNotContain(shouldersEasy.getId().toString());
        assertThat(response.items()).extracting(RoutineDraftItemResponse::exerciseId).containsExactly(hipsEasy.getId());
        verify(llmLogs).save(any());
    }

    @Test
    void generateDraftLoosensFilteringAndIncludesRegenerateContext() {
        Exercise hipsHard = exercise(UUID.randomUUID(), "Hip Airplane", "Hips", 3, 6);
        Exercise hipsModerate = exercise(UUID.randomUUID(), "Couch Stretch", "Hips", 2, 45);
        Exercise upperBack = exercise(UUID.randomUUID(), "Open Book", "Upper Back", 1, 8);
        when(exercises.findAll(Sort.by(Sort.Direction.ASC, "name")))
                .thenReturn(List.of(hipsHard, hipsModerate, upperBack));
        when(openAiClient.generateRoutineDraft(any())).thenReturn(new OpenAiClient.OpenAiRoutineDraftResult(
                new RoutineDraftRawResponse(
                        "Revised Hip Reset",
                        "Hips, Upper Back",
                        List.of(new RoutineDraftRawItemResponse(hipsModerate.getId(), 1, 45, "Ease into it"))
                ),
                new ObjectMapper().createObjectNode(),
                new ObjectMapper().createObjectNode()
        ));

        RoutineDraftResponse previousDraft = new RoutineDraftResponse(
                "Hip Reset",
                "Hips, Upper Back",
                RoutineType.RECOVERY,
                4,
                List.of(new RoutineDraftItemResponse(
                        hipsHard.getId(),
                        "Hip Airplane",
                        "Hips",
                        1,
                        1,
                        6,
                        "Control the range"
                ))
        );

        RoutineDraftResponse response = service.generateDraft(UUID.randomUUID(), new CreateRoutineDraftRequest(
                null,
                List.of("Hips", "Upper Back"),
                RoutineType.RECOVERY,
                10,
                4,
                "Tight after leg day",
                "Make it gentler and more beginner-friendly.",
                previousDraft
        ));

        ArgumentCaptor<RoutineDraftPromptBuilder.RoutineDraftPrompt> promptCaptor =
                ArgumentCaptor.forClass(RoutineDraftPromptBuilder.RoutineDraftPrompt.class);
        verify(openAiClient).generateRoutineDraft(promptCaptor.capture());

        assertThat(promptCaptor.getValue().input()).contains("filterStrategy=target area only");
        assertThat(promptCaptor.getValue().input()).contains("targetAreas=Hips | Upper Back");
        assertThat(promptCaptor.getValue().input()).contains("Make it gentler and more beginner-friendly.");
        assertThat(promptCaptor.getValue().input()).contains("Hip Reset");
        assertThat(promptCaptor.getValue().input()).contains(hipsModerate.getId().toString());
        assertThat(promptCaptor.getValue().input()).contains(upperBack.getId().toString());
        assertThat(response.items()).extracting(RoutineDraftItemResponse::exerciseId).containsExactly(hipsModerate.getId());
    }

    @Test
    void generateDraftWithAnyDifficultyUsesTargetAreaFilteringOnly() {
        Exercise hipsEasy = exercise(UUID.randomUUID(), "Child's Pose", "Hips", 1, 30);
        Exercise hipsHard = exercise(UUID.randomUUID(), "Hip Airplane", "Hips", 3, 6);
        Exercise shouldersEasy = exercise(UUID.randomUUID(), "Wall Angels", "Shoulders", 1, 10);
        when(exercises.findAll(Sort.by(Sort.Direction.ASC, "name")))
                .thenReturn(List.of(hipsEasy, hipsHard, shouldersEasy));
        when(openAiClient.generateRoutineDraft(any())).thenReturn(new OpenAiClient.OpenAiRoutineDraftResult(
                new RoutineDraftRawResponse(
                        "Desk Reset",
                        "Hips",
                        List.of(new RoutineDraftRawItemResponse(hipsHard.getId(), 1, 6, "Control the range"))
                ),
                new ObjectMapper().createObjectNode(),
                new ObjectMapper().createObjectNode()
        ));

        RoutineDraftResponse response = service.generateDraft(UUID.randomUUID(), new CreateRoutineDraftRequest(
                null,
                List.of("Hips"),
                RoutineType.RECOVERY,
                10,
                null,
                "Tight after sitting",
                null,
                null
        ));

        ArgumentCaptor<RoutineDraftPromptBuilder.RoutineDraftPrompt> promptCaptor =
                ArgumentCaptor.forClass(RoutineDraftPromptBuilder.RoutineDraftPrompt.class);
        verify(openAiClient, atLeastOnce()).generateRoutineDraft(promptCaptor.capture());

        assertThat(promptCaptor.getValue().input()).contains("difficulty=Any");
        assertThat(promptCaptor.getValue().input()).contains("filterStrategy=target area only (any difficulty)");
        assertThat(promptCaptor.getValue().input()).contains(hipsEasy.getId().toString());
        assertThat(promptCaptor.getValue().input()).contains(hipsHard.getId().toString());
        assertThat(promptCaptor.getValue().input()).doesNotContain(shouldersEasy.getId().toString());
        assertThat(response.items()).extracting(RoutineDraftItemResponse::exerciseId).containsExactly(hipsHard.getId());
    }

    @Test
    void generateDraftAllowsValidCatalogueExerciseOutsidePreferredFilter() {
        Exercise hipsEasy = exercise(UUID.randomUUID(), "Child's Pose", "Hips", 1, 30);
        Exercise shouldersEasy = exercise(UUID.randomUUID(), "Wall Angels", "Shoulders", 1, 10);
        when(exercises.findAll(Sort.by(Sort.Direction.ASC, "name")))
                .thenReturn(List.of(hipsEasy, shouldersEasy));
        when(openAiClient.generateRoutineDraft(any())).thenReturn(new OpenAiClient.OpenAiRoutineDraftResult(
                new RoutineDraftRawResponse(
                        "Desk Reset",
                        "Shoulders",
                        List.of(new RoutineDraftRawItemResponse(shouldersEasy.getId(), 2, 10, "Move slowly"))
                ),
                new ObjectMapper().createObjectNode(),
                new ObjectMapper().createObjectNode()
        ));

        RoutineDraftResponse response = service.generateDraft(UUID.randomUUID(), new CreateRoutineDraftRequest(
                null,
                List.of("Hips"),
                RoutineType.RECOVERY,
                10,
                1,
                "Tight after sitting",
                null,
                null
        ));

        assertThat(response.targetArea()).isEqualTo("Hips");
        assertThat(response.items()).extracting(RoutineDraftItemResponse::exerciseId).containsExactly(shouldersEasy.getId());
    }

    private static Exercise exercise(UUID id, String name, String muscleGroup, int difficulty, int defaultHoldTimeOrReps) {
        Exercise exercise = new Exercise(name, name + " description", muscleGroup, difficulty, defaultHoldTimeOrReps, name);
        setId(exercise, id);
        return exercise;
    }

    private static void setId(Exercise exercise, UUID id) {
        try {
            Field field = Exercise.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(exercise, id);
        } catch (ReflectiveOperationException ex) {
            throw new AssertionError(ex);
        }
    }
}
