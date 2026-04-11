package ie.noelmccarthy.xrmobilitycoach.api.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import ie.noelmccarthy.xrmobilitycoach.api.auth.dto.AuthResponse;
import ie.noelmccarthy.xrmobilitycoach.api.auth.dto.RegisterRequest;
import ie.noelmccarthy.xrmobilitycoach.api.config.SecurityConfig;
import ie.noelmccarthy.xrmobilitycoach.api.ratelimit.InMemoryRateLimitService;
import ie.noelmccarthy.xrmobilitycoach.api.ratelimit.RateLimitConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@Import({SecurityConfig.class, RateLimitConfig.class})
@TestPropertySource(properties = "app.rate-limit.auth-requests-per-minute=2")
class AuthControllerWebMvcTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private InMemoryRateLimitService rateLimitService;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void resetRateLimits() {
        rateLimitService.clear();
    }

    @Test
    void registerIsRateLimitedPerClientIp() throws Exception {
        RegisterRequest request = new RegisterRequest("user@test.com", "password123");
        when(authService.register(anyString(), anyString()))
                .thenReturn(new AuthResponse("jwt-token", UUID.randomUUID(), "user@test.com"));

        mockMvc.perform(post("/api/auth/register")
                        .with(httpRequest -> {
                            httpRequest.setRemoteAddr("203.0.113.10");
                            return httpRequest;
                        })
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                        .with(httpRequest -> {
                            httpRequest.setRemoteAddr("203.0.113.10");
                            return httpRequest;
                        })
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                        .with(httpRequest -> {
                            httpRequest.setRemoteAddr("203.0.113.10");
                            return httpRequest;
                        })
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

        verify(authService, times(2)).register(anyString(), anyString());
    }
}
