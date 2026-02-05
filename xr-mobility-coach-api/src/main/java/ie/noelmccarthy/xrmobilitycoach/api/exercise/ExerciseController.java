package ie.noelmccarthy.xrmobilitycoach.api.exercise;

import ie.noelmccarthy.xrmobilitycoach.api.exercise.dto.ExerciseResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Endpoints for the exercise catalogue. */
@RestController
@RequestMapping("/api/exercises")
public class ExerciseController {

    private final ExerciseService exercises;

    public ExerciseController(ExerciseService exercises) {
        this.exercises = exercises;
    }

    @GetMapping
    /** List exercises, optionally filtered by muscle group and difficulty. */
    public Page<ExerciseResponse> list(@RequestParam(required = false, name = "q") String nameQuery,
                                       @RequestParam(required = false) String muscleGroup,
                                       @RequestParam(required = false) Integer difficulty,
                                       @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return exercises.list(nameQuery, muscleGroup, difficulty, pageable);
    }

    @GetMapping("/{id}")
    /** Fetch a single exercise by id. */
    public ExerciseResponse get(@PathVariable UUID id) {
        return exercises.getById(id);
    }
}
