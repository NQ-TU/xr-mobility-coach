package ie.noelmccarthy.xrmobilitycoach.api.common.error;

import ie.noelmccarthy.xrmobilitycoach.api.auth.EmailAlreadyInUseException;
import ie.noelmccarthy.xrmobilitycoach.api.auth.InvalidCredentialsException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class ApiExceptionHandler {

    record ErrorResponse(String code, String message, Instant timestamp) {}

    @ResponseStatus(HttpStatus.CONFLICT)
    @ExceptionHandler(EmailAlreadyInUseException.class)
    public ErrorResponse emailInUse() {
        return new ErrorResponse("EMAIL_IN_USE", "Email is already registered", Instant.now());
    }

    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    @ExceptionHandler(InvalidCredentialsException.class)
    public ErrorResponse invalidCreds() {
        return new ErrorResponse("INVALID_CREDENTIALS", "Invalid email or password", Instant.now());
    }
}
