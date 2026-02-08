package ie.noelmccarthy.xrmobilitycoach.api.profile.dto;

import java.time.Instant;

/** Response model for user profile data. */
public record UserProfileResponse(
        Integer preferredSessionLength,
        String firstName,
        String lastName,
        String trainingExperience,
        String targetAreas,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {}
