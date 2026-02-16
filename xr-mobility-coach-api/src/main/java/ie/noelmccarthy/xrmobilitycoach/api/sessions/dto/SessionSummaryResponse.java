package ie.noelmccarthy.xrmobilitycoach.api.sessions.dto;

import java.time.Instant;
import java.util.UUID;

/** Summary view of a session for history listings. */
public record SessionSummaryResponse(
        UUID id,
        UUID routineId,
        String routineTitle,
        String targetArea,
        Instant startedAt,
        Instant endedAt,
        long durationSeconds,
        Integer overallRpe,
        long exerciseCount
) {}
