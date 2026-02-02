package ie.noelmccarthy.xrmobilitycoach.api.profile.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Request model for creating or updating a user profile. */
public record UpsertUserProfileRequest(
        @Min(1) @Max(45)
        Integer preferredSessionLength,
        String trainingExperience,
        String targetAreas,
        String notes
) {}
