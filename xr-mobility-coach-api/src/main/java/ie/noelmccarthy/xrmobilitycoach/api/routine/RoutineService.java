package ie.noelmccarthy.xrmobilitycoach.api.routine;

import ie.noelmccarthy.xrmobilitycoach.api.exercise.Exercise;
import ie.noelmccarthy.xrmobilitycoach.api.exercise.ExerciseRepository;
import ie.noelmccarthy.xrmobilitycoach.api.routine.dto.RoutineDetailResponse;
import ie.noelmccarthy.xrmobilitycoach.api.routine.dto.RoutineExerciseRequest;
import ie.noelmccarthy.xrmobilitycoach.api.routine.dto.RoutineExerciseResponse;
import ie.noelmccarthy.xrmobilitycoach.api.routine.dto.RoutineSummaryResponse;
import ie.noelmccarthy.xrmobilitycoach.api.routine.dto.UpsertRoutineRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/** Service for routine CRUD operations. */
@Service
public class RoutineService {

    private static final Logger log = LoggerFactory.getLogger(RoutineService.class);

    private final RoutineRepository routines;
    private final RoutineExerciseRepository routineExercises;
    private final ExerciseRepository exercises;

    public RoutineService(RoutineRepository routines,
                          RoutineExerciseRepository routineExercises,
                          ExerciseRepository exercises) {
        this.routines = routines;
        this.routineExercises = routineExercises;
        this.exercises = exercises;
    }

    @Transactional(readOnly = true)
    public Page<RoutineSummaryResponse> list(UUID userId, Pageable pageable) {
        Page<Routine> page = routines.findByUserId(userId, pageable);
        List<UUID> routineIds = page.stream().map(Routine::getId).toList();
        Map<UUID, Long> counts = routineIds.isEmpty()
                ? Map.of()
                : routineExercises.countByRoutineIds(routineIds).stream()
                    .collect(Collectors.toMap(RoutineExerciseRepository.RoutineExerciseCount::getRoutineId,
                            RoutineExerciseRepository.RoutineExerciseCount::getExerciseCount));

        return page.map(routine -> toSummary(routine, counts.getOrDefault(routine.getId(), 0L)));
    }

    @Transactional(readOnly = true)
    public RoutineDetailResponse get(UUID userId, UUID routineId) {
        Routine routine = requireRoutine(userId, routineId);
        List<RoutineExercise> items = routineExercises.findDetailedByRoutineId(routine.getId());
        return toDetail(routine, items);
    }

    @Transactional
    public RoutineDetailResponse create(UUID userId, UpsertRoutineRequest req) {
        Routine routine = new Routine(
                userId,
                normalizeRequired(req.title()),
                normalizeOptional(req.targetArea()),
                req.estimatedDuration()
        );
        Routine saved = routines.save(routine);

        List<RoutineExercise> items = buildRoutineExercises(saved.getId(), req.items());
        routineExercises.saveAll(items);

        log.info("Created routine: userId={}, routineId={}, itemCount={}",
                userId, saved.getId(), items.size());
        return toDetail(saved, items);
    }

    @Transactional
    public RoutineDetailResponse update(UUID userId, UUID routineId, UpsertRoutineRequest req) {
        Routine routine = requireRoutine(userId, routineId);
        routine.setTitle(normalizeRequired(req.title()));
        routine.setTargetArea(normalizeOptional(req.targetArea()));
        routine.setEstimatedDuration(req.estimatedDuration());

        routineExercises.deleteByRoutineId(routine.getId());
        routineExercises.flush();
        List<RoutineExercise> items = buildRoutineExercises(routine.getId(), req.items());
        routineExercises.saveAll(items);

        log.info("Updated routine: userId={}, routineId={}, itemCount={}",
                userId, routine.getId(), items.size());
        return toDetail(routine, items);
    }

    @Transactional
    public void delete(UUID userId, UUID routineId) {
        Routine routine = requireRoutine(userId, routineId);
        routineExercises.deleteByRoutineId(routine.getId());
        routines.delete(routine);
        log.info("Deleted routine: userId={}, routineId={}", userId, routine.getId());
    }

    private Routine requireRoutine(UUID userId, UUID routineId) {
        return routines.findByIdAndUserId(routineId, userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Routine not found"));
    }

    private List<RoutineExercise> buildRoutineExercises(UUID routineId, List<RoutineExerciseRequest> items) {
        if (items == null || items.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Routine requires at least one exercise");
        }

        Set<UUID> exerciseIds = items.stream()
                .map(RoutineExerciseRequest::exerciseId)
                .collect(Collectors.toSet());

        Map<UUID, Exercise> exerciseMap = exercises.findAllById(exerciseIds).stream()
                .collect(Collectors.toMap(Exercise::getId, exercise -> exercise));

        if (exerciseMap.size() != exerciseIds.size()) {
            Set<UUID> missing = new HashSet<>(exerciseIds);
            missing.removeAll(exerciseMap.keySet());
            throw new ResponseStatusException(BAD_REQUEST, "Unknown exercise IDs: " + missing);
        }

        List<RoutineExercise> routineItems = new ArrayList<>(items.size());
        int sequenceIndex = 1;
        for (RoutineExerciseRequest item : items) {
            Exercise exercise = exerciseMap.get(item.exerciseId());
            routineItems.add(new RoutineExercise(
                    routineId,
                    exercise,
                    sequenceIndex++,
                    item.sets(),
                    item.repsOrHoldSeconds(),
                    normalizeOptional(item.tempo()),
                    normalizeOptional(item.coachingNotes())
            ));
        }
        return routineItems;
    }

    private static RoutineSummaryResponse toSummary(Routine routine, long exerciseCount) {
        return new RoutineSummaryResponse(
                routine.getId(),
                routine.getTitle(),
                routine.getTargetArea(),
                routine.getEstimatedDuration(),
                routine.getCreatedAt(),
                exerciseCount
        );
    }

    private static RoutineDetailResponse toDetail(Routine routine, List<RoutineExercise> items) {
        List<RoutineExerciseResponse> responses = items.stream()
                .map(RoutineService::toExerciseResponse)
                .toList();
        return new RoutineDetailResponse(
                routine.getId(),
                routine.getTitle(),
                routine.getTargetArea(),
                routine.getEstimatedDuration(),
                routine.getCreatedAt(),
                responses
        );
    }

    private static RoutineExerciseResponse toExerciseResponse(RoutineExercise item) {
        Exercise exercise = item.getExercise();
        return new RoutineExerciseResponse(
                exercise.getId(),
                exercise.getName(),
                exercise.getMuscleGroup(),
                item.getSequenceIndex(),
                item.getSets(),
                item.getRepsOrHoldSeconds(),
                item.getTempo(),
                item.getCoachingNotes()
        );
    }

    private static String normalizeRequired(String value) {
        return value == null ? null : value.trim();
    }

    private static String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
