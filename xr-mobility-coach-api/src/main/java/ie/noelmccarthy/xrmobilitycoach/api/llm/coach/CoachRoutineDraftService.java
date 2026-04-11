package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import ie.noelmccarthy.xrmobilitycoach.api.exercise.Exercise;
import ie.noelmccarthy.xrmobilitycoach.api.exercise.ExerciseRepository;
import ie.noelmccarthy.xrmobilitycoach.api.llm.LlmLog;
import ie.noelmccarthy.xrmobilitycoach.api.llm.LlmLogRepository;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CreateRoutineDraftRequest;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

/** Generates unsaved structured routine drafts from builder input. */
@Service
public class CoachRoutineDraftService {

    private static final Logger log = LoggerFactory.getLogger(CoachRoutineDraftService.class);
    private static final int MIN_ALLOWED_EXERCISES = 4;

    private final ExerciseRepository exercises;
    private final RoutineDraftPromptBuilder promptBuilder;
    private final OpenAiClient openAiClient;
    private final RoutineDraftValidator validator;
    private final LlmLogRepository llmLogs;

    public CoachRoutineDraftService(ExerciseRepository exercises,
                                    RoutineDraftPromptBuilder promptBuilder,
                                    OpenAiClient openAiClient,
                                    RoutineDraftValidator validator,
                                    LlmLogRepository llmLogs) {
        this.exercises = exercises;
        this.promptBuilder = promptBuilder;
        this.openAiClient = openAiClient;
        this.validator = validator;
        this.llmLogs = llmLogs;
    }

    /** Normalize the request, constrain the catalogue, call the model, then validate and audit the draft. */
    public RoutineDraftResponse generateDraft(UUID userId, CreateRoutineDraftRequest request) {
        List<Exercise> allExercises = exercises.findAll(Sort.by(Sort.Direction.ASC, "name"));
        if (allExercises.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Routine draft generation is unavailable");
        }


        Map<UUID, Exercise> exerciseCatalogueById = allExercises.stream()
                .collect(Collectors.toMap(Exercise::getId, exercise -> exercise, (left, right) -> left, LinkedHashMap::new));
        CreateRoutineDraftRequest normalizedRequest = validator.normalizeRequest(request, exerciseCatalogueById);
        FilteredExerciseCatalogue filteredCatalogue = filterExercises(
                allExercises,
                normalizedRequest.targetAreas(),
                normalizedRequest.difficulty()
        );

        RoutineDraftPromptBuilder.RoutineDraftPrompt prompt = promptBuilder.build(
                normalizedRequest,
                filteredCatalogue.exercises(),
                filteredCatalogue.filterStrategy()
        );

        OpenAiClient.OpenAiRoutineDraftResult llmResult = openAiClient.generateRoutineDraft(prompt);
        try {
            RoutineDraftResponse draft = validator.validateGeneratedDraft(
                    llmResult.draft(),
                    normalizedRequest,
                    allExercises
            );
            llmLogs.save(new LlmLog(userId, llmResult.requestJson(), llmResult.responseJson(), true));

            log.info("Routine draft generated: userId={}, targetAreas={}, routineType={}, itemCount={}",
                    userId, String.join(" | ", normalizedRequest.targetAreas()), draft.routineType(), draft.items().size());
            return draft;
        } catch (RuntimeException ex) {
            llmLogs.save(new LlmLog(userId, llmResult.requestJson(), llmResult.responseJson(), false));
            throw ex;
        }
    }

    private FilteredExerciseCatalogue filterExercises(List<Exercise> allExercises,
                                                      List<String> targetAreas,
                                                      Integer difficulty) {
        // "Any difficulty" keeps the target-area constraint but skips difficulty narrowing entirely.
        if (difficulty == null) {
            List<Exercise> byTargetAreaAnyDifficulty = allExercises.stream()
                    .filter(exercise -> matchesAnyTargetArea(exercise, targetAreas))
                    .toList();
            if (!byTargetAreaAnyDifficulty.isEmpty()) {
                return new FilteredExerciseCatalogue(byTargetAreaAnyDifficulty, "target area only (any difficulty)");
            }
            return new FilteredExerciseCatalogue(allExercises, "full catalogue fallback (any difficulty)");
        }

        List<Exercise> byTargetAndDifficulty = allExercises.stream()
                .filter(exercise -> matchesAnyTargetArea(exercise, targetAreas))
                .filter(exercise -> matchesDifficulty(exercise, difficulty))
                .toList();
        if (byTargetAndDifficulty.size() >= MIN_ALLOWED_EXERCISES) {
            return new FilteredExerciseCatalogue(byTargetAndDifficulty, "exact target area and exact difficulty");
        }

        // If the exact subset is too small, widen only slightly before falling back further.
        List<Exercise> byTargetAndNearbyDifficulty = allExercises.stream()
                .filter(exercise -> matchesAnyTargetArea(exercise, targetAreas))
                .filter(exercise -> matchesNearbyDifficulty(exercise, difficulty))
                .toList();
        if (byTargetAndNearbyDifficulty.size() >= MIN_ALLOWED_EXERCISES) {
            return new FilteredExerciseCatalogue(byTargetAndNearbyDifficulty, "target area with loosened difficulty");
        }

        List<Exercise> byTargetArea = allExercises.stream()
                .filter(exercise -> matchesAnyTargetArea(exercise, targetAreas))
                .toList();
        if (!byTargetArea.isEmpty()) {
            return new FilteredExerciseCatalogue(byTargetArea, "target area only");
        }

        if (!byTargetAndNearbyDifficulty.isEmpty()) {
            return new FilteredExerciseCatalogue(byTargetAndNearbyDifficulty, "target area with loosened difficulty");
        }

        List<Exercise> byDifficulty = allExercises.stream()
                .filter(exercise -> matchesNearbyDifficulty(exercise, difficulty))
                .toList();
        if (!byDifficulty.isEmpty()) {
            return new FilteredExerciseCatalogue(byDifficulty, "difficulty only fallback");
        }

        return new FilteredExerciseCatalogue(allExercises, "full catalogue fallback");
    }

    private static boolean matchesDifficulty(Exercise exercise, Integer difficulty) {
        return Objects.equals(exercise.getDifficulty(), difficulty);
    }

    private static boolean matchesNearbyDifficulty(Exercise exercise, Integer difficulty) {
        Integer exerciseDifficulty = exercise.getDifficulty();
        return exerciseDifficulty != null && difficulty != null && Math.abs(exerciseDifficulty - difficulty) <= 1;
    }

    private static boolean matchesAnyTargetArea(Exercise exercise, List<String> requestedTargetAreas) {
        if (requestedTargetAreas == null || requestedTargetAreas.isEmpty()) {
            return false;
        }
        return requestedTargetAreas.stream().anyMatch(targetArea -> matchesTargetArea(exercise, targetArea));
    }

    private static boolean matchesTargetArea(Exercise exercise, String requestedTargetArea) {
        String muscleGroup = normalize(exercise.getMuscleGroup());
        String normalizedTargetArea = normalize(requestedTargetArea);
        if (muscleGroup == null || normalizedTargetArea == null) {
            return false;
        }
        if (muscleGroup.equals(normalizedTargetArea)
                || muscleGroup.contains(normalizedTargetArea)
                || normalizedTargetArea.contains(muscleGroup)) {
            return true;
        }

        // Token overlap covers cases like "Lower Backs" vs "Lower Back" without hard-coding synonyms.
        Set<String> targetTokens = tokenize(normalizedTargetArea);
        Set<String> muscleGroupTokens = tokenize(muscleGroup);
        targetTokens.retainAll(muscleGroupTokens);
        return !targetTokens.isEmpty();
    }

    private static Set<String> tokenize(String value) {
        return Arrays.stream(value.split("[^a-z0-9]+"))
                .map(String::trim)
                .filter(token -> !token.isEmpty())
                .map(CoachRoutineDraftService::singularize)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static String singularize(String token) {
        if (token.endsWith("ies") && token.length() > 3) {
            return token.substring(0, token.length() - 3) + "y";
        }
        if (token.endsWith("s") && token.length() > 3) {
            return token.substring(0, token.length() - 1);
        }
        return token;
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private record FilteredExerciseCatalogue(List<Exercise> exercises, String filterStrategy) {}
}
