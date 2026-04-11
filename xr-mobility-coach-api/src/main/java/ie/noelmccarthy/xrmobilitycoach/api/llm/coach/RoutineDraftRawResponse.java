package ie.noelmccarthy.xrmobilitycoach.api.llm.coach;

import java.util.List;

/** Parsed raw draft payload returned by the LLM before backend validation. */
record RoutineDraftRawResponse(
        String title,
        String targetArea,
        List<RoutineDraftRawItemResponse> items
) {}
