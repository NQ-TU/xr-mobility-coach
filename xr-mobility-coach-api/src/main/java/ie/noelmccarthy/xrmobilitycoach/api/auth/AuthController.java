package ie.noelmccarthy.xrmobilitycoach.api.auth;

import ie.noelmccarthy.xrmobilitycoach.api.auth.dto.AuthResponse;
import ie.noelmccarthy.xrmobilitycoach.api.auth.dto.LoginRequest;
import ie.noelmccarthy.xrmobilitycoach.api.auth.dto.MeResponse;
import ie.noelmccarthy.xrmobilitycoach.api.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Auth endpoints for register, login, and current user. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    /** Register a new account and return a token. */
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return auth.register(req.email(), req.password());
    }

    @PostMapping("/login")
    /** Authenticate with credentials and return a token. */
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req.email(), req.password());
    }

    @GetMapping("/me")
    /** Return the current authenticated user's id and email. */
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String email = jwt.getClaimAsString("email");
        return new MeResponse(userId, email);
    }
}
