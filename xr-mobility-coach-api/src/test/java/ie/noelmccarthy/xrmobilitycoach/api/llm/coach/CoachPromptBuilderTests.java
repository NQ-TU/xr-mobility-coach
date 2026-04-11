package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import ie.noelmccarthy.xrmobilitycoach.api.profile.dto.UserProfileResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CoachPromptBuilderTests {

    private final CoachPromptBuilder promptBuilder = new CoachPromptBuilder();

    @Test
    void buildIncludesCoachingBoundariesAndUserContext() {
        UserProfileResponse profile = new UserProfileResponse(
                20,
                "Noel",
                "Quirke",
                "Beginner",
                "Hips and shoulders",
                "Desk worker with tight hips",
                Instant.parse("2026-03-01T10:00:00Z"),
                Instant.parse("2026-03-01T10:00:00Z")
        );
        CoachMessage userMessage = new CoachMessage(UUID.randomUUID(), CoachMessageRole.USER,
                "My hips feel tight after sitting all day.");

        CoachPromptBuilder.CoachPrompt prompt = promptBuilder.build(
                profile,
                List.of(),
                List.of(),
                List.of(userMessage)
        );

        assertThat(prompt.instructions()).contains("text-only mobility, flexibility, and exercise coach");
        assertThat(prompt.instructions()).contains("Do not generate images, code");
        assertThat(prompt.instructions()).contains("Do not proactively offer to generate routines");
        assertThat(prompt.input()).contains("Desk worker with tight hips");
        assertThat(prompt.input()).doesNotContain("ALLOWED EXERCISE CATALOGUE");
        assertThat(prompt.input()).contains("My hips feel tight after sitting all day.");
    }
}
