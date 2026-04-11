package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.RoutineDraftPromptBuilder.RoutineDraftPrompt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.function.Supplier;

/** Thin client for outbound OpenAI Responses API calls. */
@Component
public class OpenAiClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiClient.class);
    private static final long RETRY_DELAY_MILLIS = 250L;

    private final RestClient restClient;
    private final OpenAiProperties properties;
    private final ObjectMapper objectMapper;

    public OpenAiClient(RestClient openAiRestClient,
                        OpenAiProperties properties,
                        ObjectMapper objectMapper) {
        this.restClient = openAiRestClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    /** Generate a free-text coach reply and keep the raw request/response payloads for auditing. */
    public OpenAiChatResult generateCoachReply(CoachPromptBuilder.CoachPrompt prompt) {
        String apiKey = normalize(properties.getApiKey());
        if (apiKey == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI coach is not configured");
        }

        CreateResponseRequest request = new CreateResponseRequest(
                properties.getModel(),
                prompt.instructions(),
                prompt.input(),
                properties.getTemperature(),
                properties.getMaxOutputTokens()
        );
        JsonNode requestJson = objectMapper.valueToTree(request);

        JsonNode responseJson = executeWithRetry("chat", () -> createResponse(request, apiKey));
        if (responseJson == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI coach returned no response");
        }

        String message = normalize(extractAssistantText(responseJson));
        if (message == null) {
            log.warn("OpenAI response did not contain assistant text: {}", responseJson);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI coach returned no text response");
        }

        return new OpenAiChatResult(message, requestJson, responseJson);
    }

    /** Generate a strict JSON routine draft that will be validated server-side before use. */
    public OpenAiRoutineDraftResult generateRoutineDraft(RoutineDraftPrompt prompt) {
        String apiKey = normalize(properties.getApiKey());
        if (apiKey == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI coach is not configured");
        }

        CreateStructuredResponseRequest request = new CreateStructuredResponseRequest(
                properties.getModel(),
                prompt.instructions(),
                prompt.input(),
                new TextConfiguration(new JsonSchemaFormat(
                        "json_schema",
                        "routine_draft",
                        routineDraftSchema(),
                        true
                )),
                properties.getTemperature(),
                properties.getMaxOutputTokens()
        );
        JsonNode requestJson = objectMapper.valueToTree(request);

        JsonNode responseJson = executeWithRetry("routine draft", () -> createResponse(request, apiKey));
        if (responseJson == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI coach returned no response");
        }

        RoutineDraftRawResponse draft = extractRoutineDraft(responseJson);
        return new OpenAiRoutineDraftResult(draft, requestJson, responseJson);
    }

    /** Shared outbound POST used by both chat and structured routine draft generation. */
    private JsonNode createResponse(Object request, String apiKey) {
        return restClient.post()
                .uri("/responses")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + apiKey)
                .body(request)
                .retrieve()
                .body(JsonNode.class);
    }

    /** Retry only transient transport or upstream availability failures; invalid model output is not retried. */
    <T> T executeWithRetry(String operation, Supplier<T> requestCall) {
        int totalAttempts = Math.max(0, properties.getRetryAttempts()) + 1;
        for (int attempt = 1; attempt <= totalAttempts; attempt++) {
            try {
                return requestCall.get();
            } catch (RestClientException ex) {
                if (!isRetryable(ex) || attempt == totalAttempts) {
                    if (attempt == 1) {
                        log.error("OpenAI {} request failed", operation, ex);
                    } else {
                        log.error("OpenAI {} request failed after {} attempts", operation, attempt, ex);
                    }
                    throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI coach is temporarily unavailable");
                }

                log.warn("OpenAI {} request failed on attempt {} of {}; retrying", operation, attempt, totalAttempts, ex);
                pauseBeforeRetry(attempt);
            }
        }

        throw new IllegalStateException("OpenAI retry loop exited unexpectedly");
    }

    private static boolean isRetryable(RestClientException ex) {
        // ResourceAccessException covers connect/read timeouts and other low-level I/O failures.
        if (ex instanceof ResourceAccessException) {
            return true;
        }
        // 429 and 5xx are worth retrying because they are usually temporary upstream conditions.
        if (ex instanceof RestClientResponseException responseEx) {
            return responseEx.getStatusCode().is5xxServerError() || responseEx.getStatusCode().value() == 429;
        }
        return false;
    }

    private static void pauseBeforeRetry(int attempt) {
        try {
            Thread.sleep(RETRY_DELAY_MILLIS * attempt);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI coach is temporarily unavailable");
        }
    }

    private JsonNode routineDraftSchema() {
        // The model is required to return this exact object shape so the validator can work from JSON only.
        ObjectNode schema = objectMapper.createObjectNode();
        ObjectNode properties = objectMapper.createObjectNode();
        ObjectNode itemProperties = objectMapper.createObjectNode();
        ArrayNode notesTypes = objectMapper.createArrayNode();
        notesTypes.add("string");
        notesTypes.add("null");

        itemProperties.set("exerciseId", objectMapper.createObjectNode().put("type", "string"));
        itemProperties.set("sets", objectMapper.createObjectNode().put("type", "integer"));
        itemProperties.set("repsOrHoldSeconds", objectMapper.createObjectNode().put("type", "integer"));
        itemProperties.set("notes", objectMapper.createObjectNode().set("type", notesTypes));

        ObjectNode itemSchema = objectMapper.createObjectNode();
        itemSchema.put("type", "object");
        itemSchema.set("properties", itemProperties);
        itemSchema.putArray("required")
                .add("exerciseId")
                .add("sets")
                .add("repsOrHoldSeconds")
                .add("notes");
        itemSchema.put("additionalProperties", false);

        ObjectNode itemsSchema = objectMapper.createObjectNode();
        itemsSchema.put("type", "array");
        itemsSchema.set("items", itemSchema);

        properties.set("title", objectMapper.createObjectNode().put("type", "string"));
        properties.set("targetArea", objectMapper.createObjectNode().put("type", "string"));
        properties.set("items", itemsSchema);

        schema.put("type", "object");
        schema.set("properties", properties);
        schema.putArray("required")
                .add("title")
                .add("targetArea")
                .add("items");
        schema.put("additionalProperties", false);
        return schema;
    }

    String extractAssistantText(JsonNode responseJson) {
        if (responseJson == null) {
            return null;
        }

        // output_text is the simplest path when the Responses API flattens assistant output for us.
        JsonNode outputText = responseJson.get("output_text");
        if (outputText != null && outputText.isTextual()) {
            return outputText.asText();
        }

        // Fall back to walking the structured output array because the API can nest assistant text by content part.
        JsonNode output = responseJson.get("output");
        if (output == null || !output.isArray()) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        for (JsonNode item : output) {
            if (!"message".equals(item.path("type").asText())) {
                continue;
            }
            if (!"assistant".equals(item.path("role").asText())) {
                continue;
            }

            JsonNode content = item.get("content");
            if (content == null || !content.isArray()) {
                continue;
            }

            for (JsonNode part : content) {
                String type = part.path("type").asText();
                if ("output_text".equals(type)) {
                    appendIfPresent(builder, part.get("text"));
                } else if ("refusal".equals(type)) {
                    appendIfPresent(builder, part.get("refusal"));
                }
            }
        }

        String extracted = builder.toString().trim();
        return extracted.isEmpty() ? null : extracted;
    }

    RoutineDraftRawResponse extractRoutineDraft(JsonNode responseJson) {
        String output = normalize(extractAssistantText(responseJson));
        if (output == null) {
            log.warn("OpenAI routine draft response did not contain assistant text: {}", responseJson);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI coach returned no routine draft");
        }

        try {
            // The validator owns semantic checks; this step only confirms the payload is valid JSON for the raw contract.
            return objectMapper.readValue(output, RoutineDraftRawResponse.class);
        } catch (IOException ex) {
            log.warn("OpenAI routine draft response was not valid JSON: {}", output, ex);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI coach returned invalid routine draft JSON");
        }
    }

    private static void appendIfPresent(StringBuilder builder, JsonNode node) {
        if (node == null || !node.isTextual()) {
            return;
        }
        String value = node.asText().trim();
        if (value.isEmpty()) {
            return;
        }
        if (builder.length() > 0) {
            builder.append("\n\n");
        }
        builder.append(value);
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record OpenAiChatResult(String message, JsonNode requestJson, JsonNode responseJson) {}
    public record OpenAiRoutineDraftResult(RoutineDraftRawResponse draft, JsonNode requestJson, JsonNode responseJson) {}

    record CreateResponseRequest(
            String model,
            String instructions,
            String input,
            double temperature,
            int max_output_tokens
    ) {}

    record CreateStructuredResponseRequest(
            String model,
            String instructions,
            String input,
            TextConfiguration text,
            double temperature,
            int max_output_tokens
    ) {}

    record TextConfiguration(JsonSchemaFormat format) {}

    record JsonSchemaFormat(
            String type,
            String name,
            JsonNode schema,
            boolean strict
    ) {}
}
