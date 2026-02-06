package ie.noelmccarthy.xrmobilitycoach.api.routine;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Repository for routines. */
public interface RoutineRepository extends JpaRepository<Routine, UUID> {
    Page<Routine> findByUserId(UUID userId, Pageable pageable);
    Optional<Routine> findByIdAndUserId(UUID id, UUID userId);
}
