package ie.noelmccarthy.xrmobilitycoach.api.sessions;

import ie.noelmccarthy.xrmobilitycoach.api.exercise.Exercise;
import ie.noelmccarthy.xrmobilitycoach.api.exercise.ExerciseRepository;
import ie.noelmccarthy.xrmobilitycoach.api.routine.Routine;
import ie.noelmccarthy.xrmobilitycoach.api.routine.RoutineRepository;
import ie.noelmccarthy.xrmobilitycoach.api.sessions.dto.CreateSessionRequest;
import ie.noelmccarthy.xrmobilitycoach.api.sessions.dto.SessionMetricRequest;
import ie.noelmccarthy.xrmobilitycoach.api.sessions.dto.SessionResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/** Service for recording completed sessions. */
@Service
public class SessionService {

    private static final Logger log = LoggerFactory.getLogger(SessionService.class);

    private final SessionRepository sessions;
    private final SessionExerciseMetricRepository metrics;
    private final ExerciseRepository exercises;
    private final RoutineRepository routines;

    public SessionService(SessionRepository sessions,
                          SessionExerciseMetricRepository metrics,
                          ExerciseRepository exercises,
                          RoutineRepository routines) {
        this.sessions = sessions;
        this.metrics = metrics;
        this.exercises = exercises;
        this.routines = routines;
    }

    @Transactional
    public SessionResponse create(UUID userId, CreateSessionRequest req) {
        Instant startedAt = req.startedAt();
        Instant endedAt = req.endedAt();
        if (startedAt != null && endedAt != null && endedAt.isBefore(startedAt)) {
            throw new ResponseStatusException(BAD_REQUEST, "endedAt cannot be before startedAt");
        }

        Routine routine = routines.findByIdAndUserId(req.routineId(), userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Routine not found"));

        Session session = new Session(
                userId,
                routine.getId(),
                startedAt,
                endedAt,
                req.overallRpe()
        );
        Session saved = sessions.save(session);

        List<SessionExerciseMetric> items = buildMetrics(saved.getId(), req.metrics());
        metrics.saveAll(items);

        log.info("Created session: userId={}, sessionId={}, routineId={}, metricCount={}",
                userId, saved.getId(), routine.getId(), items.size());

        return new SessionResponse(
                saved.getId(),
                saved.getRoutineId(),
                saved.getStartedAt(),
                saved.getEndedAt(),
                saved.getOverallRpe()
        );
    }

    private List<SessionExerciseMetric> buildMetrics(UUID sessionId, List<SessionMetricRequest> metricRequests) {
        if (metricRequests == null || metricRequests.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Session requires at least one exercise metric");
        }

        Set<UUID> exerciseIds = metricRequests.stream()
                .map(SessionMetricRequest::exerciseId)
                .collect(Collectors.toSet());

        Map<UUID, Exercise> exerciseMap = exercises.findAllById(exerciseIds).stream()
                .collect(Collectors.toMap(Exercise::getId, exercise -> exercise));

        if (exerciseMap.size() != exerciseIds.size()) {
            Set<UUID> missing = new HashSet<>(exerciseIds);
            missing.removeAll(exerciseMap.keySet());
            throw new ResponseStatusException(BAD_REQUEST, "Unknown exercise IDs: " + missing);
        }

        Set<String> seenKeys = new HashSet<>();
        List<SessionExerciseMetric> results = new ArrayList<>(metricRequests.size());
        for (SessionMetricRequest metric : metricRequests) {
            String key = metric.exerciseId() + ":" + metric.setIndex();
            if (!seenKeys.add(key)) {
                throw new ResponseStatusException(BAD_REQUEST, "Duplicate metric for exerciseId/setIndex: " + key);
            }

            boolean skipped = metric.skipped() != null && metric.skipped();
            boolean completed = metric.completed() != null ? metric.completed() : !skipped;
            if (skipped && completed) {
                throw new ResponseStatusException(BAD_REQUEST, "Metric cannot be both skipped and completed");
            }

            Integer repsCompleted = metric.repsCompleted();
            BigDecimal timeUnderTension = metric.timeUnderTension();
            Integer exerciseRpe = metric.exerciseRpe();

            results.add(new SessionExerciseMetric(
                    sessionId,
                    exerciseMap.get(metric.exerciseId()),
                    metric.setIndex(),
                    completed,
                    skipped,
                    repsCompleted,
                    timeUnderTension,
                    exerciseRpe,
                    normalizeOptional(metric.notes())
            ));
        }
        return results;
    }

    private static String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
