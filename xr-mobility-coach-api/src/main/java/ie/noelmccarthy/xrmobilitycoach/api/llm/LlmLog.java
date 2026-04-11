package ie.noelmccarthy.xrmobilitycoach.api.llm;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/** Audit log for LLM requests and responses. */
@Entity
@Table(name = "llm_logs")
public class LlmLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "request_json", nullable = false, columnDefinition = "jsonb")
    private JsonNode requestJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_json", columnDefinition = "jsonb")
    private JsonNode responseJson;

    @Column(name = "is_valid", nullable = false)
    private boolean valid;

    protected LlmLog() {}

    public LlmLog(UUID userId, JsonNode requestJson, JsonNode responseJson, boolean valid) {
        this.userId = userId;
        this.requestJson = requestJson;
        this.responseJson = responseJson;
        this.valid = valid;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public Instant getCreatedAt() { return createdAt; }
    public JsonNode getRequestJson() { return requestJson; }
    public JsonNode getResponseJson() { return responseJson; }
    public boolean isValid() { return valid; }
}
