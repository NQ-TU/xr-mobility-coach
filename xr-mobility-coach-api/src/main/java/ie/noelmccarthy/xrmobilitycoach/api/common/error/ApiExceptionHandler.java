package ie.noelmccarthy.xrmobilitycoach.api.common.error;

import ie.noelmccarthy.xrmobilitycoach.api.auth.EmailAlreadyInUseException;
import ie.noelmccarthy.xrmobilitycoach.api.auth.InvalidCredentialsException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

/** Maps domain exceptions to consistent API error responses. */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    /** Standard error payload returned by the API. */
    record ErrorResponse(String code, String message, Instant timestamp) {}

    @ResponseStatus(HttpStatus.CONFLICT)
    @ExceptionHandler(EmailAlreadyInUseException.class)
    /** Return 409 when a registration uses an existing email. */
    public ErrorResponse emailInUse() {
        log.warn("Registration failed: email already in use");
        return new ErrorResponse("EMAIL_IN_USE", "Email is already registered", Instant.now());
    }

    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    @ExceptionHandler(InvalidCredentialsException.class)
    /** Return 401 when credentials are invalid. */
    public ErrorResponse invalidCreds() {
        log.warn("Login failed: invalid credentials");
        return new ErrorResponse("INVALID_CREDENTIALS", "Invalid email or password", Instant.now());
    }
}
