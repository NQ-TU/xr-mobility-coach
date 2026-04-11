package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Repository for coach conversation messages. */
public interface CoachMessageRepository extends JpaRepository<CoachMessage, UUID> {
    CoachMessage findFirstByConversationIdOrderByCreatedAtDesc(UUID conversationId);
    List<CoachMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);
    List<CoachMessage> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);
}
