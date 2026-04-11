package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OpenAiClientTests {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final OpenAiClient client = new OpenAiClient(RestClient.builder().build(), new OpenAiProperties(), objectMapper);

    @Test
    void extractAssistantTextReadsNestedOutputMessageContent() throws Exception {
        String json = """
                {
                  "id": "resp_123",
                  "status": "completed",
                  "output": [
                    {
                      "type": "message",
                      "role": "assistant",
                      "content": [
                        {
                          "type": "output_text",
                          "text": "Start with 5 minutes of hip mobility."
                        }
                      ]
                    }
                  ]
                }
                """;

        String extracted = client.extractAssistantText(objectMapper.readTree(json));

        assertThat(extracted).isEqualTo("Start with 5 minutes of hip mobility.");
    }

    @Test
    void extractAssistantTextFallsBackToTopLevelOutputTextWhenPresent() throws Exception {
        String json = """
                {
                  "id": "resp_123",
                  "status": "completed",
                  "output_text": "Keep the session short and easy today."
                }
                """;

        String extracted = client.extractAssistantText(objectMapper.readTree(json));

        assertThat(extracted).isEqualTo("Keep the session short and easy today.");
    }

    @Test
    void extractRoutineDraftParsesStructuredJsonOutput() throws Exception {
        UUID exerciseId = UUID.randomUUID();
        String json = """
                {
                  "id": "resp_123",
                  "status": "completed",
                  "output_text": "{\\"title\\":\\"Desk Reset\\",\\"targetArea\\":\\"Hips\\",\\"items\\":[{\\"exerciseId\\":\\"%s\\",\\"sets\\":2,\\"repsOrHoldSeconds\\":30,\\"notes\\":\\"Breathe slowly\\"}]}"
                }
                """.formatted(exerciseId);

        RoutineDraftRawResponse draft = client.extractRoutineDraft(objectMapper.readTree(json));

        assertThat(draft.title()).isEqualTo("Desk Reset");
        assertThat(draft.targetArea()).isEqualTo("Hips");
        assertThat(draft.items()).hasSize(1);
        assertThat(draft.items().get(0).exerciseId()).isEqualTo(exerciseId);
    }

    @Test
    void executeWithRetryRetriesTransientFailuresTwiceBeforeSucceeding() {
        OpenAiClient retryingClient = new OpenAiClient(
                RestClient.builder().build(),
                configuredProperties(),
                objectMapper
        );
        AtomicInteger attempts = new AtomicInteger();

        String result = retryingClient.executeWithRetry("routine draft", () -> {
            int attempt = attempts.incrementAndGet();
            if (attempt < 3) {
                throw timeout();
            }
            return "ok";
        });

        assertThat(result).isEqualTo("ok");
        assertThat(attempts).hasValue(3);
    }

    @Test
    void executeWithRetryStopsAfterTwoRetryAttempts() {
        OpenAiClient retryingClient = new OpenAiClient(
                RestClient.builder().build(),
                configuredProperties(),
                objectMapper
        );
        AtomicInteger attempts = new AtomicInteger();

        assertThatThrownBy(() -> retryingClient.executeWithRetry(
                "chat",
                () -> {
                    attempts.incrementAndGet();
                    throw timeout();
                }
        )).isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
            assertThat(ex.getStatusCode().value()).isEqualTo(503);
            assertThat(ex.getReason()).isEqualTo("AI coach is temporarily unavailable");
        });

        assertThat(attempts).hasValue(3);
    }

    private OpenAiProperties configuredProperties() {
        OpenAiProperties properties = new OpenAiProperties();
        properties.setApiKey("test-key");
        properties.setRetryAttempts(2);
        return properties;
    }

    private ResourceAccessException timeout() {
        return new ResourceAccessException("timeout");
    }
}
