package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/** Single persisted chat message in a coach conversation. */
@Entity
@Table(name = "coach_messages")
public class CoachMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "conversation_id", nullable = false, columnDefinition = "uuid")
    private UUID conversationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private CoachMessageRole role;

    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected CoachMessage() {}

    public CoachMessage(UUID conversationId, CoachMessageRole role, String content) {
        this.conversationId = conversationId;
        this.role = role;
        this.content = content;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public UUID getConversationId() { return conversationId; }
    public CoachMessageRole getRole() { return role; }
    public String getContent() { return content; }
    public Instant getCreatedAt() { return createdAt; }
}
