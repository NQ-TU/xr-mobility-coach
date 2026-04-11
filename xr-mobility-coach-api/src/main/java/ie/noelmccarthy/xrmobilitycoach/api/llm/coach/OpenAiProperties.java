package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configuration for outbound OpenAI chat calls. */
@ConfigurationProperties(prefix = "llm.openai")
public class OpenAiProperties {

    private String apiKey;
    private String model = "gpt-4.1-mini";
    private String baseUrl = "https://api.openai.com/v1";
    private int timeoutSeconds = 30;
    private int retryAttempts = 2;
    private int maxHistoryMessages = 8;
    private int maxOutputTokens = 500;
    private double temperature = 0.4;

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public int getRetryAttempts() {
        return retryAttempts;
    }

    public void setRetryAttempts(int retryAttempts) {
        this.retryAttempts = retryAttempts;
    }

    public int getMaxHistoryMessages() {
        return maxHistoryMessages;
    }

    public void setMaxHistoryMessages(int maxHistoryMessages) {
        this.maxHistoryMessages = maxHistoryMessages;
    }

    public int getMaxOutputTokens() {
        return maxOutputTokens;
    }

    public void setMaxOutputTokens(int maxOutputTokens) {
        this.maxOutputTokens = maxOutputTokens;
    }

    public double getTemperature() {
        return temperature;
    }

    public void setTemperature(double temperature) {
        this.temperature = temperature;
    }
}
