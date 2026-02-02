package ie.noelmccarthy.xrmobilitycoach.api.auth.dto;

import java.util.UUID;

/** Response model for successful authentication. */
public record AuthResponse(
        String token,
        UUID userId,
        String email
) {}
