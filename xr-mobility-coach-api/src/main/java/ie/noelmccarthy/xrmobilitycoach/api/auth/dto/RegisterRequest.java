package ie.noelmccarthy.xrmobilitycoach.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request model for registering a new account. */
public record RegisterRequest (

    @Email @NotBlank
    String email,

    @NotBlank @Size(min = 8, max = 72)
    String password
) {}
