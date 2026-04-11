package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CoachChatRequest;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CoachChatResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CoachConversationSummaryResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CoachMessageResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CreateRoutineDraftRequest;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Endpoints for the AI coaching chat experience. */
@RestController
@RequestMapping("/api/coach")
public class CoachController {

    private final CoachService coachService;
    private final CoachRoutineDraftService coachRoutineDraftService;

    public CoachController(CoachService coachService,
                           CoachRoutineDraftService coachRoutineDraftService) {
        this.coachService = coachService;
        this.coachRoutineDraftService = coachRoutineDraftService;
    }

    @PostMapping("/chat")
    /** Send a message to the coach and persist the conversation turn. */
    public CoachChatResponse chat(@AuthenticationPrincipal Jwt jwt,
                                  @Valid @RequestBody CoachChatRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return coachService.chat(userId, request);
    }

    @PostMapping("/routine-drafts")
    /** Generate an unsaved, validated routine draft from structured builder input. */
    public RoutineDraftResponse createRoutineDraft(@AuthenticationPrincipal Jwt jwt,
                                                   @Valid @RequestBody CreateRoutineDraftRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return coachRoutineDraftService.generateDraft(userId, request);
    }

    @GetMapping("/conversations")
    /** Return the current user's stored coach conversations ordered by most recent activity. */
    public List<CoachConversationSummaryResponse> conversations(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return coachService.conversations(userId);
    }

    @DeleteMapping("/conversations/{conversationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    /** Delete a stored conversation owned by the current user. */
    public void deleteConversation(@AuthenticationPrincipal Jwt jwt,
                                   @PathVariable UUID conversationId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        coachService.deleteConversation(userId, conversationId);
    }

    @GetMapping("/conversations/{conversationId}/messages")
    /** Return the stored messages for a conversation owned by the current user. */
    public List<CoachMessageResponse> messages(@AuthenticationPrincipal Jwt jwt,
                                               @PathVariable UUID conversationId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return coachService.messages(userId, conversationId);
    }
}
