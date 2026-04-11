package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import com.fasterxml.jackson.databind.ObjectMapper;
import ie.noelmccarthy.xrmobilitycoach.api.config.SecurityConfig;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CoachChatRequest;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CoachChatResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CoachConversationSummaryResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.CreateRoutineDraftRequest;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftItemResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineDraftResponse;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto.RoutineType;
import ie.noelmccarthy.xrmobilitycoach.api.ratelimit.InMemoryRateLimitService;
import ie.noelmccarthy.xrmobilitycoach.api.ratelimit.RateLimitConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CoachController.class)
@Import({SecurityConfig.class, RateLimitConfig.class})
@TestPropertySource(properties = {
        "app.rate-limit.routine-draft-requests-per-minute=2",
        "app.rate-limit.routine-draft-requests-per-day=10"
})
class CoachControllerWebMvcTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private InMemoryRateLimitService rateLimitService;

    @MockBean
    private CoachService coachService;

    @MockBean
    private CoachRoutineDraftService coachRoutineDraftService;

    @MockBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void resetRateLimits() {
        rateLimitService.clear();
    }

    @Test
    void chatReturnsCoachResponseForAuthenticatedUser() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();

        when(coachService.chat(eq(userId), any(CoachChatRequest.class)))
                .thenReturn(new CoachChatResponse(
                        conversationId,
                        "Let's focus on a short hip mobility reset.",
                        Instant.parse("2026-03-27T22:00:00Z")
                ));

        mockMvc.perform(post("/api/coach/chat")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CoachChatRequest(conversationId, "My hips are tight."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conversationId").value(conversationId.toString()))
                .andExpect(jsonPath("$.message").value("Let's focus on a short hip mobility reset."));
    }

    @Test
    void chatRejectsBlankMessages() throws Exception {
        mockMvc.perform(post("/api/coach/chat")
                        .with(jwt().jwt(jwt -> jwt.subject(UUID.randomUUID().toString())))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CoachChatRequest(null, "   "))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void conversationsReturnsStoredConversationSummaries() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();

        when(coachService.conversations(userId))
                .thenReturn(java.util.List.of(new CoachConversationSummaryResponse(
                        conversationId,
                        Instant.parse("2026-04-11T10:00:00Z"),
                        Instant.parse("2026-04-11T10:05:00Z"),
                        "My hips feel tight after sitting."
                )));

        mockMvc.perform(get("/api/coach/conversations")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].conversationId").value(conversationId.toString()))
                .andExpect(jsonPath("$[0].lastMessagePreview").value("My hips feel tight after sitting."))
                .andExpect(jsonPath("$[0].updatedAt").value("2026-04-11T10:05:00Z"));
    }

    @Test
    void deleteConversationReturnsNoContent() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();

        mockMvc.perform(delete("/api/coach/conversations/{conversationId}", conversationId)
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))))
                .andExpect(status().isNoContent());

        verify(coachService).deleteConversation(userId, conversationId);
    }

    @Test
    void createRoutineDraftReturnsValidatedUnsavedDraft() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID exerciseId = UUID.randomUUID();

        when(coachRoutineDraftService.generateDraft(eq(userId), any(CreateRoutineDraftRequest.class)))
                .thenReturn(new RoutineDraftResponse(
                        "Desk Reset",
                        "Hips",
                        RoutineType.RECOVERY,
                        5,
                        java.util.List.of(new RoutineDraftItemResponse(
                                exerciseId,
                                "Child's Pose",
                                "Hips",
                                1,
                                2,
                                30,
                                "Breathe slowly"
                        ))
                ));

        CreateRoutineDraftRequest request = new CreateRoutineDraftRequest(
                null,
                List.of("Hips", "Lower Back"),
                RoutineType.RECOVERY,
                10,
                1,
                "Tight after sitting all day",
                null,
                null
        );

        mockMvc.perform(post("/api/coach/routine-drafts")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Desk Reset"))
                .andExpect(jsonPath("$.routineType").value("RECOVERY"))
                .andExpect(jsonPath("$.estimatedDuration").value(5))
                .andExpect(jsonPath("$.items[0].exerciseId").value(exerciseId.toString()))
                .andExpect(jsonPath("$.items[0].exerciseName").value("Child's Pose"));
    }

    @Test
    void createRoutineDraftRejectsMissingRequiredFields() throws Exception {
        CreateRoutineDraftRequest request = new CreateRoutineDraftRequest(
                "   ",
                List.of("   "),
                null,
                null,
                5,
                "   ",
                null,
                null
        );

        mockMvc.perform(post("/api/coach/routine-drafts")
                        .with(jwt().jwt(jwt -> jwt.subject(UUID.randomUUID().toString())))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createRoutineDraftRequiresAuthentication() throws Exception {
        CreateRoutineDraftRequest request = new CreateRoutineDraftRequest(
                null,
                List.of("Hips"),
                RoutineType.MOBILITY,
                15,
                2,
                "Morning stiffness",
                null,
                null
        );

        mockMvc.perform(post("/api/coach/routine-drafts")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createRoutineDraftIsRateLimitedPerAuthenticatedUser() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID exerciseId = UUID.randomUUID();
        CreateRoutineDraftRequest request = new CreateRoutineDraftRequest(
                null,
                List.of("Hips"),
                RoutineType.RECOVERY,
                10,
                1,
                "Desk stiffness",
                null,
                null
        );

        when(coachRoutineDraftService.generateDraft(eq(userId), any(CreateRoutineDraftRequest.class)))
                .thenReturn(new RoutineDraftResponse(
                        "Desk Reset",
                        "Hips",
                        RoutineType.RECOVERY,
                        5,
                        List.of(new RoutineDraftItemResponse(
                                exerciseId,
                                "Child's Pose",
                                "Hips",
                                1,
                                2,
                                30,
                                null
                        ))
                ));

        mockMvc.perform(post("/api/coach/routine-drafts")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/coach/routine-drafts")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/coach/routine-drafts")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

        verify(coachRoutineDraftService, times(2)).generateDraft(eq(userId), any(CreateRoutineDraftRequest.class));
    }
}
