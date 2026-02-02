package ie.noelmccarthy.xrmobilitycoach.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Request model for logging in with credentials. */
public record LoginRequest(

        @Email @NotBlank
        String email,

        @NotBlank
        String password
) {}
