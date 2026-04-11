package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import ie.noelmccarthy.xrmobilitycoach.api.exercise.Exercise;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CreateRoutineDraftRequest;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftItemResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/** Normalizes structured routine draft requests and validates generated drafts. */
@Component
public class RoutineDraftValidator {

    /** Normalize request strings and regenerate context before the prompt is built. */
    public CreateRoutineDraftRequest normalizeRequest(CreateRoutineDraftRequest request,
                                                      Map<UUID, Exercise> exerciseCatalogueById) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Routine draft request is required");
        }

        List<String> targetAreas = normalizeTargetAreas(request.targetArea(), request.targetAreas());
        String targetAreaLabel = joinTargetAreas(targetAreas);
        if (request.routineType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "routineType is required");
        }
        if (request.availableMinutes() == null || request.availableMinutes() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "availableMinutes must be at least 1");
        }
        if (request.difficulty() != null && (request.difficulty() < 1 || request.difficulty() > 4)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "difficulty must be between 1 and 4 when provided");
        }
        String userNotes = normalizeRequiredRequestField(request.userNotes(), "userNotes");
        String changeRequest = normalizeOptional(request.changeRequest());
        boolean hasPreviousDraft = request.previousDraft() != null;
        boolean hasChangeRequest = changeRequest != null;
        if (hasPreviousDraft != hasChangeRequest) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    hasChangeRequest
                            ? "previousDraft is required when changeRequest is provided"
                            : "changeRequest is required when previousDraft is provided"
            );
        }

        RoutineDraftResponse previousDraft = hasPreviousDraft
                ? normalizePreviousDraft(request.previousDraft(), request, exerciseCatalogueById, targetAreaLabel)
                : null;

        return new CreateRoutineDraftRequest(
                targetAreaLabel,
                targetAreas,
                request.routineType(),
                request.availableMinutes(),
                request.difficulty(),
                userNotes,
                changeRequest,
                previousDraft
        );
    }

    /** Validate the raw LLM JSON against the catalogue and return the API response contract. */
    public RoutineDraftResponse validateGeneratedDraft(RoutineDraftRawResponse rawDraft,
                                                       CreateRoutineDraftRequest request,
                                                       List<Exercise> exerciseCatalogue) {
        if (rawDraft == null) {
            throw invalidDraft("AI coach returned an empty routine draft");
        }

        Map<UUID, Exercise> exerciseMap = new LinkedHashMap<>();
        for (Exercise exercise : exerciseCatalogue) {
            exerciseMap.put(exercise.getId(), exercise);
        }

        String title = normalizeRequiredDraftField(rawDraft.title(), "title");
        List<RoutineDraftItemResponse> items = normalizeGeneratedItems(rawDraft.items(), exerciseMap, request);
        int estimatedDuration = calculateEstimatedDuration(items);

        return new RoutineDraftResponse(
                title,
                request.targetArea(),
                request.routineType(),
                estimatedDuration,
                items
        );
    }

    /** Match the frontend duration estimate so the client does not need to recalculate it. */
    int calculateEstimatedDuration(List<RoutineDraftItemResponse> items) {
        if (items == null || items.isEmpty()) {
            return 0;
        }

        int totalSeconds = items.stream()
                .mapToInt(item -> item.sets() * (item.repsOrHoldSeconds() + 30))
                .sum();
        return Math.max(1, (int) Math.ceil(totalSeconds / 60.0));
    }

    private RoutineDraftResponse normalizePreviousDraft(RoutineDraftResponse previousDraft,
                                                        CreateRoutineDraftRequest request,
                                                        Map<UUID, Exercise> exerciseCatalogueById,
                                                        String normalizedTargetArea) {
        String title = normalizeRequiredRequestField(previousDraft.title(), "previousDraft.title");
        String previousTargetArea = normalizeRequiredRequestField(previousDraft.targetArea(), "previousDraft.targetArea");
        if (!previousTargetArea.equalsIgnoreCase(normalizedTargetArea)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "previousDraft targetArea must match selected target areas");
        }
        if (previousDraft.routineType() != request.routineType()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "previousDraft routineType must match routineType");
        }
        if (previousDraft.estimatedDuration() == null || previousDraft.estimatedDuration() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "previousDraft estimatedDuration must be at least 1");
        }

        List<RoutineDraftItemResponse> items = normalizePreviousDraftItems(previousDraft.items(), exerciseCatalogueById);
        return new RoutineDraftResponse(
                title,
                normalizedTargetArea,
                request.routineType(),
                previousDraft.estimatedDuration(),
                items
        );
    }

    private List<RoutineDraftItemResponse> normalizePreviousDraftItems(List<RoutineDraftItemResponse> items,
                                                                       Map<UUID, Exercise> exerciseCatalogueById) {
        if (items == null || items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "previousDraft requires at least one item");
        }

        List<RoutineDraftItemResponse> normalizedItems = new ArrayList<>(items.size());
        Set<UUID> seenExerciseIds = new HashSet<>();
        int sequenceIndex = 1;

        for (RoutineDraftItemResponse item : items) {
            if (item == null || item.exerciseId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "previousDraft contains an item without exerciseId");
            }

            Exercise exercise = exerciseCatalogueById.get(item.exerciseId());
            if (exercise == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "previousDraft contains unknown exerciseId");
            }
            if (!seenExerciseIds.add(item.exerciseId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "previousDraft contains duplicate exercises");
            }

            normalizedItems.add(new RoutineDraftItemResponse(
                    exercise.getId(),
                    exercise.getName(),
                    requiredCatalogueField(exercise.getMuscleGroup(), "muscleGroup"),
                    sequenceIndex++,
                    requirePositiveRequestValue(item.sets(), "previousDraft sets"),
                    requirePositiveRequestValue(item.repsOrHoldSeconds(), "previousDraft repsOrHoldSeconds"),
                    normalizeOptional(item.notes())
            ));
        }

        return normalizedItems;
    }

    private List<RoutineDraftItemResponse> normalizeGeneratedItems(List<RoutineDraftRawItemResponse> rawItems,
                                                                   Map<UUID, Exercise> exerciseMap,
                                                                   CreateRoutineDraftRequest request) {
        if (rawItems == null || rawItems.isEmpty()) {
            throw invalidDraft("AI coach returned an empty routine draft");
        }

        List<RoutineDraftItemResponse> items = new ArrayList<>(rawItems.size());
        Set<UUID> seenExerciseIds = new HashSet<>();
        int sequenceIndex = 1;

        for (RoutineDraftRawItemResponse rawItem : rawItems) {
            if (rawItem == null || rawItem.exerciseId() == null) {
                throw invalidDraft("AI coach returned a routine item without exerciseId");
            }
            Exercise exercise = exerciseMap.get(rawItem.exerciseId());
            if (exercise == null) {
                throw invalidDraft("AI coach returned an unknown exerciseId");
            }
            if (!seenExerciseIds.add(rawItem.exerciseId())) {
                throw invalidDraft("Duplicate exercises are not allowed in routine drafts");
            }

            items.add(new RoutineDraftItemResponse(
                    exercise.getId(),
                    exercise.getName(),
                    requiredCatalogueField(exercise.getMuscleGroup(), "muscleGroup"),
                    sequenceIndex++,
                    requirePositiveDraftValue(rawItem.sets(), "sets"),
                    requirePositiveDraftValue(rawItem.repsOrHoldSeconds(), "repsOrHoldSeconds"),
                    normalizeOptional(rawItem.notes())
            ));
        }

        // If the model flattened the whole routine to one set per item, gently push it back toward the time budget.
        return rebalancePrescription(items, request.availableMinutes());
    }

    private List<RoutineDraftItemResponse> rebalancePrescription(List<RoutineDraftItemResponse> items,
                                                                 Integer availableMinutes) {
        if (items == null || items.isEmpty() || availableMinutes == null) {
            return items;
        }
        if (items.stream().anyMatch(item -> item.sets() > 1)) {
            return items;
        }

        int minimumDesiredDuration = minimumDesiredDuration(availableMinutes);
        int currentDuration = calculateEstimatedDuration(items);
        if (currentDuration >= minimumDesiredDuration) {
            return items;
        }

        int maxSets = maxRecommendedSets(availableMinutes, items.size());
        List<RoutineDraftItemResponse> adjusted = new ArrayList<>(items);

        // Increase sets round-robin so the routine stays balanced instead of overloading the first exercise only.
        while (currentDuration < minimumDesiredDuration) {
            boolean increasedAny = false;
            for (int i = 0; i < adjusted.size() && currentDuration < minimumDesiredDuration; i++) {
                RoutineDraftItemResponse item = adjusted.get(i);
                if (item.sets() >= maxSets) {
                    continue;
                }

                adjusted.set(i, new RoutineDraftItemResponse(
                        item.exerciseId(),
                        item.exerciseName(),
                        item.muscleGroup(),
                        item.sequenceIndex(),
                        item.sets() + 1,
                        item.repsOrHoldSeconds(),
                        item.notes()
                ));
                currentDuration = calculateEstimatedDuration(adjusted);
                increasedAny = true;
            }

            if (!increasedAny) {
                break;
            }
        }

        return List.copyOf(adjusted);
    }

    private static int minimumDesiredDuration(int availableMinutes) {
        if (availableMinutes <= 3) {
            return availableMinutes;
        }
        return Math.max(1, (int) Math.ceil(availableMinutes * 0.75));
    }

    private static int maxRecommendedSets(int availableMinutes, int itemCount) {
        if (availableMinutes <= 5) {
            return 2;
        }
        if (availableMinutes >= 10 || itemCount <= 3) {
            return 3;
        }
        return 2;
    }

    private List<String> normalizeTargetAreas(String legacyTargetArea, List<String> requestedTargetAreas) {
        List<String> normalizedTargetAreas = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();

        // Keep legacy single-target support while preferring the structured multi-target array.
        if (requestedTargetAreas != null) {
            for (String targetArea : requestedTargetAreas) {
                addNormalizedTargetArea(normalizedTargetAreas, seen, targetArea);
            }
        }
        addNormalizedTargetArea(normalizedTargetAreas, seen, legacyTargetArea);

        if (normalizedTargetAreas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "targetArea or targetAreas is required");
        }
        return List.copyOf(normalizedTargetAreas);
    }

    private void addNormalizedTargetArea(List<String> normalizedTargetAreas,
                                         Set<String> seen,
                                         String targetArea) {
        String normalized = normalizeOptional(targetArea);
        if (normalized == null) {
            return;
        }

        String formatted = formatTargetArea(normalized);
        String comparisonKey = formatted.toLowerCase(Locale.ROOT);
        if (seen.add(comparisonKey)) {
            normalizedTargetAreas.add(formatted);
        }
    }

    private String joinTargetAreas(List<String> targetAreas) {
        return String.join(", ", targetAreas);
    }

    private String formatTargetArea(String value) {
        StringBuilder builder = new StringBuilder(value.length());
        boolean capitalizeNext = true;
        for (int i = 0; i < value.length(); i++) {
            char current = value.charAt(i);
            if (Character.isWhitespace(current) || current == '/' || current == ',' || current == '&') {
                capitalizeNext = true;
                builder.append(current);
                continue;
            }
            if (capitalizeNext && Character.isLetter(current)) {
                builder.append(Character.toUpperCase(current));
                capitalizeNext = false;
            } else {
                builder.append(current);
                capitalizeNext = false;
            }
        }
        return builder.toString();
    }

    private static int requirePositiveDraftValue(Integer value, String fieldName) {
        if (value == null || value < 1) {
            throw invalidDraft("AI coach returned invalid " + fieldName);
        }
        return value;
    }

    private static int requirePositiveRequestValue(Integer value, String fieldName) {
        if (value == null || value < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be at least 1");
        }
        return value;
    }

    private static String requiredCatalogueField(String value, String fieldName) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw invalidDraft("Exercise catalogue is missing " + fieldName);
        }
        return normalized;
    }

    private static String normalizeRequiredRequestField(String value, String fieldName) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required");
        }
        return normalized;
    }

    private static String normalizeRequiredDraftField(String value, String fieldName) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw invalidDraft("AI coach returned an invalid " + fieldName);
        }
        return normalized;
    }

    private static String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.replace("\r\n", "\n").trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private static ResponseStatusException invalidDraft(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, reason);
    }
}
