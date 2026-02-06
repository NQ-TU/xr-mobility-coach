package ie.noelmccarthy.xrmobilitycoach.api.routine;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/** Repository for routine exercises. */
public interface RoutineExerciseRepository extends JpaRepository<RoutineExercise, UUID> {

    interface RoutineExerciseCount {
        UUID getRoutineId();
        long getExerciseCount();
    }

    @Query("""
            select re from RoutineExercise re
            join fetch re.exercise
            where re.routineId = :routineId
            order by re.sequenceIndex asc
            """)
    List<RoutineExercise> findDetailedByRoutineId(@Param("routineId") UUID routineId);

    @Query("""
            select re.routineId as routineId, count(re.id) as exerciseCount
            from RoutineExercise re
            where re.routineId in :routineIds
            group by re.routineId
            """)
    List<RoutineExerciseCount> countByRoutineIds(@Param("routineIds") List<UUID> routineIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from RoutineExercise re where re.routineId = :routineId")
    void deleteByRoutineId(@Param("routineId") UUID routineId);
}
