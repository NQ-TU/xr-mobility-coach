package ie.noelmccarthy.xrmobilitycoach.api.ratelimit;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Clock;

/** Wires the simple in-memory application rate limiter into MVC handling. */
@Configuration
@EnableConfigurationProperties(RateLimitProperties.class)
public class RateLimitConfig {

    @Bean
    Clock rateLimitClock() {
        return Clock.systemUTC();
    }

    @Bean
    InMemoryRateLimitService inMemoryRateLimitService(Clock rateLimitClock) {
        return new InMemoryRateLimitService(rateLimitClock);
    }

    @Bean
    RateLimitInterceptor rateLimitInterceptor(InMemoryRateLimitService rateLimitService,
                                              RateLimitProperties properties) {
        return new RateLimitInterceptor(rateLimitService, properties);
    }

    @Bean
    WebMvcConfigurer rateLimitWebMvcConfigurer(RateLimitInterceptor rateLimitInterceptor) {
        return new WebMvcConfigurer() {
            @Override
            public void addInterceptors(InterceptorRegistry registry) {
                registry.addInterceptor(rateLimitInterceptor);
            }
        };
    }
}
