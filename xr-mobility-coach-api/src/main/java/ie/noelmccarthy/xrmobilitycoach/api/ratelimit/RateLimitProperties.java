package ie.noelmccarthy.xrmobilitycoach.api.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Application-level rate limit settings for auth and AI endpoints. */
@ConfigurationProperties(prefix = "app.rate-limit")
public class RateLimitProperties {

    private boolean enabled = true;
    private int authRequestsPerMinute = 10;
    private int routineDraftRequestsPerMinute = 5;
    private int routineDraftRequestsPerDay = 40;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getAuthRequestsPerMinute() {
        return authRequestsPerMinute;
    }

    public void setAuthRequestsPerMinute(int authRequestsPerMinute) {
        this.authRequestsPerMinute = authRequestsPerMinute;
    }

    public int getRoutineDraftRequestsPerMinute() {
        return routineDraftRequestsPerMinute;
    }

    public void setRoutineDraftRequestsPerMinute(int routineDraftRequestsPerMinute) {
        this.routineDraftRequestsPerMinute = routineDraftRequestsPerMinute;
    }

    public int getRoutineDraftRequestsPerDay() {
        return routineDraftRequestsPerDay;
    }

    public void setRoutineDraftRequestsPerDay(int routineDraftRequestsPerDay) {
        this.routineDraftRequestsPerDay = routineDraftRequestsPerDay;
    }
}
