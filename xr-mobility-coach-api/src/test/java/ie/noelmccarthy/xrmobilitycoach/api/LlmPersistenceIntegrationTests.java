package ie.noelmccarthy.xrmobilitycoach.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import ie.noelmccarthy.xrmobilitycoach.api.llm.LlmLog;
import ie.noelmccarthy.xrmobilitycoach.api.llm.LlmLogRepository;
import ie.noelmccarthy.xrmobilitycoach.api.llm.coach.*;
import ie.noelmccarthy.xrmobilitycoach.api.users.User;
import ie.noelmccarthy.xrmobilitycoach.api.users.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestcontainersConfiguration.class)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class LlmPersistenceIntegrationTests {

    @Autowired
    private UserRepository users;

    @Autowired
    private LlmLogRepository llmLogs;

    @Autowired
    private CoachConversationRepository conversations;

    @Autowired
    private CoachMessageRepository messages;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void persistsCoachConversationMessagesAndLlmLogs() {
        User user = users.save(new User("coach-test@example.com", "hashed-password"));
        CoachConversation conversation = conversations.save(new CoachConversation(user.getId()));
        CoachMessage message = messages.save(new CoachMessage(
                conversation.getId(),
                CoachMessageRole.USER,
                "I am stiff after work."
        ));
        LlmLog log = llmLogs.save(new LlmLog(
                user.getId(),
                objectMapper.createObjectNode().put("message", "I am stiff after work."),
                objectMapper.createObjectNode().put("reply", "Let's loosen up with a short mobility flow."),
                true
        ));

        assertThat(conversations.findByIdAndUserId(conversation.getId(), user.getId())).isPresent();
        assertThat(messages.findByConversationIdOrderByCreatedAtDesc(conversation.getId(), PageRequest.of(0, 10)))
                .extracting(CoachMessage::getId)
                .contains(message.getId());
        assertThat(log.getId()).isNotNull();
        assertThat(log.getRequestJson().get("message").asText()).isEqualTo("I am stiff after work.");
    }

    @Test
    void deletingConversationRemovesItsMessages() {
        User user = users.save(new User("coach-delete@example.com", "hashed-password"));
        CoachConversation conversation = conversations.save(new CoachConversation(user.getId()));
        messages.save(new CoachMessage(conversation.getId(), CoachMessageRole.USER, "Hello"));
        messages.save(new CoachMessage(conversation.getId(), CoachMessageRole.ASSISTANT, "Hi"));

        conversations.delete(conversation);
        conversations.flush();

        assertThat(conversations.findById(conversation.getId())).isEmpty();
        assertThat(messages.findByConversationIdOrderByCreatedAtAsc(conversation.getId())).isEmpty();
    }
}
