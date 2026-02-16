package ie.noelmccarthy.xrmobilitycoach.api.sessions.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Detailed view of a session including metrics. */
public record SessionDetailResponse(
        UUID id,
        UUID routineId,
        String routineTitle,
        String targetArea,
        Instant startedAt,
        Instant endedAt,
        long durationSeconds,
        Integer overallRpe,
        List<SessionMetricResponse> metrics
) {}
