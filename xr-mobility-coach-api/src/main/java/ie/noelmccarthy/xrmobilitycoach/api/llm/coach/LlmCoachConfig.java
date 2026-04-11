package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/** Beans for the LLM-backed coach slice. */
@Configuration
@EnableConfigurationProperties(OpenAiProperties.class)
public class LlmCoachConfig {

    @Bean
    RestClient openAiRestClient(RestClient.Builder builder, OpenAiProperties properties) {
        Duration timeout = Duration.ofSeconds(properties.getTimeoutSeconds());
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(timeout)
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(timeout);
        return builder
                .baseUrl(properties.getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }
}
