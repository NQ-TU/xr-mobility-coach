package ie.noelmccarthy.xrmobilitycoach.api.exercise;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/** Exercise catalogue entry. */
@Entity
@Table(name = "exercises")
public class Exercise {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "muscle_group", length = 100)
    private String muscleGroup;

    @Column
    private Integer difficulty;

    @Column(name = "default_hold_time_or_reps")
    private Integer defaultHoldTimeOrReps;

    @Column(name = "animation_asset_id", length = 255)
    private String animationAssetId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Exercise() {}

    public Exercise(String name,
                    String description,
                    String muscleGroup,
                    Integer difficulty,
                    Integer defaultHoldTimeOrReps,
                    String animationAssetId) {
        this.name = name;
        this.description = description;
        this.muscleGroup = muscleGroup;
        this.difficulty = difficulty;
        this.defaultHoldTimeOrReps = defaultHoldTimeOrReps;
        this.animationAssetId = animationAssetId;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getMuscleGroup() { return muscleGroup; }
    public Integer getDifficulty() { return difficulty; }
    public Integer getDefaultHoldTimeOrReps() { return defaultHoldTimeOrReps; }
    public String getAnimationAssetId() { return animationAssetId; }
    public Instant getCreatedAt() { return createdAt; }
}
