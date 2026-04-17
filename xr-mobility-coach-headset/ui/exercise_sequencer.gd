class_name ExerciseSequencer
extends RefCounted

enum FlowPhase {
	SAFETY,
	PREVIEW,
	COUNTDOWN,
	ACTIVE,
	REST,
	EXERCISE_RPE,
	COMPLETE,
}

const DEFAULT_REST_SECONDS := 30
const DEFAULT_WORK_SECONDS := 30
const PREPARE_COUNTDOWN_SECONDS := 3

var routine_detail: Dictionary = {}
var items: Array[Dictionary] = []
var current_exercise_index := 0
var current_set_index := 1
var phase: FlowPhase = FlowPhase.SAFETY
var phase_elapsed := 0.0
var session_elapsed := 0.0
var session_started_at := ""
var session_ended_at := ""
var overall_rpe := 6
var metrics: Array[Dictionary] = []
var rest_duration_seconds := DEFAULT_REST_SECONDS
var preview_playing := true
var is_paused := false
var animation_revision := 0

var _exercise_progress: Dictionary = {}
var _exercise_rpe: Dictionary = {}
var _pending_rpe_exercise_index := -1
var _skipped_steps := 0


# Resets the sequencer and loads a new routine definition.
func load_routine(detail: Dictionary) -> void:
	routine_detail = detail.duplicate(true)
	items.clear()
	metrics.clear()
	_exercise_progress.clear()
	_exercise_rpe.clear()
	_pending_rpe_exercise_index = -1
	_skipped_steps = 0
	current_exercise_index = 0
	current_set_index = 1
	phase = FlowPhase.SAFETY
	phase_elapsed = 0.0
	session_elapsed = 0.0
	session_started_at = ""
	session_ended_at = ""
	preview_playing = true
	is_paused = false

	var raw_items: Variant = routine_detail.get("items", [])
	if raw_items is Array:
		for raw_item in raw_items:
			if raw_item is Dictionary:
				items.append(raw_item.duplicate(true))

	items.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return int(a.get("sequenceIndex", 0)) < int(b.get("sequenceIndex", 0))
	)
	_bump_animation_revision()


# Confirms the safety gate and enters the first exercise preview.
func confirm_safety() -> bool:
	if items.is_empty():
		return false

	phase = FlowPhase.PREVIEW
	phase_elapsed = 0.0
	preview_playing = true
	is_paused = false
	_bump_animation_revision()
	return true


# Toggles preview playback for the current exercise demo.
func toggle_preview_playback() -> bool:
	if phase != FlowPhase.PREVIEW:
		return preview_playing

	preview_playing = not preview_playing
	return preview_playing


# Restarts the current preview demo from the beginning.
func replay_preview() -> void:
	if phase != FlowPhase.PREVIEW:
		return

	preview_playing = true
	phase_elapsed = 0.0
	_bump_animation_revision()


# Starts the prepare countdown before the first working set.
func start_active_set() -> bool:
	if phase != FlowPhase.PREVIEW or items.is_empty():
		return false

	if session_started_at.is_empty():
		session_started_at = _utc_timestamp_now()

	phase = FlowPhase.COUNTDOWN
	phase_elapsed = 0.0
	is_paused = false
	return true


# Pauses or resumes countdown, active, and rest phases.
func toggle_pause() -> bool:
	if phase != FlowPhase.COUNTDOWN and phase != FlowPhase.ACTIVE and phase != FlowPhase.REST:
		return is_paused

	is_paused = not is_paused
	return is_paused


# Restarts the current active set timer.
func restart_active_set() -> bool:
	if phase != FlowPhase.ACTIVE:
		return false

	phase_elapsed = 0.0
	is_paused = false
	_bump_animation_revision()
	return true


# Restarts the short prepare countdown before a set.
func restart_prepare_countdown() -> bool:
	if phase != FlowPhase.COUNTDOWN:
		return false

	phase_elapsed = 0.0
	is_paused = false
	_bump_animation_revision()
	return true


# Skips the prepare countdown and starts the set immediately.
func skip_prepare_countdown() -> bool:
	if phase != FlowPhase.COUNTDOWN:
		return false

	_begin_active_phase()
	return true


# Skips the current set and records it as skipped.
func skip_current_set() -> bool:
	if phase != FlowPhase.ACTIVE:
		return false

	_complete_current_set(true)
	return true


# Skips the current rest period and begins the next set countdown.
func skip_rest() -> bool:
	if phase != FlowPhase.REST:
		return false

	_begin_next_set_after_rest()
	return true


# Finishes the current exercise and advances to the next step.
func finish_current_exercise() -> bool:
	if items.is_empty():
		return false

	if phase != FlowPhase.COUNTDOWN and phase != FlowPhase.ACTIVE and phase != FlowPhase.REST and phase != FlowPhase.EXERCISE_RPE:
		return false

	if session_started_at.is_empty():
		session_started_at = _utc_timestamp_now()

	if phase == FlowPhase.EXERCISE_RPE:
		_confirm_exercise_rpe(overall_rpe)
		return true

	var target_exercise_index := current_exercise_index
	while phase != FlowPhase.COMPLETE and current_exercise_index == target_exercise_index:
		match phase:
			FlowPhase.COUNTDOWN:
				_begin_active_phase()
				_complete_current_set(true)
			FlowPhase.ACTIVE:
				_complete_current_set(true)
			FlowPhase.REST:
				_begin_next_set_after_rest()
				_begin_active_phase()
				_complete_current_set(true)
			FlowPhase.EXERCISE_RPE:
				_confirm_exercise_rpe(overall_rpe)
			_:
				break

	if phase == FlowPhase.EXERCISE_RPE:
		_confirm_exercise_rpe(overall_rpe)

	return true


# Completes the session, optionally marking remaining work as skipped.
func finish_session(mark_remaining_skipped: bool) -> void:
	if phase == FlowPhase.COMPLETE:
		return

	if session_started_at.is_empty() and mark_remaining_skipped:
		session_started_at = _utc_timestamp_now()

	if mark_remaining_skipped:
		while phase != FlowPhase.COMPLETE:
			match phase:
				FlowPhase.SAFETY:
					break
				FlowPhase.PREVIEW:
					phase = FlowPhase.COUNTDOWN
					phase_elapsed = 0.0
					is_paused = false
					_begin_active_phase()
					_complete_current_set(true)
				FlowPhase.COUNTDOWN:
					_begin_active_phase()
					_complete_current_set(true)
				FlowPhase.ACTIVE:
					_complete_current_set(true)
				FlowPhase.REST:
					_begin_next_set_after_rest()
					_begin_active_phase()
					_complete_current_set(true)
				FlowPhase.EXERCISE_RPE:
					_confirm_exercise_rpe(overall_rpe)
				_:
					break

	if not session_started_at.is_empty():
		session_ended_at = _utc_timestamp_now()
	phase = FlowPhase.COMPLETE
	phase_elapsed = 0.0
	is_paused = false
	_bump_animation_revision()


# Advances timers and phase transitions during active playback.
func tick(delta: float) -> void:
	if phase == FlowPhase.SAFETY or phase == FlowPhase.COMPLETE or phase == FlowPhase.EXERCISE_RPE:
		return

	if not session_started_at.is_empty() and not is_paused:
		session_elapsed += delta

	match phase:
		FlowPhase.PREVIEW:
			if preview_playing:
				phase_elapsed += delta
		FlowPhase.COUNTDOWN:
			if is_paused:
				return
			phase_elapsed += delta
			if phase_elapsed >= float(PREPARE_COUNTDOWN_SECONDS):
				_begin_active_phase()
		FlowPhase.ACTIVE:
			if is_paused:
				return
			phase_elapsed += delta
			if phase_elapsed >= float(get_work_duration_seconds()):
				_complete_current_set(false)
		FlowPhase.REST:
			if is_paused:
				return
			phase_elapsed += delta
			if phase_elapsed >= float(rest_duration_seconds):
				_begin_next_set_after_rest()
		FlowPhase.EXERCISE_RPE:
			return
		_:
			return


# Returns whether the session has started timing yet.
func has_started() -> bool:
	return not session_started_at.is_empty()


# Returns whether the full routine has been completed.
func is_complete() -> bool:
	return phase == FlowPhase.COMPLETE


# Returns a user-facing label for the current sequencer phase.
func get_phase_label() -> String:
	match phase:
		FlowPhase.SAFETY:
			return "Safety Check"
		FlowPhase.PREVIEW:
			return "Preview"
		FlowPhase.COUNTDOWN:
			return "Starting In" if not is_paused else "Countdown Paused"
		FlowPhase.ACTIVE:
			return "Active" if not is_paused else "Active Paused"
		FlowPhase.REST:
			return "Rest" if not is_paused else "Rest Paused"
		FlowPhase.EXERCISE_RPE:
			return "Exercise Feedback"
		_:
			return "Complete"


# Returns the current exercise item being processed.
func get_current_item() -> Dictionary:
	if current_exercise_index < 0 or current_exercise_index >= items.size():
		return {}
	return items[current_exercise_index]


# Returns the total number of sets for the current exercise.
func get_current_set_total() -> int:
	return _get_item_set_count(get_current_item())


# Returns the number of exercises in the loaded routine.
func get_total_exercises() -> int:
	return items.size()


# Returns the total number of sets across the routine.
func get_total_sets() -> int:
	var total := 0
	for item in items:
		total += _get_item_set_count(item)
	return total


# Returns how many set metrics have been recorded.
func get_completed_sets() -> int:
	return metrics.size()


# Returns how many sets are recorded for one exercise.
func get_completed_sets_for_exercise(index: int) -> int:
	return int(_exercise_progress.get(index, 0))


# Returns the recorded RPE for a finished exercise.
func get_recorded_rpe_for_exercise(index: int) -> int:
	return int(_exercise_rpe.get(index, 0))


# Returns how many sets were skipped during the session.
func get_skipped_sets() -> int:
	return _skipped_steps


# Returns the target reps or hold duration for an exercise.
func get_target_value(item: Dictionary = {}) -> int:
	var resolved_item: Dictionary = item if not item.is_empty() else get_current_item()
	return max(0, int(resolved_item.get("repsOrHoldSeconds", resolved_item.get("targetReps", resolved_item.get("holdSeconds", 0)))))


# Returns the work duration used for the active timer.
func get_work_duration_seconds(item: Dictionary = {}) -> int:
	var value: int = get_target_value(item)
	return value if value > 0 else DEFAULT_WORK_SECONDS


# Guesses whether an exercise should be treated like a hold.
func is_hold_item(item: Dictionary = {}) -> bool:
	var resolved_item: Dictionary = item if not item.is_empty() else get_current_item()
	var text: String = "%s %s" % [
		str(resolved_item.get("exerciseName", resolved_item.get("name", ""))),
		str(resolved_item.get("coachingNotes", resolved_item.get("notes", ""))),
	]
	text = text.to_lower()
	return text.contains("hold") or text.contains("stretch") or get_target_value(resolved_item) >= 20


# Returns the formatted target label shown in the UI.
func get_target_label(item: Dictionary = {}) -> String:
	var resolved_item: Dictionary = item if not item.is_empty() else get_current_item()
	var value: int = get_target_value(resolved_item)
	if value <= 0:
		value = DEFAULT_WORK_SECONDS

	if is_hold_item(resolved_item):
		return "%s sec hold" % String.num_int64(value)

	return "%s sec effort" % String.num_int64(value)


# Returns the live timer label for the current phase.
func get_timer_label() -> String:
	match phase:
		FlowPhase.COUNTDOWN:
			var countdown_remaining: float = max(0.0, float(PREPARE_COUNTDOWN_SECONDS) - phase_elapsed)
			return _format_clock(countdown_remaining)
		FlowPhase.ACTIVE:
			var active_remaining: float = max(0.0, float(get_work_duration_seconds()) - phase_elapsed)
			return _format_clock(active_remaining)
		FlowPhase.REST:
			var rest_remaining: float = max(0.0, float(rest_duration_seconds) - phase_elapsed)
			return _format_clock(rest_remaining)
		_:
			return "--:--"


# Returns the total duration of the current timed phase.
func get_current_phase_duration_seconds() -> float:
	match phase:
		FlowPhase.COUNTDOWN:
			return float(PREPARE_COUNTDOWN_SECONDS)
		FlowPhase.ACTIVE:
			return float(get_work_duration_seconds())
		FlowPhase.REST:
			return float(rest_duration_seconds)
		_:
			return 0.0


# Returns how much time remains in the current timed phase.
func get_current_phase_remaining_seconds() -> float:
	var duration: float = get_current_phase_duration_seconds()
	if duration <= 0.0:
		return 0.0
	return max(0.0, duration - phase_elapsed)


# Returns the normalized progress value for countdown rings.
func get_current_phase_progress_ratio() -> float:
	var duration: float = get_current_phase_duration_seconds()
	if duration <= 0.0:
		return 0.0
	return clampf(get_current_phase_remaining_seconds() / duration, 0.0, 1.0)


# Returns the main countdown display text for the UI.
func get_countdown_display_text() -> String:
	match phase:
		FlowPhase.COUNTDOWN:
			var remaining_seconds: int = int(ceil(get_current_phase_remaining_seconds()))
			if remaining_seconds < 1:
				remaining_seconds = 1
			return String.num_int64(remaining_seconds)
		FlowPhase.ACTIVE, FlowPhase.REST:
			return get_timer_label()
		_:
			return "--"


# Returns the formatted elapsed session time.
func get_session_elapsed_label() -> String:
	return _format_clock(session_elapsed)


# Builds the backend submission payload from recorded metrics.
func build_submission_payload() -> Dictionary:
	if routine_detail.is_empty() or metrics.is_empty():
		return {}

	if session_started_at.is_empty():
		session_started_at = _utc_timestamp_now()
	if session_ended_at.is_empty():
		session_ended_at = _utc_timestamp_now()

	return {
		"routineId": str(routine_detail.get("id", "")),
		"startedAt": session_started_at,
		"endedAt": session_ended_at,
		"overallRpe": _calculate_overall_rpe(),
		"metrics": metrics.duplicate(true),
	}


# Builds a compact summary used by the completion UI.
func build_summary() -> Dictionary:
	return {
		"routineTitle": str(routine_detail.get("title", "Routine")),
		"completedSets": get_completed_sets() - get_skipped_sets(),
		"skippedSets": get_skipped_sets(),
		"totalSets": get_total_sets(),
		"totalExercises": get_total_exercises(),
		"durationSeconds": int(round(session_elapsed)),
	}


# Records the current set result and advances the flow.
func _complete_current_set(skipped: bool) -> void:
	if items.is_empty():
		return

	var item: Dictionary = get_current_item()
	if item.is_empty():
		return

	var metric: Dictionary = {
		"exerciseId": str(item.get("exerciseId", "")),
		"setIndex": current_set_index,
		"completed": not skipped,
		"skipped": skipped,
	}

	if is_hold_item(item):
		metric["timeUnderTension"] = 0 if skipped else get_work_duration_seconds(item)
	else:
		metric["repsCompleted"] = 0 if skipped else get_target_value(item)

	var notes: String = str(item.get("coachingNotes", item.get("notes", ""))).strip_edges()
	if not notes.is_empty():
		metric["notes"] = notes

	metrics.append(metric)
	_exercise_progress[current_exercise_index] = get_completed_sets_for_exercise(current_exercise_index) + 1
	if skipped:
		_skipped_steps += 1

	phase_elapsed = 0.0
	is_paused = false
	preview_playing = true

	if current_set_index < get_current_set_total():
		current_set_index += 1
		phase = FlowPhase.REST
		return

	current_set_index = 1
	_pending_rpe_exercise_index = current_exercise_index
	phase = FlowPhase.EXERCISE_RPE


# Records the RPE for the current exercise feedback step.
func confirm_exercise_rpe(rpe: int) -> bool:
	if phase != FlowPhase.EXERCISE_RPE:
		return false

	_confirm_exercise_rpe(rpe)
	return true


# Starts the next set countdown after a rest period.
func _begin_next_set_after_rest() -> void:
	phase = FlowPhase.COUNTDOWN
	phase_elapsed = 0.0
	is_paused = false


# Starts the active work phase for the current set.
func _begin_active_phase() -> void:
	phase = FlowPhase.ACTIVE
	phase_elapsed = 0.0
	is_paused = false


# Saves exercise RPE and advances to the next exercise or completion.
func _confirm_exercise_rpe(rpe: int) -> void:
	var exercise_index: int = _pending_rpe_exercise_index if _pending_rpe_exercise_index >= 0 else current_exercise_index
	var clamped_rpe: int = clampi(rpe, 1, 10)
	overall_rpe = clamped_rpe
	_exercise_rpe[exercise_index] = clamped_rpe
	_apply_exercise_rpe_to_metrics(exercise_index, clamped_rpe)
	_pending_rpe_exercise_index = -1
	phase_elapsed = 0.0
	is_paused = false
	preview_playing = true

	if exercise_index < items.size() - 1:
		current_exercise_index = exercise_index + 1
		current_set_index = 1
		phase = FlowPhase.PREVIEW
		_bump_animation_revision()
		return

	session_ended_at = _utc_timestamp_now()
	phase = FlowPhase.COMPLETE


# Applies the saved exercise RPE to all matching set metrics.
func _apply_exercise_rpe_to_metrics(exercise_index: int, rpe: int) -> void:
	if exercise_index < 0 or exercise_index >= items.size():
		return

	var item: Dictionary = items[exercise_index]
	var exercise_id: String = str(item.get("exerciseId", "")).strip_edges()
	if exercise_id.is_empty():
		return

	for index in range(metrics.size()):
		var metric_variant: Variant = metrics[index]
		if not (metric_variant is Dictionary):
			continue
		var metric: Dictionary = metric_variant
		if str(metric.get("exerciseId", "")).strip_edges() != exercise_id:
			continue
		metric["exerciseRpe"] = rpe
		metrics[index] = metric


# Calculates overall RPE from the completed exercise ratings.
func _calculate_overall_rpe() -> int:
	if _exercise_rpe.is_empty():
		return overall_rpe

	var total := 0
	var count := 0
	for value_variant in _exercise_rpe.values():
		total += int(value_variant)
		count += 1

	if count <= 0:
		return overall_rpe

	return clampi(int(round(float(total) / float(count))), 1, 10)


# Returns the number of sets configured for an item.
func _get_item_set_count(item: Dictionary) -> int:
	return max(1, int(item.get("sets", item.get("setCount", 1))))


# Formats a duration as minutes and seconds.
func _format_clock(seconds: float) -> String:
	var total_seconds: int = max(0, int(round(seconds)))
	var minutes: int = int(total_seconds / 60)
	var remainder: int = total_seconds % 60
	return "%02d:%02d" % [minutes, remainder]


# Builds a UTC timestamp string for backend submission.
func _utc_timestamp_now() -> String:
	var dt: Dictionary = Time.get_datetime_dict_from_system(true)
	return "%04d-%02d-%02dT%02d:%02d:%02dZ" % [
		dt["year"],
		dt["month"],
		dt["day"],
		dt["hour"],
		dt["minute"],
		dt["second"],
	]


# Increments the animation revision to restart coach playback.
func _bump_animation_revision() -> void:
	animation_revision += 1
