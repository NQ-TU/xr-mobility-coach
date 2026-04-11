package ie.noelmccarthy.xrmobilitycoach.api.llm;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repository for LLM audit logs. */
public interface LlmLogRepository extends JpaRepository<LlmLog, UUID> {
}
