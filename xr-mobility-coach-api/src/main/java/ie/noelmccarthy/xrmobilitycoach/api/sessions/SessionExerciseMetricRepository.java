package ie.noelmccarthy.xrmobilitycoach.api.sessions;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repository for session exercise metrics. */
public interface SessionExerciseMetricRepository extends JpaRepository<SessionExerciseMetric, UUID> {
}
