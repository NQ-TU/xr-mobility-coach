class_name RoutineListPanelView
extends Control

signal refresh_requested()
signal logout_requested()
signal routine_selected(index: int)
signal start_requested()

const ERROR_COLOR := Color(0.74, 0.21, 0.27, 1.0)
const INFO_COLOR := Color(0.25, 0.33, 0.45, 1.0)

@onready var user_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/Header/MetaColumn/UserLabel
@onready var refresh_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/Header/ActionRow/RefreshButton
@onready var logout_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/Header/ActionRow/LogoutButton
@onready var routine_count_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/ListPane/ListCard/ListMargin/ListColumn/ListHeader/ListTitleRow/RoutineCountLabel
@onready var routine_list: VBoxContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/ListPane/ListCard/ListMargin/ListColumn/ListScroll/RoutineList
@onready var detail_title: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/DetailPane/DetailCard/DetailMargin/DetailColumn/TopRow/DetailHeader/RoutineTitle
@onready var detail_subtitle: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/DetailPane/DetailCard/DetailMargin/DetailColumn/TopRow/DetailHeader/RoutineSubtitle
@onready var target_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/DetailPane/DetailCard/DetailMargin/DetailColumn/StatGrid/TargetCard/TargetMargin/TargetColumn/TargetValue
@onready var duration_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/DetailPane/DetailCard/DetailMargin/DetailColumn/StatGrid/DurationCard/DurationMargin/DurationColumn/DurationValue
@onready var exercise_count_value: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/DetailPane/DetailCard/DetailMargin/DetailColumn/StatGrid/ExerciseCountCard/ExerciseCountMargin/ExerciseCountColumn/ExerciseCountValue
@onready var exercise_hint_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/DetailPane/DetailCard/DetailMargin/DetailColumn/ExerciseHeader/ExerciseHintLabel
@onready var exercise_scroll_up_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/DetailPane/DetailCard/DetailMargin/DetailColumn/ExerciseHeader/ExerciseScrollUpButton
@onready var exercise_scroll_down_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/DetailPane/DetailCard/DetailMargin/DetailColumn/ExerciseHeader/ExerciseScrollDownButton
@onready var exercise_scroll: ScrollContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/DetailPane/DetailCard/DetailMargin/DetailColumn/ExerciseScroll
@onready var exercise_list: VBoxContainer = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/DetailPane/DetailCard/DetailMargin/DetailColumn/ExerciseScroll/ExerciseList
@onready var status_label: Label = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/ListPane/StatusCard/StatusMargin/StatusLabel
@onready var start_button: Button = $CenterContainer/GlassPanel/ContentMargin/RootColumn/BodyRow/DetailPane/DetailCard/DetailMargin/DetailColumn/TopRow/StartButton

var is_busy := false
var _selected_index := -1
var _routines: Array = []
var _routine_buttons: Array[Button] = []

var _routine_style_normal: StyleBoxFlat
var _routine_style_hover: StyleBoxFlat
var _routine_style_selected: StyleBoxFlat
var _routine_style_disabled: StyleBoxFlat
var _exercise_card_style: StyleBoxFlat
var _placeholder_card_style: StyleBoxFlat
var _step_badge_style: StyleBoxFlat


# Initializes the routine library UI and connects button events.
func _ready() -> void:
	_build_dynamic_styles()

	start_button.disabled = true
	refresh_button.button_down.connect(_on_refresh_button_down)
	logout_button.button_down.connect(_on_logout_button_down)
	start_button.button_down.connect(_on_start_button_down)
	exercise_scroll_up_button.button_down.connect(_on_exercise_scroll_up_button_down)
	exercise_scroll_down_button.button_down.connect(_on_exercise_scroll_down_button_down)

	_reset_detail("Select a routine to inspect its exercises and prepare the session.")
	set_status("Loading routines...", false)


# Updates the signed-in user label.
func set_user_email(email: String) -> void:
	user_label.text = "Signed in as %s" % email


# Toggles loading state across the routine list controls.
func set_busy(next_busy: bool, status_text := "") -> void:
	is_busy = next_busy
	refresh_button.disabled = next_busy
	logout_button.disabled = next_busy

	for button in _routine_buttons:
		button.disabled = next_busy

	start_button.disabled = next_busy or _selected_index < 0
	exercise_scroll_up_button.disabled = next_busy
	exercise_scroll_down_button.disabled = next_busy

	if not status_text.is_empty():
		set_status(status_text, false)


# Shows a status message in the footer card.
func set_status(text: String, is_error := false) -> void:
	status_label.text = text
	status_label.modulate = ERROR_COLOR if is_error else INFO_COLOR


# Rebuilds the list when routine summaries are loaded.
func set_routines(routines: Array) -> void:
	_routines = routines.duplicate(true)
	_selected_index = -1
	_rebuild_routine_buttons()

	routine_count_label.text = _format_count(_routines.size(), "routine", "routines")
	start_button.disabled = true
	_reset_detail("Select a routine to inspect its structure and prepare the session.")
	exercise_scroll.scroll_vertical = 0

	if _routines.is_empty():
		_reset_detail("No routines are available yet for this account.")


# Marks a routine as selected and enables starting it.
func select_routine(index: int) -> void:
	if index < 0 or index >= _routines.size():
		return

	_selected_index = index
	_update_routine_button_states()
	start_button.disabled = is_busy


# Fills the detail pane with a full routine definition.
func set_routine_detail(detail: Dictionary) -> void:
	var title := _extract_detail_text(detail, ["title", "name"], "Routine preview")
	var target_text := _extract_detail_text(detail, ["targetArea", "target", "muscleGroup"], "-")
	var estimated_duration := _extract_detail_text(detail, ["estimatedDuration", "durationMinutes", "duration"], "-")
	var items: Array = _extract_detail_items(detail)
	var exercise_count: int = max(items.size(), _extract_detail_count(detail))

	detail_title.text = title
	detail_subtitle.text = "Target %s | Estimated %s min | %s" % [
		target_text,
		estimated_duration,
		_format_count(exercise_count, "exercise", "exercises"),
	]

	target_value.text = target_text
	duration_value.text = ("%s min" % estimated_duration) if estimated_duration != "-" else "-"
	exercise_count_value.text = str(exercise_count)
	exercise_hint_label.text = "%s shown below in sequence order." % _format_count(exercise_count, "exercise", "exercises")

	_rebuild_exercise_cards(items)
	exercise_scroll.scroll_vertical = 0
	start_button.disabled = is_busy or _selected_index < 0


# Clears the selected routine and restores placeholder copy.
func clear_selection() -> void:
	_selected_index = -1
	_update_routine_button_states()
	start_button.disabled = true
	_reset_detail("Select a routine to inspect its exercises and prepare the session.")


# Restores the detail panel to its empty placeholder state.
func _reset_detail(message: String) -> void:
	detail_title.text = "Routine preview"
	detail_subtitle.text = message
	target_value.text = "-"
	duration_value.text = "-"
	exercise_count_value.text = "-"
	exercise_hint_label.text = "Select a saved routine to preview the exercise sequence."
	_clear_container(exercise_list)
	_add_placeholder_card(message)
	exercise_scroll.scroll_vertical = 0


# Builds the reusable card and badge styles used by the panel.
func _build_dynamic_styles() -> void:
	_routine_style_normal = _make_card_style(
		Color(0.972549, 0.992157, 0.996078, 0.94),
		Color(1, 1, 1, 0.48),
		22
	)
	_apply_card_padding(_routine_style_normal, 18, 16)
	_routine_style_hover = _make_card_style(
		Color(0.956863, 0.988235, 0.996078, 0.98),
		Color(0.647059, 0.792157, 0.94902, 0.72),
		22
	)
	_apply_card_padding(_routine_style_hover, 18, 16)
	_routine_style_selected = _make_card_style(
		Color(0.913725, 0.960784, 0.996078, 0.98),
		Color(0.341176, 0.372549, 0.94902, 0.92),
		22
	)
	_apply_card_padding(_routine_style_selected, 18, 16)
	_routine_style_disabled = _make_card_style(
		Color(0.937255, 0.972549, 0.980392, 0.7),
		Color(0.760784, 0.85098, 0.886275, 0.5),
		22
	)
	_apply_card_padding(_routine_style_disabled, 18, 16)
	_exercise_card_style = _make_card_style(
		Color(0.976471, 0.992157, 0.996078, 0.94),
		Color(1, 1, 1, 0.42),
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


# Creates a rounded card style for routine and exercise panels.
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
	style.content_margin_left = 0.0
	style.content_margin_top = 0.0
	style.content_margin_right = 0.0
	style.content_margin_bottom = 0.0
	return style


# Applies shared padding values to a card style.
func _apply_card_padding(style: StyleBoxFlat, horizontal: int, vertical: int) -> void:
	style.content_margin_left = horizontal
	style.content_margin_right = horizontal
	style.content_margin_top = vertical
	style.content_margin_bottom = vertical


# Rebuilds the clickable routine buttons from the loaded list.
func _rebuild_routine_buttons() -> void:
	_clear_container(routine_list)
	_routine_buttons.clear()

	if _routines.is_empty():
		var empty_label := Label.new()
		empty_label.text = "No saved routines yet. Create one on the dashboard and it will appear here."
		empty_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		empty_label.add_theme_color_override("font_color", INFO_COLOR)
		empty_label.add_theme_font_size_override("font_size", 16)
		routine_list.add_child(empty_label)
		return

	for index in _routines.size():
		var routine: Dictionary = _routines[index]
		var button := Button.new()
		button.custom_minimum_size = Vector2(0, 92)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.text = "%s\n%s" % [
			_extract_detail_text(routine, ["title", "name"], "Untitled routine"),
			_build_routine_meta(routine),
		]
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.add_theme_font_size_override("font_size", 16)
		button.add_theme_color_override("font_color", Color(0.0823529, 0.129412, 0.207843, 1))
		button.add_theme_color_override("font_hover_color", Color(0.0823529, 0.129412, 0.207843, 1))
		button.add_theme_color_override("font_pressed_color", Color(0.0823529, 0.129412, 0.207843, 1))
		button.add_theme_color_override("font_disabled_color", Color(0.317647, 0.403922, 0.490196, 1))
		button.add_theme_stylebox_override("normal", _routine_style_normal)
		button.add_theme_stylebox_override("hover", _routine_style_hover)
		button.add_theme_stylebox_override("pressed", _routine_style_selected)
		button.add_theme_stylebox_override("focus", _routine_style_selected)
		button.add_theme_stylebox_override("disabled", _routine_style_disabled)
		button.button_down.connect(_on_routine_button_down.bind(index))
		routine_list.add_child(button)
		_routine_buttons.append(button)

	_update_routine_button_states()


# Updates routine button visuals to reflect the current selection.
func _update_routine_button_states() -> void:
	for index in _routine_buttons.size():
		var button := _routine_buttons[index]
		var selected := index == _selected_index
		button.add_theme_stylebox_override("normal", _routine_style_selected if selected else _routine_style_normal)
		button.add_theme_stylebox_override("hover", _routine_style_selected if selected else _routine_style_hover)
		button.add_theme_stylebox_override("focus", _routine_style_selected if selected else _routine_style_hover)


# Rebuilds the exercise preview cards for the selected routine.
func _rebuild_exercise_cards(items: Array) -> void:
	_clear_container(exercise_list)

	if items.is_empty():
		exercise_hint_label.text = "No exercise items were returned for this routine."
		_add_placeholder_card("This routine has no exercise items yet.")
		return

	for item in items:
		exercise_list.add_child(_build_exercise_card(item))


# Builds a single exercise preview card.
func _build_exercise_card(item: Dictionary) -> PanelContainer:
	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.custom_minimum_size = Vector2(0, 132)
	card.add_theme_stylebox_override("panel", _exercise_card_style)

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
	badge_label.text = String.num_int64(int(item.get("sequenceIndex", 1)))
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
	title.text = _extract_detail_text(item, ["exerciseName", "title", "name"], "Exercise")
	title.add_theme_color_override("font_color", Color(0.0823529, 0.129412, 0.207843, 1))
	title.add_theme_font_size_override("font_size", 20)
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(title)

	var meta := Label.new()
	meta.text = _build_exercise_meta(item)
	meta.add_theme_color_override("font_color", INFO_COLOR)
	meta.add_theme_font_size_override("font_size", 15)
	meta.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(meta)

	var notes_text := _extract_detail_text(item, ["coachingNotes", "notes", "description"], "")
	if not notes_text.is_empty():
		var notes := Label.new()
		notes.text = notes_text
		notes.add_theme_color_override("font_color", Color(0.317647, 0.403922, 0.490196, 1))
		notes.add_theme_font_size_override("font_size", 15)
		notes.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		content.add_child(notes)

	return card


# Formats the summary line shown inside each routine button.
func _build_routine_meta(routine: Dictionary) -> String:
	return "%s | %s min | %s" % [
		_extract_detail_text(routine, ["targetArea", "target", "muscleGroup"], "-"),
		_extract_detail_text(routine, ["estimatedDuration", "durationMinutes", "duration"], "-"),
		_format_count(_extract_detail_count(routine), "exercise", "exercises"),
	]


# Formats the summary line shown inside each exercise card.
func _build_exercise_meta(item: Dictionary) -> String:
	return "%s | %s | %s" % [
		_extract_detail_text(item, ["targetArea", "muscleGroup", "target"], "-"),
		_format_count(max(1, int(item.get("sets", item.get("setCount", 1)))), "set", "sets"),
		_format_rep_target(item.get("repsOrHoldSeconds", item.get("targetReps", item.get("holdSeconds", 0)))),
	]


# Converts a target value into a reps-or-hold label.
func _format_rep_target(value: Variant) -> String:
	var numeric := int(value)
	if numeric <= 0:
		return "No target specified"
	return "%s reps/hold" % String.num_int64(numeric)


# Formats a singular or plural count label.
func _format_count(count: int, singular: String, plural: String) -> String:
	return "%s %s" % [count, singular if count == 1 else plural]


# Normalizes empty values into a fallback dash.
func _string_or_dash(value: Variant) -> String:
	var text := str(value).strip_edges()
	return "-" if text.is_empty() or text == "<null>" else text


# Clears all generated children from a container.
func _clear_container(container: Node) -> void:
	for child in container.get_children():
		child.queue_free()


# Adds a placeholder card when no exercise preview is available.
func _add_placeholder_card(message: String) -> void:
	var placeholder := PanelContainer.new()
	placeholder.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	placeholder.add_theme_stylebox_override("panel", _placeholder_card_style)
	placeholder.custom_minimum_size = Vector2(0, 156)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 22)
	margin.add_theme_constant_override("margin_top", 22)
	margin.add_theme_constant_override("margin_right", 22)
	margin.add_theme_constant_override("margin_bottom", 22)
	placeholder.add_child(margin)

	var label := Label.new()
	label.text = message
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	label.add_theme_color_override("font_color", INFO_COLOR)
	label.add_theme_font_size_override("font_size", 18)
	margin.add_child(label)

	exercise_list.add_child(placeholder)


# Extracts the array of routine items from the backend detail payload.
func _extract_detail_items(detail: Dictionary) -> Array:
	for key in ["items", "exercises", "exerciseItems", "routineItems", "content"]:
		var value: Variant = detail.get(key, null)
		if value is Array:
			return value

	return []


# Extracts a best-effort exercise count from the detail payload.
func _extract_detail_count(detail: Dictionary) -> int:
	for key in ["exerciseCount", "itemCount", "count"]:
		if detail.has(key):
			return max(0, int(detail.get(key, 0)))

	var items: Array = _extract_detail_items(detail)
	return items.size()


# Extracts the first non-empty text value from a list of keys.
func _extract_detail_text(detail: Dictionary, keys: Array, fallback: String) -> String:
	for key in keys:
		if detail.has(key):
			var text := str(detail.get(key, "")).strip_edges()
			if not text.is_empty() and text != "<null>":
				return text

	return fallback


# Emits a refresh request back to the app controller.
func _on_refresh_button_down() -> void:
	emit_signal("refresh_requested")


# Emits a logout request back to the app controller.
func _on_logout_button_down() -> void:
	emit_signal("logout_requested")


# Emits a start request for the selected routine.
func _on_start_button_down() -> void:
	emit_signal("start_requested")


# Scrolls the exercise preview upward.
func _on_exercise_scroll_up_button_down() -> void:
	_scroll_exercises(-180)


# Scrolls the exercise preview downward.
func _on_exercise_scroll_down_button_down() -> void:
	_scroll_exercises(180)


# Moves the exercise preview scroll position by a fixed amount.
func _scroll_exercises(delta: int) -> void:
	var max_scroll: float = exercise_scroll.get_v_scroll_bar().max_value
	if max_scroll <= 0.0:
		return

	var next_scroll: float = clampf(float(exercise_scroll.scroll_vertical + delta), 0.0, max_scroll)
	exercise_scroll.scroll_vertical = int(next_scroll)


# Handles routine selection from the generated list buttons.
func _on_routine_button_down(index: int) -> void:
	if is_busy:
		return

	_selected_index = index
	_update_routine_button_states()
	start_button.disabled = false
	emit_signal("routine_selected", index)
