package ie.noelmccarthy.xrmobilitycoach.api.sessions.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Request model for creating a completed session. */
public record CreateSessionRequest(
        @NotNull
        UUID routineId,

        @NotNull
        Instant startedAt,

        @NotNull
        Instant endedAt,

        @Min(1) @Max(10)
        Integer overallRpe,

        @NotEmpty @Valid
        List<SessionMetricRequest> metrics
) {}
