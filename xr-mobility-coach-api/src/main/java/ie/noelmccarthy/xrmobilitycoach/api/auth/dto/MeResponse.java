package ie.noelmccarthy.xrmobilitycoach.api.auth.dto;

import java.util.UUID;

public record MeResponse(
        UUID userId,
        String email
) {}
