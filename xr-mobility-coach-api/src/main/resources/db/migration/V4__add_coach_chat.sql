CREATE TABLE coach_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_conversations_user_id_updated_at
    ON coach_conversations(user_id, updated_at DESC);

CREATE TABLE coach_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
    role varchar(20) NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_coach_messages_role CHECK (role IN ('USER', 'ASSISTANT'))
);

CREATE INDEX idx_coach_messages_conversation_id_created_at
    ON coach_messages(conversation_id, created_at, id);
