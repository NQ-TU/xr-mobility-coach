CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Users
-- =========================
CREATE TABLE users (
                       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                       email varchar(255) NOT NULL UNIQUE,
                       password_hash varchar(255) NOT NULL,
                       created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- User profile
-- =========================
CREATE TABLE user_profiles (
                               id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                               user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                               preferred_session_length int,
                               training_experience varchar(100),
                               target_areas varchar(255),
                               notes text,
                               created_at timestamptz NOT NULL DEFAULT now(),
                               updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- =========================
-- Exercise catalogue
-- =========================
CREATE TABLE exercises (
                           id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                           name varchar(255) NOT NULL,
                           description text,
                           muscle_group varchar(100),
                           difficulty int,
                           default_hold_time_or_reps int,
                           animation_asset_id varchar(255),
                           created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- Routines
-- =========================
CREATE TABLE routines (
                          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          title varchar(255) NOT NULL,
                          target_area varchar(100),
                          estimated_duration int,
                          created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_routines_user_id ON routines(user_id);

-- =========================
-- Routine exercises
-- =========================
CREATE TABLE routine_exercises (
                                   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                                   routine_id uuid NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
                                   exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
                                   sequence_index int NOT NULL,
                                   sets int,
                                   reps_or_hold_seconds int NOT NULL,
                                   tempo varchar(50),
                                   coaching_notes text,
                                   created_at timestamptz NOT NULL DEFAULT now(),
                                   CONSTRAINT uq_routine_sequence UNIQUE (routine_id, sequence_index)
);

CREATE INDEX idx_routine_exercises_routine_id ON routine_exercises(routine_id);
CREATE INDEX idx_routine_exercises_exercise_id ON routine_exercises(exercise_id);

-- =========================
-- Sessions
-- =========================
CREATE TABLE sessions (
                          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          routine_id uuid REFERENCES routines(id) ON DELETE SET NULL,
                          started_at timestamptz NOT NULL DEFAULT now(),
                          ended_at timestamptz,
                          overall_rpe int
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_routine_id ON sessions(routine_id);

-- =========================
-- Session exercise metrics
-- =========================
CREATE TABLE session_exercise_metrics (
                                          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                                          session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                                          exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
                                          set_index int NOT NULL DEFAULT 0,
                                          completed boolean NOT NULL DEFAULT true,
                                          skipped boolean NOT NULL DEFAULT false,
                                          reps_completed int,
                                          time_under_tension numeric,
                                          exercise_rpe int,
                                          notes text,
                                          created_at timestamptz NOT NULL DEFAULT now(),
                                          CONSTRAINT uq_session_exercise UNIQUE (session_id, exercise_id, set_index)
);

CREATE INDEX idx_sem_session_id ON session_exercise_metrics(session_id);
CREATE INDEX idx_sem_exercise_id ON session_exercise_metrics(exercise_id);

-- =========================
-- LLM logs
-- =========================
CREATE TABLE llm_logs (
                          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          created_at timestamptz NOT NULL DEFAULT now(),
                          request_json jsonb NOT NULL,
                          response_json jsonb,
                          is_valid boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_llm_logs_user_id ON llm_logs(user_id);
