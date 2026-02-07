package ie.noelmccarthy.xrmobilitycoach.api.sessions.dto;

import java.time.Instant;
import java.util.UUID;

/** Response model for a created session. */
public record SessionResponse(
        UUID id,
        UUID routineId,
        Instant startedAt,
        Instant endedAt,
        Integer overallRpe
) {}
