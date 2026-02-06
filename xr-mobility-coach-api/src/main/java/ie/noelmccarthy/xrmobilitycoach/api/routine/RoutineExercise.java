package ie.noelmccarthy.xrmobilitycoach.api.routine;

import ie.noelmccarthy.xrmobilitycoach.api.exercise.Exercise;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/** Exercise entry within a routine. */
@Entity
@Table(name = "routine_exercises")
public class RoutineExercise {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "routine_id", nullable = false, columnDefinition = "uuid")
    private UUID routineId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "sequence_index", nullable = false)
    private Integer sequenceIndex;

    @Column
    private Integer sets;

    @Column(name = "reps_or_hold_seconds", nullable = false)
    private Integer repsOrHoldSeconds;

    @Column(length = 50)
    private String tempo;

    @Column(name = "coaching_notes", columnDefinition = "text")
    private String coachingNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected RoutineExercise() {}

    public RoutineExercise(UUID routineId,
                           Exercise exercise,
                           Integer sequenceIndex,
                           Integer sets,
                           Integer repsOrHoldSeconds,
                           String tempo,
                           String coachingNotes) {
        this.routineId = routineId;
        this.exercise = exercise;
        this.sequenceIndex = sequenceIndex;
        this.sets = sets;
        this.repsOrHoldSeconds = repsOrHoldSeconds;
        this.tempo = tempo;
        this.coachingNotes = coachingNotes;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public UUID getRoutineId() { return routineId; }
    public Exercise getExercise() { return exercise; }
    public Integer getSequenceIndex() { return sequenceIndex; }
    public Integer getSets() { return sets; }
    public Integer getRepsOrHoldSeconds() { return repsOrHoldSeconds; }
    public String getTempo() { return tempo; }
    public String getCoachingNotes() { return coachingNotes; }
    public Instant getCreatedAt() { return createdAt; }
}
