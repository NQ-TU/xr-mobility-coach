package ie.noelmccarthy.xrmobilitycoach.api.sessions;

import ie.noelmccarthy.xrmobilitycoach.api.exercise.Exercise;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Per-exercise metrics captured during a session. */
@Entity
@Table(name = "session_exercise_metrics")
public class SessionExerciseMetric {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "session_id", nullable = false, columnDefinition = "uuid")
    private UUID sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "set_index", nullable = false)
    private Integer setIndex;

    @Column(nullable = false)
    private Boolean completed;

    @Column(nullable = false)
    private Boolean skipped;

    @Column(name = "reps_completed")
    private Integer repsCompleted;

    @Column(name = "time_under_tension")
    private BigDecimal timeUnderTension;

    @Column(name = "exercise_rpe")
    private Integer exerciseRpe;

    @Column(columnDefinition = "text")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SessionExerciseMetric() {}

    public SessionExerciseMetric(UUID sessionId,
                                 Exercise exercise,
                                 Integer setIndex,
                                 Boolean completed,
                                 Boolean skipped,
                                 Integer repsCompleted,
                                 BigDecimal timeUnderTension,
                                 Integer exerciseRpe,
                                 String notes) {
        this.sessionId = sessionId;
        this.exercise = exercise;
        this.setIndex = setIndex;
        this.completed = completed;
        this.skipped = skipped;
        this.repsCompleted = repsCompleted;
        this.timeUnderTension = timeUnderTension;
        this.exerciseRpe = exerciseRpe;
        this.notes = notes;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public UUID getSessionId() { return sessionId; }
    public Exercise getExercise() { return exercise; }
    public Integer getSetIndex() { return setIndex; }
    public Boolean getCompleted() { return completed; }
    public Boolean getSkipped() { return skipped; }
    public Integer getRepsCompleted() { return repsCompleted; }
    public BigDecimal getTimeUnderTension() { return timeUnderTension; }
    public Integer getExerciseRpe() { return exerciseRpe; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
