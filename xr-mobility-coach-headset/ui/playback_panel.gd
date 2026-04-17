class_name PlaybackPanelView
extends Control

signal back_requested()
signal submit_requested(payload: Dictionary, summary: Dictionary)
signal coach_state_changed(coach_state: Dictionary)
signal coach_move_requested()

const ERROR_COLOR := Color(0.74, 0.21, 0.27, 1.0)
const INFO_COLOR := Color(0.25, 0.33, 0.45, 1.0)
const SUCCESS_COLOR := Color(0.04, 0.49, 0.33, 1.0)
const SAFETY_MESSAGE := "Please ensure you have sufficient space available and will remain mindful of your surroundings. Be prepared to move your body and importantly, continue only if you feel physically able."
const COUNTDOWN_RING_SCRIPT := preload("res://ui/circular_countdown.gd")
const DEFAULT_SESSION_PANE_MINIMUM_WIDTH := 430.0
const FULL_HEADER_TITLE_SIZE := 28
const FULL_EXERCISE_TITLE_SIZE := 24
const FULL_EXERCISE_SUBTITLE_SIZE := 15
const FULL_STAT_VALUE_SIZE := 18
const FULL_CARD_LABEL_SIZE := 13
const FULL_STATUS_SIZE := 15
const MINIMAL_HEADER_TITLE_SIZE := 22
const MINIMAL_EXERCISE_TITLE_SIZE := 38
const MINIMAL_EXERCISE_SUBTITLE_SIZE := 18
const MINIMAL_PRIMARY_VALUE_SIZE := 30
const MINIMAL_TIMER_VALUE_SIZE := 52
const MINIMAL_SESSION_TIME_SIZE := 32
const MINIMAL_CARD_LABEL_SIZE := 15
const PREPARE_RING_COLOR := Color(0.341176, 0.372549, 0.94902, 1.0)
const ACTIVE_RING_COLOR := Color(0.341176, 0.372549, 0.94902, 1.0)
const REST_RING_COLOR := Color(0.152941, 0.662745, 0.647059, 1.0)
const SECONDARY_BUTTON_FONT_COLOR := Color(0.117647, 0.278431, 0.341176, 1.0)
const PRIMARY_BUTTON_FONT_COLOR := Color(1, 1, 1, 1)
const SUCCESS_BUTTON_FONT_COLOR := Color(1, 1, 1, 1)
const COMPLETION_BODY_COLOR := Color(0.180392, 0.270588, 0.360784, 1.0)
const COMPLETION_LABEL_COLOR := Color(0.372549, 0.482353, 0.588235, 1.0)
const COMPLETION_VALUE_COLOR := Color(0.0823529, 0.129412, 0.207843, 1.0)
const EXERCISE_SUBTITLE_COLOR := Color(0.180392, 0.270588, 0.360784, 1.0)
const EXERCISE_NOTES_COLOR := Color(0.317647, 0.403922, 0.490196, 1.0)

@onready var title_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/Header/TitleColumn/TitleLabel
@onready var header_subtitle_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/Header/TitleColumn/SubtitleLabel
@onready var user_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/Header/MetaColumn/UserLabel
@onready var state_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/Header/MetaColumn/StateLabel
@onready var move_hint_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/Header/MetaColumn/MoveHintLabel
@onready var back_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/Header/ActionRow/BackButton
@onready var finish_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/Header/ActionRow/FinishButton
@onready var header_row: HBoxContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/Header
@onready var body_row: HBoxContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow

@onready var session_column: VBoxContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn
@onready var session_pane: VBoxContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane
@onready var current_exercise_eyebrow: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/CurrentExerciseEyebrow
@onready var current_exercise_title: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/CurrentExerciseTitle
@onready var current_exercise_subtitle: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/CurrentExerciseSubtitle
@onready var current_exercise_notes: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/CurrentExerciseNotes
@onready var stat_grid: GridContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid
@onready var exercise_progress_card: PanelContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/ExerciseProgressCard
@onready var progress_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/ExerciseProgressCard/ProgressMargin/ProgressColumn/ProgressLabel
@onready var progress_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/ExerciseProgressCard/ProgressMargin/ProgressColumn/ProgressValue
@onready var progress_caption: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/ExerciseProgressCard/ProgressMargin/ProgressColumn/ProgressCaption
@onready var set_progress_card: PanelContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/SetProgressCard
@onready var set_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/SetProgressCard/SetMargin/SetColumn/SetLabel
@onready var set_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/SetProgressCard/SetMargin/SetColumn/SetValue
@onready var set_caption: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/SetProgressCard/SetMargin/SetColumn/SetCaption
@onready var target_card: PanelContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/TargetCard
@onready var target_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/TargetCard/TargetMargin/TargetColumn/TargetLabel
@onready var target_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/TargetCard/TargetMargin/TargetColumn/TargetValue
@onready var target_caption: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/TargetCard/TargetMargin/TargetColumn/TargetCaption
@onready var timer_card: PanelContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/TimerCard
@onready var timer_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/TimerCard/TimerMargin/TimerColumn/TimerLabel
@onready var timer_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/TimerCard/TimerMargin/TimerColumn/TimerValue
@onready var timer_caption: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/TimerCard/TimerMargin/TimerColumn/TimerCaption
@onready var session_time_card: PanelContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/SessionTimeCard
@onready var session_time_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/SessionTimeCard/SessionTimeMargin/SessionTimeColumn/SessionTimeLabel
@onready var session_time_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/SessionTimeCard/SessionTimeMargin/SessionTimeColumn/SessionTimeValue
@onready var session_time_caption: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/SessionTimeCard/SessionTimeMargin/SessionTimeColumn/SessionTimeCaption
@onready var live_state_card: PanelContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/LiveStateCard
@onready var live_state_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/LiveStateCard/LiveStateMargin/LiveStateColumn/LiveStateLabel
@onready var live_state_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/LiveStateCard/LiveStateMargin/LiveStateColumn/LiveStateValue
@onready var live_state_caption: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatGrid/LiveStateCard/LiveStateMargin/LiveStateColumn/LiveStateCaption
@onready var start_pause_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/ControlsRow/StartPauseButton
@onready var complete_set_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/ControlsRow/CompleteSetButton
@onready var skip_set_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/ControlsRow/SkipSetButton
@onready var effort_card: PanelContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/EffortCard
@onready var effort_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/EffortCard/EffortMargin/EffortRow/EffortLabel
@onready var decrease_rpe_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/EffortCard/EffortMargin/EffortRow/DecreaseRpeButton
@onready var effort_value_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/EffortCard/EffortMargin/EffortRow/EffortValueLabel
@onready var increase_rpe_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/EffortCard/EffortMargin/EffortRow/IncreaseRpeButton
@onready var status_card: PanelContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatusCard
@onready var status_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SessionPane/SessionCard/SessionMargin/SessionColumn/StatusCard/StatusMargin/StatusLabel

@onready var sequence_pane: VBoxContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SequencePane
@onready var routine_title: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SequencePane/SequenceCard/SequenceMargin/SequenceColumn/TopRow/DetailHeader/RoutineTitle
@onready var routine_subtitle: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SequencePane/SequenceCard/SequenceMargin/SequenceColumn/TopRow/DetailHeader/RoutineSubtitle
@onready var target_summary_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SequencePane/SequenceCard/SequenceMargin/SequenceColumn/SummaryGrid/TargetCard/TargetMargin/TargetColumn/TargetValue
@onready var duration_summary_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SequencePane/SequenceCard/SequenceMargin/SequenceColumn/SummaryGrid/DurationCard/DurationMargin/DurationColumn/DurationValue
@onready var exercise_count_summary_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SequencePane/SequenceCard/SequenceMargin/SequenceColumn/SummaryGrid/ExerciseCountCard/ExerciseCountMargin/ExerciseCountColumn/ExerciseCountValue
@onready var exercise_hint_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SequencePane/SequenceCard/SequenceMargin/SequenceColumn/ExerciseHeader/ExerciseHintLabel
@onready var exercise_scroll_up_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SequencePane/SequenceCard/SequenceMargin/SequenceColumn/ExerciseHeader/ExerciseScrollUpButton
@onready var exercise_scroll_down_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SequencePane/SequenceCard/SequenceMargin/SequenceColumn/ExerciseHeader/ExerciseScrollDownButton
@onready var exercise_scroll: ScrollContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SequencePane/SequenceCard/SequenceMargin/SequenceColumn/ExerciseScroll
@onready var exercise_list: VBoxContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/SequencePane/SequenceCard/SequenceMargin/SequenceColumn/ExerciseScroll/ExerciseList

@onready var completion_card: PanelContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/CompletionCard
@onready var completion_column: VBoxContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/CompletionCard/CompletionMargin/CompletionColumn
@onready var completion_status_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/CompletionCard/CompletionMargin/CompletionColumn/CompletionStatusLabel
@onready var completion_scroll: ScrollContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/CompletionCard/CompletionMargin/CompletionColumn/CompletionScroll
@onready var completion_summary_label: RichTextLabel = $CenterContainer/GlassPanel/ContentMargin/RootColumn/CompletionCard/CompletionMargin/CompletionColumn/CompletionScroll/CompletionSummaryLabel
@onready var completion_back_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/CompletionCard/CompletionMargin/CompletionColumn/CompletionActionRow/BackToLibraryButton

var _sequencer := ExerciseSequencer.new()
var _is_busy := false
var _submitted := false
var _last_phase := -1
var _last_submission_payload: Dictionary = {}
var _selected_coach_id := ""
var _last_coach_state_signature := ""

var _exercise_current_style: StyleBoxFlat
var _exercise_pending_style: StyleBoxFlat
var _exercise_completed_style: StyleBoxFlat
var _placeholder_card_style: StyleBoxFlat
var _step_badge_style: StyleBoxFlat
var _secondary_button_style: StyleBoxFlat
var _primary_button_style: StyleBoxFlat
var _success_button_style: StyleBoxFlat
var _completion_card_style: StyleBoxFlat
var _countdown_hero: CenterContainer
var _countdown_ring: Control
var _countdown_state_label: Label
var _countdown_value_label: Label
var _countdown_caption_label: Label
var _completion_top_row: HBoxContainer
var _completion_routine_value_label: Label
var _completion_time_value_label: Label
var _completion_sets_value_label: Label
var _completion_rpe_value_label: Label


# Initializes the playback UI and connects all interaction handlers.
func _ready() -> void:
	_build_dynamic_styles()
	_build_countdown_hero()
	_build_completion_layout()
	completion_summary_label.add_theme_color_override("default_color", COMPLETION_BODY_COLOR)
	completion_summary_label.add_theme_color_override("font_color", COMPLETION_BODY_COLOR)
	completion_summary_label.add_theme_font_size_override("normal_font_size", 16)
	current_exercise_subtitle.add_theme_color_override("font_color", EXERCISE_SUBTITLE_COLOR)
	current_exercise_notes.add_theme_color_override("font_color", EXERCISE_NOTES_COLOR)
	move_hint_label.text = "Tip: hold B or Y to reposition this panel. Hold A or X to reposition your coach."

	back_button.button_down.connect(_on_back_button_down)
	finish_button.button_down.connect(_on_finish_button_down)
	start_pause_button.button_down.connect(_on_start_pause_button_down)
	complete_set_button.button_down.connect(_on_complete_set_button_down)
	skip_set_button.button_down.connect(_on_skip_set_button_down)
	decrease_rpe_button.button_down.connect(_on_decrease_rpe_button_down)
	increase_rpe_button.button_down.connect(_on_increase_rpe_button_down)
	exercise_scroll_up_button.button_down.connect(_on_exercise_scroll_up_button_down)
	exercise_scroll_down_button.button_down.connect(_on_exercise_scroll_down_button_down)
	completion_back_button.button_down.connect(_on_back_button_down)

	_set_completion_visible(false)
	_set_effort_value(6)
	_reset_view("Select a routine from the library to begin playback tracking.")
	set_process(true)


# Advances the sequencer and refreshes the panel while visible.
func _process(delta: float) -> void:
	if not visible or _submitted:
		return

	_sequencer.tick(delta)
	_refresh_view()


# Updates the signed-in user label.
func set_user_email(email: String) -> void:
	user_label.text = "Signed in as %s" % email


# Stores the currently selected coach for playback state updates.
func set_selected_coach(coach_id: String) -> void:
	_selected_coach_id = coach_id.strip_edges()
	_emit_coach_state(true)


# Loads a routine into the sequencer and resets the playback view.
func load_routine(detail: Dictionary) -> void:
	_submitted = false
	_last_phase = -1
	_last_submission_payload.clear()
	_last_coach_state_signature = ""
	_set_completion_visible(false)
	_sequencer.load_routine(detail)
	_set_effort_value(_sequencer.overall_rpe)
	exercise_scroll.scroll_vertical = 0
	_refresh_view(true)


# Toggles loading state across the playback controls.
func set_busy(next_busy: bool, status_text := "") -> void:
	_is_busy = next_busy
	if not status_text.is_empty():
		set_status(status_text, false)
	_update_button_states()


# Shows a status message in the playback panel.
func set_status(text: String, is_error := false) -> void:
	status_label.text = text
	status_label.modulate = ERROR_COLOR if is_error else INFO_COLOR


# Switches the panel into its completion summary state.
func show_submission_success(summary: Dictionary, _response_data: Dictionary) -> void:
	_submitted = true
	_is_busy = false
	_set_completion_visible(true)

	completion_status_label.text = "Session submitted successfully. Your latest mobility session is now saved."
	completion_status_label.modulate = SUCCESS_COLOR

	_update_completion_metrics(summary)
	completion_summary_label.text = _build_completion_summary(summary)
	_update_button_states()


# Builds the detailed completion recap shown after submission.
func _build_completion_summary(_summary: Dictionary) -> String:
	var metrics_variant: Variant = _last_submission_payload.get("metrics", [])
	if not (metrics_variant is Array):
		return "[b]Exercise Recap[/b]\nSession data will appear here once a submission is available."

	var metrics: Array = metrics_variant
	var items_by_exercise_id: Dictionary = {}
	for item_variant in _sequencer.items:
		if item_variant is Dictionary:
			var item: Dictionary = item_variant
			var exercise_id: String = str(item.get("exerciseId", "")).strip_edges()
			if not exercise_id.is_empty():
				items_by_exercise_id[exercise_id] = item

	var grouped_lines: Dictionary = {}
	var exercise_order: Array[String] = []
	for metric_variant in metrics:
		if not (metric_variant is Dictionary):
			continue

		var metric: Dictionary = metric_variant
		var exercise_id: String = str(metric.get("exerciseId", "")).strip_edges()
		var item: Dictionary = {}
		var item_variant: Variant = items_by_exercise_id.get(exercise_id, {})
		if item_variant is Dictionary:
			item = item_variant

		var exercise_name: String = _extract_text(item, ["exerciseName", "title", "name"], "Exercise")
		if not grouped_lines.has(exercise_name):
			grouped_lines[exercise_name] = []
			exercise_order.append(exercise_name)

		var set_index: int = int(metric.get("setIndex", 0))
		var result_text: String = "completed"
		if bool(metric.get("skipped", false)):
			result_text = "skipped"

		var target_text: String = ""
		if metric.has("timeUnderTension"):
			target_text = "%s sec" % String.num_int64(int(metric.get("timeUnderTension", 0)))
		elif metric.has("repsCompleted"):
			target_text = "%s reps" % String.num_int64(int(metric.get("repsCompleted", 0)))

		var metric_line: String = "Set %s | %s" % [
			String.num_int64(set_index),
			result_text,
		]
		if not target_text.is_empty():
			metric_line += " | %s" % target_text

		var grouped_variant: Variant = grouped_lines.get(exercise_name, [])
		if grouped_variant is Array:
			var grouped: Array = grouped_variant
			grouped.append(metric_line)
			grouped_lines[exercise_name] = grouped

	var recap_lines: Array[String] = ["[b]Exercise Recap[/b]"]
	for exercise_name in exercise_order:
		var grouped_variant: Variant = grouped_lines.get(exercise_name, [])
		if not (grouped_variant is Array):
			continue

		var grouped: Array = grouped_variant
		recap_lines.append("")
		recap_lines.append("[b]%s[/b]" % exercise_name)
		for entry_variant in grouped:
			recap_lines.append(str(entry_variant))

	return "\n".join(recap_lines)


# Builds the high-level metric lines for the completion summary.
func _build_completion_metric_lines() -> Array[String]:
	var lines: Array[String] = []
	var metrics_variant: Variant = _last_submission_payload.get("metrics", [])
	if not (metrics_variant is Array):
		return lines

	var metrics: Array = metrics_variant
	var items_by_exercise_id: Dictionary = {}
	for item_variant in _sequencer.items:
		if item_variant is Dictionary:
			var item: Dictionary = item_variant
			var exercise_id: String = str(item.get("exerciseId", "")).strip_edges()
			if not exercise_id.is_empty():
				items_by_exercise_id[exercise_id] = item

	for metric_variant in metrics:
		if not (metric_variant is Dictionary):
			continue

		var metric: Dictionary = metric_variant
		var exercise_id: String = str(metric.get("exerciseId", "")).strip_edges()
		var item: Dictionary = {}
		var item_variant: Variant = items_by_exercise_id.get(exercise_id, {})
		if item_variant is Dictionary:
			item = item_variant
		var exercise_name: String = _extract_text(item, ["exerciseName", "title", "name"], "Exercise")
		var set_index: int = int(metric.get("setIndex", 0))
		var result_text: String = "completed"
		if bool(metric.get("skipped", false)):
			result_text = "skipped"

		var target_text: String = ""
		if metric.has("timeUnderTension"):
			target_text = "%s sec" % String.num_int64(int(metric.get("timeUnderTension", 0)))
		elif metric.has("repsCompleted"):
			target_text = "%s reps" % String.num_int64(int(metric.get("repsCompleted", 0)))

		var metric_line: String = "Set %s: %s" % [
			String.num_int64(set_index),
			result_text,
		]
		if not target_text.is_empty():
			metric_line += " • %s" % target_text

		lines.append("[b]%s[/b]\n%s" % [exercise_name, metric_line])

	return lines


# Restores the playback UI to its empty pre-routine state.
func _reset_view(message: String) -> void:
	sequence_pane.visible = true
	effort_card.visible = true
	status_card.visible = true
	_countdown_hero.visible = false
	header_subtitle_label.visible = true
	move_hint_label.visible = true
	exercise_scroll_up_button.visible = true
	exercise_scroll_down_button.visible = true
	exercise_progress_card.visible = true
	set_progress_card.visible = true
	target_card.visible = true
	timer_card.visible = true
	session_time_card.visible = true
	live_state_card.visible = true
	stat_grid.columns = 2
	session_pane.size_flags_horizontal = 0
	session_pane.custom_minimum_size = Vector2(DEFAULT_SESSION_PANE_MINIMUM_WIDTH, 0)
	title_label.add_theme_font_size_override("font_size", FULL_HEADER_TITLE_SIZE)
	current_exercise_eyebrow.add_theme_font_size_override("font_size", FULL_CARD_LABEL_SIZE)
	current_exercise_title.add_theme_font_size_override("font_size", FULL_EXERCISE_TITLE_SIZE)
	current_exercise_subtitle.add_theme_font_size_override("font_size", FULL_EXERCISE_SUBTITLE_SIZE)
	current_exercise_subtitle.add_theme_color_override("font_color", EXERCISE_SUBTITLE_COLOR)
	current_exercise_notes.add_theme_font_size_override("font_size", 14)
	current_exercise_notes.add_theme_color_override("font_color", EXERCISE_NOTES_COLOR)
	current_exercise_notes.visible = false
	progress_label.add_theme_font_size_override("font_size", FULL_CARD_LABEL_SIZE)
	progress_value.add_theme_font_size_override("font_size", FULL_STAT_VALUE_SIZE)
	set_label.add_theme_font_size_override("font_size", FULL_CARD_LABEL_SIZE)
	set_value.add_theme_font_size_override("font_size", FULL_STAT_VALUE_SIZE)
	target_label.add_theme_font_size_override("font_size", FULL_CARD_LABEL_SIZE)
	target_value.add_theme_font_size_override("font_size", FULL_STAT_VALUE_SIZE)
	timer_label.add_theme_font_size_override("font_size", FULL_CARD_LABEL_SIZE)
	timer_value.add_theme_font_size_override("font_size", FULL_STAT_VALUE_SIZE)
	session_time_label.add_theme_font_size_override("font_size", FULL_CARD_LABEL_SIZE)
	session_time_value.add_theme_font_size_override("font_size", FULL_STAT_VALUE_SIZE)
	live_state_label.add_theme_font_size_override("font_size", FULL_CARD_LABEL_SIZE)
	live_state_value.add_theme_font_size_override("font_size", FULL_STAT_VALUE_SIZE)
	progress_caption.visible = true
	set_caption.visible = true
	target_caption.visible = true
	timer_caption.visible = true
	session_time_caption.visible = true
	live_state_caption.visible = true
	current_exercise_eyebrow.text = "Current Exercise"
	routine_title.text = "Guided Session"
	routine_subtitle.text = message
	current_exercise_title.text = "No routine selected"
	current_exercise_subtitle.text = message
	current_exercise_notes.text = ""
	progress_value.text = "-"
	set_value.text = "-"
	target_value.text = "-"
	timer_value.text = "--:--"
	session_time_value.text = "00:00"
	live_state_value.text = "Ready"
	target_summary_value.text = "-"
	duration_summary_value.text = "-"
	exercise_count_summary_value.text = "-"
	exercise_hint_label.text = "Exercise sequence will appear here once a routine starts."
	state_label.text = "Phase: Ready"
	_clear_container(exercise_list)
	_add_placeholder_card(message)
	set_status(message, false)
	_update_button_states()
	_emit_coach_state(true)


# Refreshes all visible playback labels, cards, and buttons.
func _refresh_view(force_status := false) -> void:
	var detail: Dictionary = _sequencer.routine_detail
	if detail.is_empty():
		_reset_view("Select a routine from the library to begin playback tracking.")
		return

	var items: Array[Dictionary] = _sequencer.items
	var current_item: Dictionary = _sequencer.get_current_item()
	var coaching_notes: String = _extract_text(current_item, ["coachingNotes", "notes", "description"], "")
	var title: String = _extract_text(detail, ["title", "name"], "Routine")
	var target_text: String = _extract_text(detail, ["targetArea", "target", "muscleGroup"], "-")
	var estimated_duration: String = _extract_text(detail, ["estimatedDuration", "durationMinutes", "duration"], "-")
	var exercise_count: int = max(items.size(), _extract_detail_count(detail))

	routine_title.text = title
	routine_subtitle.text = "Target %s | Estimated %s min | %s" % [
		target_text,
		estimated_duration,
		_format_count(exercise_count, "exercise", "exercises"),
	]

	target_summary_value.text = target_text
	duration_summary_value.text = ("%s min" % estimated_duration) if estimated_duration != "-" else "-"
	exercise_count_summary_value.text = str(exercise_count)

	_apply_phase_copy(current_item)
	_apply_phase_layout()
	_update_current_exercise_notes(coaching_notes)
	_rebuild_exercise_cards()
	_update_live_labels()
	_update_countdown_hero(current_item)
	_apply_phase_status(force_status)
	_emit_coach_state()


# Updates titles and helper copy for the current playback phase.
func _apply_phase_copy(current_item: Dictionary) -> void:
	match _sequencer.phase:
		ExerciseSequencer.FlowPhase.SAFETY:
			current_exercise_eyebrow.text = "Safety Check"
			current_exercise_title.text = "Confirm Safe Space"
			current_exercise_subtitle.text = SAFETY_MESSAGE
		ExerciseSequencer.FlowPhase.PREVIEW:
			current_exercise_eyebrow.text = "Exercise Preview"
			current_exercise_title.text = _extract_text(current_item, ["exerciseName", "title", "name"], "Exercise Preview")
			current_exercise_subtitle.text = "Preview the coaches demonstration, understand the movement, and press 'I'm Ready' when you feel prepared to begin."
		ExerciseSequencer.FlowPhase.COUNTDOWN:
			current_exercise_eyebrow.text = "Starting In"
			current_exercise_title.text = _extract_text(current_item, ["exerciseName", "title", "name"], "Get Ready")
			current_exercise_subtitle.text = "Prepare yourself for this set."
		ExerciseSequencer.FlowPhase.ACTIVE:
			current_exercise_eyebrow.text = "Active Set"
			current_exercise_title.text = _extract_text(current_item, ["exerciseName", "title", "name"], "Active Set")
			current_exercise_subtitle.text = "Follow along now. The set countdown is running and the session timer is live."
		ExerciseSequencer.FlowPhase.REST:
			current_exercise_eyebrow.text = "Rest Timer"
			current_exercise_title.text = _extract_text(current_item, ["exerciseName", "title", "name"], "Rest Between Sets")
			current_exercise_subtitle.text = "Recover now. The next set will start when the rest countdown finishes."
		ExerciseSequencer.FlowPhase.EXERCISE_RPE:
			current_exercise_eyebrow.text = "Exercise Feedback"
			current_exercise_title.text = _extract_text(current_item, ["exerciseName", "title", "name"], "Exercise Feedback")
			current_exercise_subtitle.text = "Enter an RPE for that exercise and the sets you just completed, then continue to the next preview."
		ExerciseSequencer.FlowPhase.COMPLETE:
			current_exercise_eyebrow.text = "Session Complete"
			current_exercise_title.text = "Session Complete"
			current_exercise_subtitle.text = "Review the summary and submit your recorded session."


# Switches between full and minimal playback layouts by phase.
func _apply_phase_layout() -> void:
	var is_minimal_phase: bool = (
		_sequencer.phase == ExerciseSequencer.FlowPhase.COUNTDOWN
		or _sequencer.phase == ExerciseSequencer.FlowPhase.ACTIVE
		or _sequencer.phase == ExerciseSequencer.FlowPhase.REST
	)

	sequence_pane.visible = not is_minimal_phase
	effort_card.visible = _sequencer.phase == ExerciseSequencer.FlowPhase.EXERCISE_RPE
	status_card.visible = not is_minimal_phase
	header_subtitle_label.visible = not is_minimal_phase
	move_hint_label.visible = not is_minimal_phase
	exercise_scroll_up_button.visible = not is_minimal_phase
	exercise_scroll_down_button.visible = not is_minimal_phase
	exercise_progress_card.visible = true
	set_progress_card.visible = true
	target_card.visible = not is_minimal_phase
	timer_card.visible = not is_minimal_phase
	session_time_card.visible = true
	live_state_card.visible = not is_minimal_phase
	stat_grid.columns = 3 if is_minimal_phase else 2

	session_pane.size_flags_horizontal = Control.SIZE_EXPAND_FILL if is_minimal_phase else 0
	session_pane.custom_minimum_size = Vector2(0, 0) if is_minimal_phase else Vector2(DEFAULT_SESSION_PANE_MINIMUM_WIDTH, 0)

	title_label.add_theme_font_size_override(
		"font_size",
		MINIMAL_HEADER_TITLE_SIZE if is_minimal_phase else FULL_HEADER_TITLE_SIZE
	)
	current_exercise_eyebrow.add_theme_font_size_override(
		"font_size",
		MINIMAL_CARD_LABEL_SIZE if is_minimal_phase else FULL_CARD_LABEL_SIZE
	)
	current_exercise_title.add_theme_font_size_override(
		"font_size",
		MINIMAL_EXERCISE_TITLE_SIZE if is_minimal_phase else FULL_EXERCISE_TITLE_SIZE
	)
	current_exercise_subtitle.add_theme_font_size_override(
		"font_size",
		MINIMAL_EXERCISE_SUBTITLE_SIZE if is_minimal_phase else FULL_EXERCISE_SUBTITLE_SIZE
	)
	current_exercise_subtitle.add_theme_color_override("font_color", EXERCISE_SUBTITLE_COLOR)
	current_exercise_notes.add_theme_font_size_override("font_size", 15 if is_minimal_phase else 14)
	current_exercise_notes.add_theme_color_override("font_color", EXERCISE_NOTES_COLOR)

	var card_label_size: int = MINIMAL_CARD_LABEL_SIZE if is_minimal_phase else FULL_CARD_LABEL_SIZE
	var primary_value_size: int = MINIMAL_PRIMARY_VALUE_SIZE if is_minimal_phase else FULL_STAT_VALUE_SIZE

	progress_label.add_theme_font_size_override("font_size", card_label_size)
	progress_value.add_theme_font_size_override("font_size", primary_value_size)
	progress_caption.visible = not is_minimal_phase

	set_label.add_theme_font_size_override("font_size", card_label_size)
	set_value.add_theme_font_size_override("font_size", primary_value_size)
	set_caption.visible = not is_minimal_phase

	target_label.add_theme_font_size_override("font_size", card_label_size)
	target_value.add_theme_font_size_override("font_size", primary_value_size)
	target_caption.visible = not is_minimal_phase

	timer_label.add_theme_font_size_override("font_size", card_label_size)
	timer_value.add_theme_font_size_override(
		"font_size",
		MINIMAL_TIMER_VALUE_SIZE if is_minimal_phase else FULL_STAT_VALUE_SIZE
	)
	timer_caption.visible = not is_minimal_phase

	session_time_label.add_theme_font_size_override("font_size", card_label_size)
	session_time_value.add_theme_font_size_override(
		"font_size",
		MINIMAL_SESSION_TIME_SIZE if is_minimal_phase else FULL_STAT_VALUE_SIZE
	)
	session_time_caption.visible = not is_minimal_phase

	live_state_label.add_theme_font_size_override("font_size", card_label_size)
	live_state_value.add_theme_font_size_override("font_size", primary_value_size)
	live_state_caption.visible = not is_minimal_phase

	status_label.add_theme_font_size_override("font_size", FULL_STATUS_SIZE)
	effort_label.text = "Exercise RPE" if _sequencer.phase == ExerciseSequencer.FlowPhase.EXERCISE_RPE else "Overall RPE"


# Shows or hides the coach notes for the active exercise.
func _update_current_exercise_notes(coaching_notes: String) -> void:
	var show_notes: bool = (
		not coaching_notes.is_empty()
		and _sequencer.phase != ExerciseSequencer.FlowPhase.SAFETY
		and _sequencer.phase != ExerciseSequencer.FlowPhase.COMPLETE
	)
	current_exercise_notes.visible = show_notes
	current_exercise_notes.text = coaching_notes if show_notes else ""


# Updates live exercise, timer, and progress labels.
func _update_live_labels() -> void:
	var total_exercises: int = _sequencer.get_total_exercises()
	var exercise_index: int = 0 if total_exercises == 0 else min(_sequencer.current_exercise_index + 1, total_exercises)
	var current_item: Dictionary = _sequencer.get_current_item()

	state_label.text = "Phase: %s" % _sequencer.get_phase_label()
	live_state_value.text = _sequencer.get_phase_label()
	session_time_value.text = _sequencer.get_session_elapsed_label()
	session_time_label.text = "Global Time"

	match _sequencer.phase:
		ExerciseSequencer.FlowPhase.SAFETY:
			timer_label.text = "Countdown"
			progress_value.text = "0 / %s" % String.num_int64(total_exercises)
			set_value.text = "-"
			target_value.text = "-"
			timer_value.text = "--:--"
			exercise_hint_label.text = "Confirm the safety message to begin guided preview mode."
		ExerciseSequencer.FlowPhase.PREVIEW:
			timer_label.text = "Preview Timer"
			progress_value.text = "%s / %s" % [String.num_int64(exercise_index), String.num_int64(total_exercises)]
			set_value.text = "%s / %s" % [
				String.num_int64(_sequencer.current_set_index),
				String.num_int64(_sequencer.get_current_set_total()),
			]
			target_value.text = _sequencer.get_target_label(current_item)
			timer_value.text = "--:--"
			exercise_hint_label.text = "Previewing exercise %s of %s. Preview is %s." % [
				String.num_int64(exercise_index),
				String.num_int64(total_exercises),
				"playing" if _sequencer.preview_playing else "paused",
			]
		ExerciseSequencer.FlowPhase.COUNTDOWN:
			timer_label.text = "Starting In"
			progress_value.text = "%s / %s" % [String.num_int64(exercise_index), String.num_int64(total_exercises)]
			set_value.text = "%s / %s" % [
				String.num_int64(_sequencer.current_set_index),
				String.num_int64(_sequencer.get_current_set_total()),
			]
			target_value.text = _sequencer.get_target_label(current_item)
			timer_value.text = _sequencer.get_timer_label()
			exercise_hint_label.text = "Short setup countdown before the next working set."
		ExerciseSequencer.FlowPhase.ACTIVE:
			timer_label.text = "Work Countdown"
			progress_value.text = "%s / %s" % [String.num_int64(exercise_index), String.num_int64(total_exercises)]
			set_value.text = "%s / %s" % [
				String.num_int64(_sequencer.current_set_index),
				String.num_int64(_sequencer.get_current_set_total()),
			]
			target_value.text = _sequencer.get_target_label(current_item)
			timer_value.text = _sequencer.get_timer_label()
			exercise_hint_label.text = "Set %s of %s is in progress. Countdown ends automatically." % [
				String.num_int64(_sequencer.current_set_index),
				String.num_int64(_sequencer.get_current_set_total()),
			]
		ExerciseSequencer.FlowPhase.REST:
			timer_label.text = "Rest Countdown"
			progress_value.text = "%s / %s" % [String.num_int64(exercise_index), String.num_int64(total_exercises)]
			set_value.text = "%s / %s" % [
				String.num_int64(_sequencer.current_set_index),
				String.num_int64(_sequencer.get_current_set_total()),
			]
			target_value.text = "%s sec rest" % String.num_int64(_sequencer.rest_duration_seconds)
			timer_value.text = _sequencer.get_timer_label()
			exercise_hint_label.text = "Rest timer running. The next set will begin automatically."
		ExerciseSequencer.FlowPhase.EXERCISE_RPE:
			timer_label.text = "Feedback"
			progress_value.text = "%s / %s" % [String.num_int64(exercise_index), String.num_int64(total_exercises)]
			set_value.text = "%s / %s" % [
				String.num_int64(_sequencer.get_completed_sets_for_exercise(_sequencer.current_exercise_index)),
				String.num_int64(_sequencer.get_current_set_total()),
			]
			target_value.text = "Rate 1 - 10"
			timer_value.text = "Saved"
			exercise_hint_label.text = "Enter an RPE for the exercise you just completed before moving on."
		ExerciseSequencer.FlowPhase.COMPLETE:
			timer_label.text = "Countdown"
			progress_value.text = "%s / %s" % [String.num_int64(total_exercises), String.num_int64(total_exercises)]
			set_value.text = "%s / %s" % [
				String.num_int64(_sequencer.get_completed_sets()),
				String.num_int64(_sequencer.get_total_sets()),
			]
			target_value.text = "Recorded"
			timer_value.text = "00:00"
			exercise_hint_label.text = "Session tracking complete. Submit your session when ready."

	_update_button_states()


# Updates the footer status text for the current phase.
func _apply_phase_status(force_status: bool) -> void:
	var phase_value: int = int(_sequencer.phase)
	if not force_status and phase_value == _last_phase:
		return

	_last_phase = phase_value
	match _sequencer.phase:
		ExerciseSequencer.FlowPhase.SAFETY:
			set_status("Confirm that your space is clear and that you feel physically able before beginning.", false)
		ExerciseSequencer.FlowPhase.PREVIEW:
			set_status("Preview the movement, replay it if needed, then press 'I'm Ready' to begin the timed set.", false)
		ExerciseSequencer.FlowPhase.COUNTDOWN:
			set_status("Countdown running. The next working set will begin automatically.", false)
		ExerciseSequencer.FlowPhase.ACTIVE:
			set_status("Active set running. Pause, restart, or skip if needed.", false)
		ExerciseSequencer.FlowPhase.REST:
			set_status("Rest timer running. A short start countdown will follow automatically.", false)
		ExerciseSequencer.FlowPhase.EXERCISE_RPE:
			set_status("Enter an RPE for the exercise you just completed.", false)
		ExerciseSequencer.FlowPhase.COMPLETE:
			set_status("Session complete. Review your session summary and submit it when ready.", false)


# Creates the circular countdown widget used in minimal playback.
func _build_countdown_hero() -> void:
	_countdown_hero = CenterContainer.new()
	_countdown_hero.visible = false
	_countdown_hero.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_countdown_hero.custom_minimum_size = Vector2(0, 280)
	_countdown_hero.mouse_filter = Control.MOUSE_FILTER_IGNORE

	_countdown_ring = COUNTDOWN_RING_SCRIPT.new()
	_countdown_ring.custom_minimum_size = Vector2(252, 252)
	_countdown_ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_countdown_ring.set("progress", 1.0)
	_countdown_hero.add_child(_countdown_ring)

	var overlay := CenterContainer.new()
	overlay.anchor_right = 1.0
	overlay.anchor_bottom = 1.0
	overlay.offset_left = 0.0
	overlay.offset_top = 0.0
	overlay.offset_right = 0.0
	overlay.offset_bottom = 0.0
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_countdown_ring.add_child(overlay)

	var label_column := VBoxContainer.new()
	label_column.alignment = BoxContainer.ALIGNMENT_CENTER
	label_column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label_column.add_theme_constant_override("separation", 4)
	overlay.add_child(label_column)

	_countdown_state_label = Label.new()
	_countdown_state_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_countdown_state_label.add_theme_color_override("font_color", INFO_COLOR)
	_countdown_state_label.add_theme_font_size_override("font_size", 16)
	label_column.add_child(_countdown_state_label)

	_countdown_value_label = Label.new()
	_countdown_value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_countdown_value_label.add_theme_color_override("font_color", Color(0.0823529, 0.129412, 0.207843, 1))
	_countdown_value_label.add_theme_font_size_override("font_size", 42)
	label_column.add_child(_countdown_value_label)

	_countdown_caption_label = Label.new()
	_countdown_caption_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_countdown_caption_label.add_theme_color_override("font_color", INFO_COLOR)
	_countdown_caption_label.add_theme_font_size_override("font_size", 14)
	_countdown_caption_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label_column.add_child(_countdown_caption_label)

	session_column.add_child(_countdown_hero)
	var subtitle_index: int = current_exercise_subtitle.get_index()
	session_column.move_child(_countdown_hero, subtitle_index + 1)


# Refreshes the circular countdown widget for the current phase.
func _update_countdown_hero(current_item: Dictionary) -> void:
	var show_hero: bool = (
		_sequencer.phase == ExerciseSequencer.FlowPhase.COUNTDOWN
		or _sequencer.phase == ExerciseSequencer.FlowPhase.ACTIVE
		or _sequencer.phase == ExerciseSequencer.FlowPhase.REST
	)
	_countdown_hero.visible = show_hero

	if not show_hero:
		return

	_countdown_ring.set("progress", _sequencer.get_current_phase_progress_ratio())

	match _sequencer.phase:
		ExerciseSequencer.FlowPhase.COUNTDOWN:
			_countdown_ring.set("accent_color", PREPARE_RING_COLOR)
			_countdown_state_label.text = "Countdown Paused" if _sequencer.is_paused else "Starting In"
			_countdown_value_label.text = _sequencer.get_countdown_display_text()
			_countdown_caption_label.text = "Set %s begins in a moment." % String.num_int64(_sequencer.current_set_index)
		ExerciseSequencer.FlowPhase.ACTIVE:
			_countdown_ring.set("accent_color", ACTIVE_RING_COLOR)
			_countdown_state_label.text = "Work Paused" if _sequencer.is_paused else "Work"
			_countdown_value_label.text = _sequencer.get_countdown_display_text()
			_countdown_caption_label.text = _sequencer.get_target_label(current_item)
		ExerciseSequencer.FlowPhase.REST:
			_countdown_ring.set("accent_color", REST_RING_COLOR)
			_countdown_state_label.text = "Rest Paused" if _sequencer.is_paused else "Rest"
			_countdown_value_label.text = _sequencer.get_countdown_display_text()
			_countdown_caption_label.text = "Recover before the next set."
		_:
			_countdown_ring.set("accent_color", ACTIVE_RING_COLOR)
			_countdown_state_label.text = ""
			_countdown_value_label.text = ""
			_countdown_caption_label.text = ""


# Builds the reusable card and button styles for playback.
func _build_dynamic_styles() -> void:
	_secondary_button_style = _make_button_style(
		Color(0.929412, 0.972549, 0.984314, 0.8),
		Color(0.741176, 0.870588, 0.901961, 0.95),
		14,
		12.0,
		8.0
	)
	_primary_button_style = _make_button_style(
		Color(0.341176, 0.372549, 0.94902, 1.0),
		Color(0.341176, 0.372549, 0.94902, 1.0),
		16,
		16.0,
		9.0,
		Color(0.145098, 0.168627, 0.545098, 0.2),
		6
	)
	_success_button_style = _make_button_style(
		Color(0.152941, 0.662745, 0.647059, 1.0),
		Color(0.152941, 0.662745, 0.647059, 1.0),
		16,
		16.0,
		9.0,
		Color(0.054902, 0.337255, 0.313725, 0.18),
		6
	)
	_completion_card_style = _make_card_style(
		Color(0.94902, 0.984314, 0.992157, 0.92),
		Color(0.741176, 0.870588, 0.901961, 0.92),
		20
	)
	_exercise_pending_style = _make_card_style(
		Color(0.976471, 0.992157, 0.996078, 0.94),
		Color(1, 1, 1, 0.42),
		22
	)
	_exercise_current_style = _make_card_style(
		Color(0.934118, 0.972549, 0.996078, 0.98),
		Color(0.341176, 0.372549, 0.94902, 0.86),
		22
	)
	_exercise_completed_style = _make_card_style(
		Color(0.922353, 0.980392, 0.964706, 0.96),
		Color(0.466667, 0.823529, 0.682353, 0.84),
		22
	)
	_placeholder_card_style = _make_card_style(
		Color(0.94902, 0.984314, 0.992157, 0.82),
		Color(1, 1, 1, 0.34),
		22
	)
	_step_badge_style = StyleBoxFlat.new()
	_step_badge_style.bg_color = Color(0.862745, 0.937255, 0.992157, 1)
	_step_badge_style.corner_radius_top_left = 16
	_step_badge_style.corner_radius_top_right = 16
	_step_badge_style.corner_radius_bottom_right = 16
	_step_badge_style.corner_radius_bottom_left = 16
	_step_badge_style.content_margin_left = 10.0
	_step_badge_style.content_margin_top = 6.0
	_step_badge_style.content_margin_right = 10.0
	_step_badge_style.content_margin_bottom = 6.0


# Builds the summary card row used in the completion screen.
func _build_completion_layout() -> void:
	_completion_top_row = HBoxContainer.new()
	_completion_top_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_completion_top_row.add_theme_constant_override("separation", 12)
	completion_column.add_child(_completion_top_row)
	completion_column.move_child(_completion_top_row, completion_scroll.get_index())

	var routine_card: PanelContainer = _create_completion_card()
	routine_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	routine_card.size_flags_stretch_ratio = 1.8
	_completion_top_row.add_child(routine_card)
	_completion_routine_value_label = _populate_completion_card(routine_card, "Routine", "No routine selected", true)

	var stats_grid := GridContainer.new()
	stats_grid.columns = 3
	stats_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stats_grid.size_flags_stretch_ratio = 2.2
	stats_grid.add_theme_constant_override("h_separation", 12)
	stats_grid.add_theme_constant_override("v_separation", 12)
	_completion_top_row.add_child(stats_grid)

	_completion_time_value_label = _populate_completion_card(
		_add_completion_metric_card(stats_grid),
		"Tracked Time",
		"00:00"
	)
	_completion_sets_value_label = _populate_completion_card(
		_add_completion_metric_card(stats_grid),
		"Sets",
		"0 / 0"
	)
	_completion_rpe_value_label = _populate_completion_card(
		_add_completion_metric_card(stats_grid),
		"Overall RPE",
		"6 / 10"
	)


# Creates a single completion summary card shell.
func _create_completion_card() -> PanelContainer:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _completion_card_style.duplicate())
	return card


# Adds one metric card to the completion summary row.
func _add_completion_metric_card(parent: Control) -> PanelContainer:
	var card: PanelContainer = _create_completion_card()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	parent.add_child(card)
	return card


# Populates a completion card with a title and value label.
func _populate_completion_card(card: PanelContainer, label_text: String, value_text: String, wrap_value := false) -> Label:
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 16)
	card.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 6)
	margin.add_child(column)

	var label := Label.new()
	label.text = label_text
	label.add_theme_color_override("font_color", COMPLETION_LABEL_COLOR)
	label.add_theme_font_size_override("font_size", 13)
	column.add_child(label)

	var value := Label.new()
	value.text = value_text
	value.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap_value else TextServer.AUTOWRAP_OFF
	value.add_theme_color_override("font_color", COMPLETION_VALUE_COLOR)
	value.add_theme_font_size_override("font_size", 19 if wrap_value else 24)
	column.add_child(value)

	return value


# Updates the top-level metrics shown in the completion summary.
func _update_completion_metrics(summary: Dictionary) -> void:
	if _completion_routine_value_label == null:
		return

	_completion_routine_value_label.text = str(summary.get("routineTitle", "Routine"))
	_completion_time_value_label.text = _format_clock(float(summary.get("durationSeconds", 0)))
	_completion_sets_value_label.text = "%s / %s completed" % [
		String.num_int64(int(summary.get("completedSets", 0))),
		String.num_int64(int(summary.get("totalSets", 0))),
	]

	var overall_rpe: int = int(_last_submission_payload.get("overallRpe", _sequencer.overall_rpe))
	_completion_rpe_value_label.text = "%s / 10" % String.num_int64(overall_rpe)


# Creates a rounded card style for playback panels.
func _make_card_style(background: Color, border: Color, radius: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.border_color = border
	style.corner_radius_top_left = radius
	style.corner_radius_top_right = radius
	style.corner_radius_bottom_right = radius
	style.corner_radius_bottom_left = radius
	style.shadow_color = Color(0.0509804, 0.168627, 0.223529, 0.08)
	style.shadow_size = 8
	return style


# Creates a rounded button style for playback actions.
func _make_button_style(
	background: Color,
	border: Color,
	radius: int,
	margin_x: float,
	margin_y: float,
	shadow: Color = Color(0, 0, 0, 0),
	shadow_size := 0
) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.content_margin_left = margin_x
	style.content_margin_top = margin_y
	style.content_margin_right = margin_x
	style.content_margin_bottom = margin_y
	style.bg_color = background
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.border_color = border
	style.corner_radius_top_left = radius
	style.corner_radius_top_right = radius
	style.corner_radius_bottom_right = radius
	style.corner_radius_bottom_left = radius
	style.shadow_color = shadow
	style.shadow_size = shadow_size
	return style


# Applies a consistent style and font color to a button.
func _apply_button_style(button: Button, style: StyleBoxFlat, font_color: Color) -> void:
	button.add_theme_stylebox_override("normal", style)
	button.add_theme_stylebox_override("pressed", style)
	button.add_theme_stylebox_override("hover", style)
	button.add_theme_stylebox_override("focus", style)
	button.add_theme_stylebox_override("disabled", style)
	button.add_theme_color_override("font_color", font_color)
	button.add_theme_color_override("font_disabled_color", font_color)
	button.add_theme_color_override("font_hover_color", font_color)
	button.add_theme_color_override("font_pressed_color", font_color)


# Rebuilds the exercise sequence list on the right pane.
func _rebuild_exercise_cards() -> void:
	_clear_container(exercise_list)

	var items: Array[Dictionary] = _sequencer.items
	if items.is_empty():
		_add_placeholder_card("This routine has no exercise items yet.")
		return

	for index in items.size():
		exercise_list.add_child(_build_exercise_card(items[index], index))


# Builds one exercise card for the sequence list.
func _build_exercise_card(item: Dictionary, index: int) -> PanelContainer:
	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.custom_minimum_size = Vector2(0, 122)
	card.add_theme_stylebox_override("panel", _resolve_exercise_style(index, item))

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 18)
	card.add_child(margin)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	margin.add_child(row)

	var badge_panel := PanelContainer.new()
	badge_panel.add_theme_stylebox_override("panel", _step_badge_style)
	row.add_child(badge_panel)

	var badge_label := Label.new()
	badge_label.text = String.num_int64(int(item.get("sequenceIndex", index + 1)))
	badge_label.add_theme_color_override("font_color", Color(0.341176, 0.372549, 0.94902, 1))
	badge_label.add_theme_font_size_override("font_size", 18)
	badge_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	badge_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	badge_panel.add_child(badge_label)

	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 6)
	row.add_child(content)

	var title := Label.new()
	title.text = _extract_text(item, ["exerciseName", "title", "name"], "Exercise")
	title.add_theme_color_override("font_color", Color(0.0823529, 0.129412, 0.207843, 1))
	title.add_theme_font_size_override("font_size", 20)
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(title)

	var meta := Label.new()
	meta.text = _build_exercise_meta(item, index)
	meta.add_theme_color_override("font_color", INFO_COLOR)
	meta.add_theme_font_size_override("font_size", 15)
	meta.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(meta)

	var notes_text: String = _extract_text(item, ["coachingNotes", "notes", "description"], "")
	if not notes_text.is_empty():
		var notes := Label.new()
		notes.text = notes_text
		notes.add_theme_color_override("font_color", Color(0.317647, 0.403922, 0.490196, 1))
		notes.add_theme_font_size_override("font_size", 15)
		notes.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		content.add_child(notes)

	return card


# Chooses the card style for pending, current, or completed exercises.
func _resolve_exercise_style(index: int, item: Dictionary) -> StyleBoxFlat:
	var completed_sets_for_exercise: int = _sequencer.get_completed_sets_for_exercise(index)
	var total_sets_for_exercise: int = max(1, int(item.get("sets", item.get("setCount", 1))))
	if completed_sets_for_exercise >= total_sets_for_exercise:
		if index == _sequencer.current_exercise_index and _sequencer.phase == ExerciseSequencer.FlowPhase.EXERCISE_RPE:
			return _exercise_current_style
		return _exercise_completed_style
	if index == _sequencer.current_exercise_index and _sequencer.phase != ExerciseSequencer.FlowPhase.COMPLETE:
		return _exercise_current_style
	return _exercise_pending_style


# Formats the exercise progress line shown on each sequence card.
func _build_exercise_meta(item: Dictionary, index: int) -> String:
	var total_sets_for_exercise: int = max(1, int(item.get("sets", item.get("setCount", 1))))
	var completed_sets_for_exercise: int = _sequencer.get_completed_sets_for_exercise(index)
	var progress_text: String = "Completed %s / %s sets" % [
		String.num_int64(completed_sets_for_exercise),
		String.num_int64(total_sets_for_exercise),
	]
	if index == _sequencer.current_exercise_index and _sequencer.phase == ExerciseSequencer.FlowPhase.EXERCISE_RPE:
		progress_text = "Awaiting RPE | %s / %s sets" % [
			String.num_int64(completed_sets_for_exercise),
			String.num_int64(total_sets_for_exercise),
		]
	elif index == _sequencer.current_exercise_index and _sequencer.phase != ExerciseSequencer.FlowPhase.COMPLETE:
		progress_text = "Next set %s / %s" % [
			String.num_int64(_sequencer.current_set_index),
			String.num_int64(total_sets_for_exercise),
		]

	return "%s | %s | %s" % [
		_extract_text(item, ["targetArea", "muscleGroup", "target"], "-"),
		progress_text,
		_sequencer.get_target_label(item),
	]


# Clears all generated children from a container.
func _clear_container(container: Node) -> void:
	for child in container.get_children():
		child.queue_free()


# Adds a placeholder card when no exercise data is available.
func _add_placeholder_card(message: String) -> void:
	var placeholder := PanelContainer.new()
	placeholder.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	placeholder.custom_minimum_size = Vector2(0, 180)
	placeholder.add_theme_stylebox_override("panel", _placeholder_card_style)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 22)
	margin.add_theme_constant_override("margin_top", 22)
	margin.add_theme_constant_override("margin_right", 22)
	margin.add_theme_constant_override("margin_bottom", 22)
	placeholder.add_child(margin)

	var label := Label.new()
	label.text = message
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_color_override("font_color", INFO_COLOR)
	label.add_theme_font_size_override("font_size", 18)
	margin.add_child(label)

	exercise_list.add_child(placeholder)


# Updates button labels, availability, and styling by phase.
func _update_button_states() -> void:
	var has_routine: bool = not _sequencer.routine_detail.is_empty()
	var has_items: bool = not _sequencer.items.is_empty()

	_apply_button_style(start_pause_button, _primary_button_style, PRIMARY_BUTTON_FONT_COLOR)
	_apply_button_style(complete_set_button, _secondary_button_style, SECONDARY_BUTTON_FONT_COLOR)
	_apply_button_style(skip_set_button, _secondary_button_style, SECONDARY_BUTTON_FONT_COLOR)

	back_button.disabled = _is_busy
	completion_back_button.disabled = _is_busy
	exercise_scroll_up_button.disabled = _is_busy or not has_routine
	exercise_scroll_down_button.disabled = _is_busy or not has_routine
	decrease_rpe_button.disabled = _is_busy or _submitted or not has_routine or _sequencer.phase != ExerciseSequencer.FlowPhase.EXERCISE_RPE
	increase_rpe_button.disabled = _is_busy or _submitted or not has_routine or _sequencer.phase != ExerciseSequencer.FlowPhase.EXERCISE_RPE

	start_pause_button.disabled = _is_busy or _submitted or not has_routine
	complete_set_button.disabled = _is_busy or _submitted or not has_routine
	skip_set_button.disabled = _is_busy or _submitted or not has_routine
	finish_button.disabled = _is_busy or _submitted or not has_routine

	if not has_items:
		start_pause_button.disabled = true
		complete_set_button.disabled = true
		skip_set_button.disabled = true
		finish_button.disabled = true

	match _sequencer.phase:
		ExerciseSequencer.FlowPhase.SAFETY:
			start_pause_button.text = "I Understand"
			complete_set_button.text = "Replay"
			skip_set_button.text = "I'm Ready"
			complete_set_button.disabled = true
			skip_set_button.disabled = true
			finish_button.text = "Finish Session"
		ExerciseSequencer.FlowPhase.PREVIEW:
			_apply_button_style(start_pause_button, _secondary_button_style, SECONDARY_BUTTON_FONT_COLOR)
			_apply_button_style(skip_set_button, _success_button_style, SUCCESS_BUTTON_FONT_COLOR)
			start_pause_button.text = "Pause Demo" if _sequencer.preview_playing else "Play Demo"
			complete_set_button.text = "Replay"
			skip_set_button.text = "I'm Ready"
			finish_button.text = "Finish Session"
		ExerciseSequencer.FlowPhase.COUNTDOWN:
			start_pause_button.text = "Resume" if _sequencer.is_paused else "Pause Countdown"
			complete_set_button.text = "Restart Countdown"
			skip_set_button.text = "Start Now"
			finish_button.text = "Finish Exercise"
		ExerciseSequencer.FlowPhase.ACTIVE:
			start_pause_button.text = "Resume" if _sequencer.is_paused else "Pause"
			complete_set_button.text = "Restart Set"
			skip_set_button.text = "Skip Set"
			finish_button.text = "Finish Exercise"
		ExerciseSequencer.FlowPhase.REST:
			start_pause_button.text = "Resume" if _sequencer.is_paused else "Pause Rest"
			complete_set_button.text = "Skip Rest"
			skip_set_button.text = "Waiting"
			skip_set_button.disabled = true
			finish_button.text = "Finish Exercise"
		ExerciseSequencer.FlowPhase.EXERCISE_RPE:
			_apply_button_style(start_pause_button, _success_button_style, SUCCESS_BUTTON_FONT_COLOR)
			start_pause_button.text = "Save RPE & Continue"
			complete_set_button.text = "Recorded"
			skip_set_button.text = "Recorded"
			complete_set_button.disabled = true
			skip_set_button.disabled = true
			finish_button.text = "Finish Exercise"
		ExerciseSequencer.FlowPhase.COMPLETE:
			start_pause_button.text = "Session Complete"
			complete_set_button.text = "Recorded"
			skip_set_button.text = "Recorded"
			start_pause_button.disabled = true
			complete_set_button.disabled = true
			skip_set_button.disabled = true
			finish_button.text = "Submit Session"
			finish_button.disabled = _is_busy or _submitted or _sequencer.metrics.is_empty()

	if _submitted:
		finish_button.text = "Submitted"
		finish_button.disabled = true

	if not has_items:
		start_pause_button.text = "No Exercise Items"


# Emits coach playback state when it changes.
func _emit_coach_state(force := false) -> void:
	var coach_state: Dictionary = _build_coach_state()
	var signature: String = JSON.stringify(coach_state)
	if not force and signature == _last_coach_state_signature:
		return
	_last_coach_state_signature = signature
	emit_signal("coach_state_changed", coach_state)


# Builds the current coach playback instruction payload.
func _build_coach_state() -> Dictionary:
	var coach_state: Dictionary = {
		"coachId": _selected_coach_id,
		"visible": false,
		"mode": "hidden",
		"paused": false,
		"animationKey": "",
		"exerciseName": "",
		"revision": _sequencer.animation_revision,
		"phase": int(_sequencer.phase),
	}
	if _selected_coach_id.is_empty() or _sequencer.routine_detail.is_empty() or _sequencer.items.is_empty():
		return coach_state

	var current_item: Dictionary = _sequencer.get_current_item()
	if current_item.is_empty():
		coach_state["visible"] = true
		coach_state["mode"] = "idle"
		return coach_state

	coach_state["visible"] = true
	coach_state["exerciseName"] = _extract_text(current_item, ["exerciseName", "title", "name"], "Exercise")
	match _sequencer.phase:
		ExerciseSequencer.FlowPhase.PREVIEW:
			coach_state["mode"] = "exercise"
			coach_state["paused"] = not _sequencer.preview_playing
			coach_state["animationKey"] = _resolve_animation_key(current_item)
		ExerciseSequencer.FlowPhase.ACTIVE:
			coach_state["mode"] = "exercise"
			coach_state["paused"] = _sequencer.is_paused
			coach_state["animationKey"] = _resolve_animation_key(current_item)
		_:
			coach_state["mode"] = "idle"
	return coach_state


# Resolves the preferred animation key for an exercise item.
func _resolve_animation_key(item: Dictionary) -> String:
	var asset_id: String = _extract_text(item, ["animationAssetId"], "")
	if not asset_id.is_empty():
		return _normalize_animation_key(asset_id)
	return _normalize_animation_key(_extract_text(item, ["exerciseName", "title", "name"], ""))


# Normalizes animation keys for asset lookup.
func _normalize_animation_key(value: String) -> String:
	var normalized: String = value.to_lower().strip_edges()
	normalized = normalized.replace("-", "_")
	normalized = normalized.replace(" ", "_")
	normalized = normalized.replace("(", "")
	normalized = normalized.replace(")", "")
	normalized = normalized.replace(",", "")
	normalized = normalized.replace(".", "")
	normalized = normalized.replace("/", "_")
	while normalized.contains("__"):
		normalized = normalized.replace("__", "_")
	while normalized.begins_with("_"):
		normalized = normalized.substr(1)
	while normalized.ends_with("_"):
		normalized = normalized.left(normalized.length() - 1)
	return normalized


# Shows the completion summary and hides the live playback layout.
func _set_completion_visible(is_visible: bool) -> void:
	header_row.visible = not is_visible
	body_row.visible = not is_visible
	completion_card.visible = is_visible


# Updates the currently selected exercise RPE value.
func _set_effort_value(next_value: int) -> void:
	_sequencer.overall_rpe = clampi(next_value, 1, 10)
	effort_value_label.text = String.num_int64(_sequencer.overall_rpe)


# Extracts the first non-empty text value from a list of keys.
func _extract_text(record: Dictionary, keys: Array, fallback: String) -> String:
	for key in keys:
		if record.has(key):
			var text: String = str(record.get(key, "")).strip_edges()
			if not text.is_empty() and text != "<null>":
				return text
	return fallback


# Extracts an exercise count from a routine detail payload.
func _extract_detail_count(detail: Dictionary) -> int:
	for key in ["exerciseCount", "itemCount", "count"]:
		if detail.has(key):
			return max(0, int(detail.get(key, 0)))
	return _sequencer.items.size()


# Formats a singular or plural count label.
func _format_count(count: int, singular: String, plural: String) -> String:
	return "%s %s" % [count, singular if count == 1 else plural]


# Formats a duration as minutes and seconds.
func _format_clock(seconds: float) -> String:
	var total_seconds: int = max(0, int(round(seconds)))
	var minutes: int = int(total_seconds / 60)
	var remainder: int = total_seconds % 60
	return "%02d:%02d" % [minutes, remainder]


# Moves the exercise list scroll position by a fixed amount.
func _scroll_exercises(delta: int) -> void:
	var max_scroll: float = exercise_scroll.get_v_scroll_bar().max_value
	if max_scroll <= 0.0:
		return

	var next_scroll: float = clampf(float(exercise_scroll.scroll_vertical + delta), 0.0, max_scroll)
	exercise_scroll.scroll_vertical = int(next_scroll)


# Sends the user back out of playback.
func _on_back_button_down() -> void:
	emit_signal("back_requested")


# Handles finish session, finish exercise, or submit actions.
func _on_finish_button_down() -> void:
	if _submitted:
		return

	match _sequencer.phase:
		ExerciseSequencer.FlowPhase.SAFETY, ExerciseSequencer.FlowPhase.PREVIEW:
			_sequencer.finish_session(true)
			_refresh_view(true)
		ExerciseSequencer.FlowPhase.COUNTDOWN, ExerciseSequencer.FlowPhase.ACTIVE, ExerciseSequencer.FlowPhase.REST, ExerciseSequencer.FlowPhase.EXERCISE_RPE:
			if _sequencer.finish_current_exercise():
				set_status("Exercise finished early. Moving to the next preview.", false)
			_refresh_view(true)
		ExerciseSequencer.FlowPhase.COMPLETE:
			var payload: Dictionary = _sequencer.build_submission_payload()
			if payload.is_empty():
				set_status("No session metrics were recorded for submission.", true)
				return
			_last_submission_payload = payload.duplicate(true)
			emit_signal("submit_requested", payload, _sequencer.build_summary())
		_:
			return


# Handles the primary action for the current playback phase.
func _on_start_pause_button_down() -> void:
	if _sequencer.routine_detail.is_empty():
		set_status("Select a routine before starting playback.", true)
		return
	if _sequencer.items.is_empty():
		set_status("This routine has no exercise items to play through.", true)
		return

	match _sequencer.phase:
		ExerciseSequencer.FlowPhase.SAFETY:
			if _sequencer.confirm_safety():
				_refresh_view(true)
		ExerciseSequencer.FlowPhase.PREVIEW:
			_sequencer.toggle_preview_playback()
			set_status("Preview %s." % ("playing" if _sequencer.preview_playing else "paused"), false)
		ExerciseSequencer.FlowPhase.COUNTDOWN, ExerciseSequencer.FlowPhase.ACTIVE, ExerciseSequencer.FlowPhase.REST:
			var paused: bool = _sequencer.toggle_pause()
			set_status("%s %s." % [
				"Countdown" if _sequencer.phase == ExerciseSequencer.FlowPhase.COUNTDOWN else "Active set" if _sequencer.phase == ExerciseSequencer.FlowPhase.ACTIVE else "Rest timer",
				"paused" if paused else "resumed",
			], false)
		ExerciseSequencer.FlowPhase.EXERCISE_RPE:
			if _sequencer.confirm_exercise_rpe(_sequencer.overall_rpe):
				set_status("Exercise RPE recorded. Moving to the next exercise preview.", false)
		_:
			return

	_refresh_view()


# Handles the secondary action for replay, restart, or skip rest.
func _on_complete_set_button_down() -> void:
	match _sequencer.phase:
		ExerciseSequencer.FlowPhase.PREVIEW:
			_sequencer.replay_preview()
			set_status("Preview replayed from the start of the loop.", false)
		ExerciseSequencer.FlowPhase.COUNTDOWN:
			_sequencer.restart_prepare_countdown()
			set_status("Start countdown restarted.", false)
		ExerciseSequencer.FlowPhase.ACTIVE:
			_sequencer.restart_active_set()
			set_status("Set timer restarted.", false)
		ExerciseSequencer.FlowPhase.REST:
			_sequencer.skip_rest()
			set_status("Rest skipped. Start countdown began for the next set.", false)
		_:
			return

	_refresh_view()


# Handles ready, start now, and skip set actions.
func _on_skip_set_button_down() -> void:
	match _sequencer.phase:
		ExerciseSequencer.FlowPhase.PREVIEW:
			if _sequencer.start_active_set():
				set_status("Countdown started. The next set will begin automatically.", false)
		ExerciseSequencer.FlowPhase.COUNTDOWN:
			if _sequencer.skip_prepare_countdown():
				set_status("Countdown skipped. Working set started immediately.", false)
		ExerciseSequencer.FlowPhase.ACTIVE:
			if _sequencer.skip_current_set():
				set_status("Set skipped and recorded.", false)
		_:
			return

	_refresh_view()


# Lowers the selected exercise RPE.
func _on_decrease_rpe_button_down() -> void:
	_set_effort_value(_sequencer.overall_rpe - 1)


# Raises the selected exercise RPE.
func _on_increase_rpe_button_down() -> void:
	_set_effort_value(_sequencer.overall_rpe + 1)


# Scrolls the sequence list upward.
func _on_exercise_scroll_up_button_down() -> void:
	_scroll_exercises(-180)


# Scrolls the sequence list downward.
func _on_exercise_scroll_down_button_down() -> void:
	_scroll_exercises(180)
