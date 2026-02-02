package ie.noelmccarthy.xrmobilitycoach.api.profile;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** User profile preferences stored per user. */
@Entity
@Table(name = "user_profiles")
public class UserProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true, columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "preferred_session_length")
    private Integer preferredSessionLength;

    @Column(name = "training_experience", length = 100)
    private String trainingExperience;

    @Column(name = "target_areas", length = 255)
    private String targetAreas;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserProfile() {}

    public UserProfile(UUID userId) {
        this.userId = userId;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public Integer getPreferredSessionLength() { return preferredSessionLength; }
    public String getTrainingExperience() { return trainingExperience; }
    public String getTargetAreas() { return targetAreas; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setPreferredSessionLength(Integer preferredSessionLength) {
        this.preferredSessionLength = preferredSessionLength;
    }

    public void setTrainingExperience(String trainingExperience) {
        this.trainingExperience = trainingExperience;
    }

    public void setTargetAreas(String targetAreas) {
        this.targetAreas = targetAreas;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
