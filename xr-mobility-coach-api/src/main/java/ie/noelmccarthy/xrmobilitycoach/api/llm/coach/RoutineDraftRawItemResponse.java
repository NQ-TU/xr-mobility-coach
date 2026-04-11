package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import java.util.UUID;

/** Parsed raw item payload returned by the LLM before backend validation. */
record RoutineDraftRawItemResponse(
        UUID exerciseId,
        Integer sets,
        Integer repsOrHoldSeconds,
        String notes
) {}
