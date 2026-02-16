package ie.noelmccarthy.xrmobilitycoach.api.sessions;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/** Repository for session exercise metrics. */
public interface SessionExerciseMetricRepository extends JpaRepository<SessionExerciseMetric, UUID> {

    interface SessionExerciseCount {
        UUID getSessionId();
        long getExerciseCount();
    }

    @Query("""
            select m from SessionExerciseMetric m
            join fetch m.exercise
            where m.sessionId = :sessionId
            order by m.exercise.name asc, m.setIndex asc
            """)
    List<SessionExerciseMetric> findDetailedBySessionId(@Param("sessionId") UUID sessionId);

    @Query("""
            select m.sessionId as sessionId, count(distinct m.exercise.id) as exerciseCount
            from SessionExerciseMetric m
            where m.sessionId in :sessionIds
            group by m.sessionId
            """)
    List<SessionExerciseCount> countDistinctExercisesBySessionIds(@Param("sessionIds") List<UUID> sessionIds);
}
