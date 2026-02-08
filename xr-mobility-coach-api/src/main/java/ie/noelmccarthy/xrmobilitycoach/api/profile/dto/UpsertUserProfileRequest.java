package ie.noelmccarthy.xrmobilitycoach.api.profile.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** Request model for creating or updating a user profile. */
public record UpsertUserProfileRequest(
        @Min(1) @Max(45)
        Integer preferredSessionLength,
        @Size(max = 100)
        String firstName,
        @Size(max = 100)
        String lastName,
        String trainingExperience,
        String targetAreas,
        String notes
) {}
