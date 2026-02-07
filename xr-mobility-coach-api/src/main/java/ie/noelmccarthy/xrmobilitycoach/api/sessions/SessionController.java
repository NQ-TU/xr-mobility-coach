package ie.noelmccarthy.xrmobilitycoach.api.sessions;

import ie.noelmccarthy.xrmobilitycoach.api.sessions.dto.CreateSessionRequest;
import ie.noelmccarthy.xrmobilitycoach.api.sessions.dto.SessionResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Endpoints for recording completed sessions. */
@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final SessionService sessions;

    public SessionController(SessionService sessions) {
        this.sessions = sessions;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    /** Record a completed session and its metrics. */
    public SessionResponse create(@AuthenticationPrincipal Jwt jwt,
                                  @Valid @RequestBody CreateSessionRequest req) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return sessions.create(userId, req);
    }
}
