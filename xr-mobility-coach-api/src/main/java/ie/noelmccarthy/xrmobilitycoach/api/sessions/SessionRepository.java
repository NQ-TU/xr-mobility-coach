package ie.noelmccarthy.xrmobilitycoach.api.sessions;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Repository for sessions. */
public interface SessionRepository extends JpaRepository<Session, UUID> {
    Optional<Session> findByIdAndUserId(UUID id, UUID userId);
    List<Session> findByUserIdOrderByEndedAtDesc(UUID userId, Pageable pageable);

    @Query("""
            select s from Session s
            where s.userId = :userId
              and s.endedAt >= :from
              and s.endedAt < :toExclusive
            order by s.endedAt desc
            """)
    List<Session> findByUserIdAndEndedAtRange(@Param("userId") UUID userId,
                                              @Param("from") Instant from,
                                              @Param("toExclusive") Instant toExclusive);
}
