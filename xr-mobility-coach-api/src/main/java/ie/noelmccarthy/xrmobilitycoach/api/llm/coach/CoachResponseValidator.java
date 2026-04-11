package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Normalizes and validates coach replies before they reach the API. */
@Component
public class CoachResponseValidator {

    public String validateChatReply(String message) {
        if (message == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI coach returned an empty response");
        }

        String normalized = message.trim().replace("\r\n", "\n");
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI coach returned an empty response");
        }

        if (normalized.length() > 4000) {
            normalized = normalized.substring(0, 4000).trim();
        }
        return normalized;
    }
}
