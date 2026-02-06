package ie.noelmccarthy.xrmobilitycoach.api.routine;

import ie.noelmccarthy.xrmobilitycoach.api.routine.dto.RoutineDetailResponse;
import ie.noelmccarthy.xrmobilitycoach.api.routine.dto.RoutineSummaryResponse;
import ie.noelmccarthy.xrmobilitycoach.api.routine.dto.UpsertRoutineRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Endpoints for user-owned routines. */
@RestController
@RequestMapping("/api/routines")
public class RoutineController {

    private final RoutineService routines;

    public RoutineController(RoutineService routines) {
        this.routines = routines;
    }

    @GetMapping
    /** List routines for the current user. */
    public Page<RoutineSummaryResponse> list(@AuthenticationPrincipal Jwt jwt,
                                             @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return routines.list(userId, pageable);
    }

    @GetMapping("/{id}")
    /** Fetch a routine and its exercises. */
    public RoutineDetailResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return routines.get(userId, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    /** Create a routine for the current user. */
    public RoutineDetailResponse create(@AuthenticationPrincipal Jwt jwt,
                                        @Valid @RequestBody UpsertRoutineRequest req) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return routines.create(userId, req);
    }

    @PutMapping("/{id}")
    /** Replace a routine and its exercises. */
    public RoutineDetailResponse update(@AuthenticationPrincipal Jwt jwt,
                                        @PathVariable UUID id,
                                        @Valid @RequestBody UpsertRoutineRequest req) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return routines.update(userId, id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    /** Delete a routine and its exercises. */
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwt.getSubject());
        routines.delete(userId, id);
    }
}
