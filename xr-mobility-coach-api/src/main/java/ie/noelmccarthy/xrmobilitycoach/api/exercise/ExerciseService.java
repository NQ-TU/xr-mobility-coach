package ie.noelmccarthy.xrmobilitycoach.api.exercise;

import ie.noelmccarthy.xrmobilitycoach.api.exercise.dto.ExerciseResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.criteria.Predicate;
import java.util.UUID;

import static org.springframework.http.HttpStatus.NOT_FOUND;

/** Service for exercise catalogue retrieval. */
@Service
public class ExerciseService {

    private static final Logger log = LoggerFactory.getLogger(ExerciseService.class);

    private final ExerciseRepository exercises;

    public ExerciseService(ExerciseRepository exercises) {
        this.exercises = exercises;
    }

    @Transactional(readOnly = true)
    public Page<ExerciseResponse> list(String nameQuery, String muscleGroup, Integer difficulty, Pageable pageable) {
        String normalizedQuery = normalize(nameQuery);
        String normalizedMuscleGroup = normalize(muscleGroup);

        if (normalizedQuery != null || normalizedMuscleGroup != null || difficulty != null) {
            log.info("Exercise search: q='{}', muscleGroup='{}', difficulty={}, page={}, size={}",
                    normalizedQuery,
                    normalizedMuscleGroup,
                    difficulty,
                    pageable.getPageNumber(),
                    pageable.getPageSize());
        }

        Specification<Exercise> spec = (root, query, cb) -> {
            Predicate predicate = cb.conjunction();
            if (normalizedQuery != null) {
                predicate = cb.and(predicate, cb.like(cb.lower(root.get("name")),
                        "%" + normalizedQuery.toLowerCase() + "%"));
            }
            if (normalizedMuscleGroup != null) {
                predicate = cb.and(predicate, cb.equal(cb.lower(root.get("muscleGroup")),
                        normalizedMuscleGroup.toLowerCase()));
            }
            if (difficulty != null) {
                predicate = cb.and(predicate, cb.equal(root.get("difficulty"), difficulty));
            }
            return predicate;
        };

        return exercises.findAll(spec, pageable)
                .map(ExerciseService::toResponse);
    }

    @Transactional(readOnly = true)
    public ExerciseResponse getById(UUID id) {
        Exercise exercise = exercises.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Exercise not found"));
        return toResponse(exercise);
    }

    private static ExerciseResponse toResponse(Exercise exercise) {
        return new ExerciseResponse(
                exercise.getId(),
                exercise.getName(),
                exercise.getDescription(),
                exercise.getMuscleGroup(),
                exercise.getDifficulty(),
                exercise.getDefaultHoldTimeOrReps(),
                exercise.getAnimationAssetId()
        );
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
