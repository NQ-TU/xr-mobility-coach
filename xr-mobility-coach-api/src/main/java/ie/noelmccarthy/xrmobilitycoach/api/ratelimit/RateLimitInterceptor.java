package ie.noelmccarthy.xrmobilitycoach.api.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

import java.security.Principal;
import java.time.Duration;

/** Applies lightweight application rate limits to selected endpoints. */
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final Duration MINUTE = Duration.ofMinutes(1);
    private static final Duration DAY = Duration.ofDays(1);

    private final InMemoryRateLimitService rateLimits;
    private final RateLimitProperties properties;

    public RateLimitInterceptor(InMemoryRateLimitService rateLimits,
                                RateLimitProperties properties) {
        this.rateLimits = rateLimits;
        this.properties = properties;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Only POST endpoints currently carry cost or abuse risk high enough to justify app-level throttling.
        if (!properties.isEnabled() || !"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        if ("/api/auth/register".equals(path) || "/api/auth/login".equals(path)) {
            enforceAuthLimit(request, path);
        } else if ("/api/coach/routine-drafts".equals(path)) {
            enforceRoutineDraftLimits(request);
        }
        return true;
    }

    private void enforceAuthLimit(HttpServletRequest request, String path) {
        String endpoint = path.endsWith("/register") ? "register" : "login";
        String clientKey = clientKey(request);
        rateLimits.check(
                "auth:" + endpoint + ":" + clientKey,
                properties.getAuthRequestsPerMinute(),
                MINUTE,
                "Too many authentication attempts. Please try again shortly.",
                MINUTE.toSeconds()
        );
    }

    private void enforceRoutineDraftLimits(HttpServletRequest request) {
        String subject = subjectKey(request);
        // Short-window limit protects against bursts; daily cap protects cost exposure.
        rateLimits.check(
                "routine-drafts:minute:" + subject,
                properties.getRoutineDraftRequestsPerMinute(),
                MINUTE,
                "Too many routine draft requests. Please try again shortly.",
                MINUTE.toSeconds()
        );
        rateLimits.check(
                "routine-drafts:day:" + subject,
                properties.getRoutineDraftRequestsPerDay(),
                DAY,
                "You have reached the daily routine draft limit. Please try again tomorrow.",
                DAY.toSeconds()
        );
    }

    private static String subjectKey(HttpServletRequest request) {
        Principal principal = request.getUserPrincipal();
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            // Authenticated AI limits should follow the user, not the current source IP.
            return "user:" + principal.getName();
        }
        return "ip:" + clientKey(request);
    }

    private static String clientKey(HttpServletRequest request) {
        // Prefer proxy-forwarded headers because production traffic may be routed through a load balancer or CDN.
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null) {
            String firstAddress = forwardedFor.split(",")[0].trim();
            if (!firstAddress.isEmpty()) {
                return firstAddress;
            }
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }
}
