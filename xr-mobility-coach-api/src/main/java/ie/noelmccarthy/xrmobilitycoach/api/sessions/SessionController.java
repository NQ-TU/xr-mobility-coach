package ie.noelmccarthy.xrmobilitycoach.api.sessions;

import ie.noelmccarthy.xrmobilitycoach.api.sessions.dto.CreateSessionRequest;
import ie.noelmccarthy.xrmobilitycoach.api.sessions.dto.SessionDetailResponse;
import ie.noelmccarthy.xrmobilitycoach.api.sessions.dto.SessionResponse;
import ie.noelmccarthy.xrmobilitycoach.api.sessions.dto.SessionSummaryResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
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

    @GetMapping
    /** List sessions in a date range for calendar/history views. */
    public List<SessionSummaryResponse> list(@AuthenticationPrincipal Jwt jwt,
                                             @RequestParam LocalDate from,
                                             @RequestParam LocalDate to) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return sessions.list(userId, from, to);
    }

    @GetMapping("/{id}")
    /** Get a session with its metrics. */
    public SessionDetailResponse get(@AuthenticationPrincipal Jwt jwt,
                                     @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return sessions.get(userId, id);
    }
}
