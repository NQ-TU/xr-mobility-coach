package ie.noelmccarthy.xrmobilitycoach.api.routine;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/** Routine metadata owned by a user. */
@Entity
@Table(name = "routines")
public class Routine {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "target_area", length = 100)
    private String targetArea;

    @Column(name = "estimated_duration")
    private Integer estimatedDuration;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Routine() {}

    public Routine(UUID userId, String title, String targetArea, Integer estimatedDuration) {
        this.userId = userId;
        this.title = title;
        this.targetArea = targetArea;
        this.estimatedDuration = estimatedDuration;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getTitle() { return title; }
    public String getTargetArea() { return targetArea; }
    public Integer getEstimatedDuration() { return estimatedDuration; }
    public Instant getCreatedAt() { return createdAt; }

    public void setTitle(String title) { this.title = title; }
    public void setTargetArea(String targetArea) { this.targetArea = targetArea; }
    public void setEstimatedDuration(Integer estimatedDuration) { this.estimatedDuration = estimatedDuration; }
}
