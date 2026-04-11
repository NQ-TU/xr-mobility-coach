package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import ie.noelmccarthy.xrmobilitycoach.api.exercise.Exercise;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CreateRoutineDraftRequest;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftItemResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RoutineDraftValidatorTests {

    private final RoutineDraftValidator validator = new RoutineDraftValidator();

    @Test
    void normalizeRequestTrimsStringsAndValidatesRegeneratePairing() {
        Exercise exercise = exercise(UUID.randomUUID(), "Child's Pose", "Hips", 1, 30);

        CreateRoutineDraftRequest normalized = validator.normalizeRequest(
                new CreateRoutineDraftRequest(
                        null,
                        List.of("  Hips  ", " lower back "),
                        RoutineType.RECOVERY,
                        10,
                        1,
                        "  Tight after sitting  ",
                        "  Make it easier  ",
                        new RoutineDraftResponse(
                                "  Reset  ",
                                " hips, lower back ",
                                RoutineType.RECOVERY,
                                4,
                                List.of(new RoutineDraftItemResponse(
                                        exercise.getId(),
                                        "Wrong name from client",
                                        "Wrong group",
                                        1,
                                        1,
                                        30,
                                        "  Breathe  "
                                ))
                        )
                ),
                Map.of(exercise.getId(), exercise)
        );

        assertThat(normalized.targetArea()).isEqualTo("Hips, Lower Back");
        assertThat(normalized.targetAreas()).containsExactly("Hips", "Lower Back");
        assertThat(normalized.userNotes()).isEqualTo("Tight after sitting");
        assertThat(normalized.changeRequest()).isEqualTo("Make it easier");
        assertThat(normalized.previousDraft()).isNotNull();
        assertThat(normalized.previousDraft().title()).isEqualTo("Reset");
        assertThat(normalized.previousDraft().targetArea()).isEqualTo("Hips, Lower Back");
        assertThat(normalized.previousDraft().items().get(0).exerciseName()).isEqualTo("Child's Pose");
        assertThat(normalized.previousDraft().items().get(0).muscleGroup()).isEqualTo("Hips");
    }

    @Test
    void normalizeRequestRejectsChangeRequestWithoutPreviousDraft() {
        assertThatThrownBy(() -> validator.normalizeRequest(
                new CreateRoutineDraftRequest(
                        "Hips",
                        null,
                        RoutineType.MOBILITY,
                        10,
                        1,
                        "Desk stiffness",
                        "Make it shorter",
                        null
                ),
                Map.of()
        )).isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(ex.getReason()).contains("previousDraft");
        });
    }

    @Test
    void normalizeRequestRejectsMissingTargetAreaAndTargetAreas() {
        assertThatThrownBy(() -> validator.normalizeRequest(
                new CreateRoutineDraftRequest(
                        null,
                        null,
                        RoutineType.MOBILITY,
                        10,
                        1,
                        "Desk stiffness",
                        null,
                        null
                ),
                Map.of()
        )).isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(ex.getReason()).contains("targetArea");
        });
    }

    @Test
    void normalizeRequestAllowsMissingDifficultyAsAnyDifficulty() {
        CreateRoutineDraftRequest normalized = validator.normalizeRequest(
                new CreateRoutineDraftRequest(
                        null,
                        List.of("Hips"),
                        RoutineType.RECOVERY,
                        10,
                        null,
                        "Desk stiffness",
                        null,
                        null
                ),
                Map.of()
        );

        assertThat(normalized.difficulty()).isNull();
        assertThat(normalized.targetAreas()).containsExactly("Hips");
    }

    @Test
    void validateGeneratedDraftRejectsUnknownExercisesAndDuplicatesButAllowsOffFilterCatalogueExercises() {
        Exercise allowedExercise = exercise(UUID.randomUUID(), "Child's Pose", "Hips", 1, 30);
        Exercise offFilterExercise = exercise(UUID.randomUUID(), "Open Book", "Upper Back", 1, 8);
        UUID unknownExerciseId = UUID.randomUUID();
        CreateRoutineDraftRequest request = new CreateRoutineDraftRequest(
                "Hips, Lower Back",
                List.of("Hips", "Lower Back"),
                RoutineType.RECOVERY,
                12,
                1,
                "Desk stiffness",
                null,
                null
        );

        assertThatThrownBy(() -> validator.validateGeneratedDraft(
                new RoutineDraftRawResponse(
                        "Reset",
                        "Hips, Lower Back",
                        List.of(
                                new RoutineDraftRawItemResponse(unknownExerciseId, 2, 30, null)
                        )
                ),
                request,
                List.of(allowedExercise, offFilterExercise)
        )).isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
            assertThat(ex.getReason()).contains("unknown");
        });

        assertThatThrownBy(() -> validator.validateGeneratedDraft(
                new RoutineDraftRawResponse(
                        "Reset",
                        "Hips, Lower Back",
                        List.of(
                                new RoutineDraftRawItemResponse(allowedExercise.getId(), 2, 30, null),
                                new RoutineDraftRawItemResponse(allowedExercise.getId(), 1, 20, null)
                        )
                ),
                request,
                List.of(allowedExercise)
        )).isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
            assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
            assertThat(ex.getReason()).contains("Duplicate");
        });

        RoutineDraftResponse response = validator.validateGeneratedDraft(
                new RoutineDraftRawResponse(
                        "Reset",
                        "Shoulders",
                        List.of(new RoutineDraftRawItemResponse(offFilterExercise.getId(), 2, 30, null))
                ),
                request,
                List.of(allowedExercise, offFilterExercise)
        );

        assertThat(response.targetArea()).isEqualTo("Hips, Lower Back");
        assertThat(response.items()).extracting(RoutineDraftItemResponse::exerciseId).containsExactly(offFilterExercise.getId());
    }

    @Test
    void validateGeneratedDraftComputesEstimatedDurationOnBackend() {
        Exercise childsPose = exercise(UUID.randomUUID(), "Child's Pose", "Hips", 1, 30);
        Exercise catCow = exercise(UUID.randomUUID(), "Cat-Cow", "Spine", 1, 8);
        CreateRoutineDraftRequest request = new CreateRoutineDraftRequest(
                "Hips, Spine",
                List.of("Hips", "Spine"),
                RoutineType.RECOVERY,
                10,
                1,
                "Desk stiffness",
                null,
                null
        );

        RoutineDraftResponse response = validator.validateGeneratedDraft(
                new RoutineDraftRawResponse(
                        "Desk Reset",
                        " hips, spine ",
                        List.of(
                                new RoutineDraftRawItemResponse(childsPose.getId(), 2, 30, "  Slow breaths  "),
                                new RoutineDraftRawItemResponse(catCow.getId(), 1, 8, "")
                        )
                ),
                request,
                List.of(childsPose, catCow)
        );

        assertThat(response.estimatedDuration()).isEqualTo(3);
        assertThat(response.routineType()).isEqualTo(RoutineType.RECOVERY);
        assertThat(response.items()).extracting(RoutineDraftItemResponse::sequenceIndex).containsExactly(1, 2);
        assertThat(response.items()).extracting(RoutineDraftItemResponse::notes).containsExactly("Slow breaths", null);
    }

    @Test
    void validateGeneratedDraftUsesRequestedTargetAreaWhenModelReturnsDifferentLabel() {
        Exercise childsPose = exercise(UUID.randomUUID(), "Child's Pose", "Hips", 1, 30);
        CreateRoutineDraftRequest request = new CreateRoutineDraftRequest(
                "Hips, Lower Back",
                List.of("Hips", "Lower Back"),
                RoutineType.RECOVERY,
                10,
                1,
                "Desk stiffness",
                null,
                null
        );

        RoutineDraftResponse response = validator.validateGeneratedDraft(
                new RoutineDraftRawResponse(
                        "Desk Reset",
                        "Shoulders",
                        List.of(new RoutineDraftRawItemResponse(childsPose.getId(), 1, 30, null))
                ),
                request,
                List.of(childsPose)
        );

        assertThat(response.targetArea()).isEqualTo("Hips, Lower Back");
    }

    @Test
    void validateGeneratedDraftRaisesSingleSetDraftTowardRequestedTimeBudget() {
        Exercise childsPose = exercise(UUID.randomUUID(), "Child's Pose", "Hips", 1, 30);
        Exercise catCow = exercise(UUID.randomUUID(), "Cat-Cow", "Spine", 1, 30);
        Exercise adductorRocking = exercise(UUID.randomUUID(), "Adductor Rocking", "Hips", 1, 30);
        Exercise couchStretch = exercise(UUID.randomUUID(), "Couch Stretch", "Hips", 1, 30);
        Exercise legSwings = exercise(UUID.randomUUID(), "Leg Swings", "Hips", 1, 30);
        CreateRoutineDraftRequest request = new CreateRoutineDraftRequest(
                "Hips, Spine",
                List.of("Hips", "Spine"),
                RoutineType.RECOVERY,
                10,
                1,
                "Desk stiffness",
                null,
                null
        );

        RoutineDraftResponse response = validator.validateGeneratedDraft(
                new RoutineDraftRawResponse(
                        "Desk Reset",
                        "Hips, Spine",
                        List.of(
                                new RoutineDraftRawItemResponse(childsPose.getId(), 1, 30, null),
                                new RoutineDraftRawItemResponse(catCow.getId(), 1, 30, null),
                                new RoutineDraftRawItemResponse(adductorRocking.getId(), 1, 30, null),
                                new RoutineDraftRawItemResponse(couchStretch.getId(), 1, 30, null),
                                new RoutineDraftRawItemResponse(legSwings.getId(), 1, 30, null)
                        )
                ),
                request,
                List.of(childsPose, catCow, adductorRocking, couchStretch, legSwings)
        );

        assertThat(response.estimatedDuration()).isGreaterThanOrEqualTo(8);
        assertThat(response.items()).extracting(RoutineDraftItemResponse::sets)
                .containsExactly(2, 2, 2, 1, 1);
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
