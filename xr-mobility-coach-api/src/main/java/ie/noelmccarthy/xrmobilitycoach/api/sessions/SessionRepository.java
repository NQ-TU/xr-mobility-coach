package ie.noelmccarthy.xrmobilitycoach.api.sessions;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repository for sessions. */
public interface SessionRepository extends JpaRepository<Session, UUID> {
}
