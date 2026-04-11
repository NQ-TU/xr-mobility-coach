package ie.noelmccarthy.xrmobilitycoach.api.llm.coach.dto;

/** Supported routine-generation intents for the structured builder flow. */
public enum RoutineType {
    MOBILITY("Mobility flow"),
    WARMUP("Warm-up"),
    RECOVERY("Recovery reset"),
    COOLDOWN("Cool-down");

    private final String promptLabel;

    RoutineType(String promptLabel) {
        this.promptLabel = promptLabel;
    }

    public String promptLabel() {
        return promptLabel;
    }
}
