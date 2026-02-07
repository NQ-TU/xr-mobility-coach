package ie.noelmccarthy.xrmobilitycoach.api.sessions;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/** Completed training session summary. */
@Entity
@Table(name = "sessions")
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "routine_id", columnDefinition = "uuid")
    private UUID routineId;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at", nullable = false)
    private Instant endedAt;

    @Column(name = "overall_rpe")
    private Integer overallRpe;

    protected Session() {}

    public Session(UUID userId, UUID routineId, Instant startedAt, Instant endedAt, Integer overallRpe) {
        this.userId = userId;
        this.routineId = routineId;
        this.startedAt = startedAt;
        this.endedAt = endedAt;
        this.overallRpe = overallRpe;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getRoutineId() { return routineId; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public Integer getOverallRpe() { return overallRpe; }
}
