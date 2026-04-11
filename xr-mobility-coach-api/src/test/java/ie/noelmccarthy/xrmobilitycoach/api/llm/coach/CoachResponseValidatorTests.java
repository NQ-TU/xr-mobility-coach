package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CoachResponseValidatorTests {

    private final CoachResponseValidator validator = new CoachResponseValidator();

    @Test
    void validateChatReplyTrimsAndNormalizesWhitespace() {
        String validated = validator.validateChatReply("  Keep your warm-up short and focus on hips.\r\n\r\n");

        assertThat(validated).isEqualTo("Keep your warm-up short and focus on hips.");
    }

    @Test
    void validateChatReplyRejectsBlankResponses() {
        assertThatThrownBy(() -> validator.validateChatReply("   "))
                .isInstanceOf(ResponseStatusException.class);
    }
}
