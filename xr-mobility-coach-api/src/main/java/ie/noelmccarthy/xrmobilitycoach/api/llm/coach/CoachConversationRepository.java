package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Repository for persisted coach conversations. */
public interface CoachConversationRepository extends JpaRepository<CoachConversation, UUID> {
    List<CoachConversation> findByUserIdOrderByUpdatedAtDesc(UUID userId);
    Optional<CoachConversation> findByIdAndUserId(UUID id, UUID userId);
}
