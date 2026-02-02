package ie.noelmccarthy.xrmobilitycoach.api.auth.dto;

import java.util.UUID;

/** Response model for the current authenticated user. */
public record MeResponse(
        UUID userId,
        String email
) {}
