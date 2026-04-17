class_name CoachSelectPanelView
extends Control

signal coach_selected(coach_id: String)
signal logout_requested()

const ERROR_COLOR := Color(0.74, 0.21, 0.27, 1.0)
const INFO_COLOR := Color(0.25, 0.33, 0.45, 1.0)

@onready var user_label: Label = $MarginContainer/RootColumn/HeaderRow/UserLabel
@onready var logout_button: Button = $MarginContainer/RootColumn/HeaderRow/LogoutButton
@onready var coach_grid: GridContainer = $MarginContainer/RootColumn/BottomCard/BottomMargin/BottomColumn/CoachGrid
@onready var status_label: Label = $MarginContainer/RootColumn/BottomCard/BottomMargin/BottomColumn/StatusLabel

var is_busy := false
var _selected_coach_id := ""
var _coach_cards: Dictionary = {}
var _coach_button_normal: StyleBoxFlat
var _coach_button_hover: StyleBoxFlat
var _coach_button_selected: StyleBoxFlat
var _coach_button_disabled: StyleBoxFlat

# Builds the card styles and connects the logout action.
func _ready() -> void:
	_build_styles()
	logout_button.button_down.connect(_on_logout_button_down)

# Updates the signed-in user label.
func set_user_email(email: String) -> void:
	user_label.text = "Signed in as %s" % email

# Shows a success or error message for coach selection.
func set_status(text: String, is_error := false) -> void:
	status_label.text = text
	status_label.modulate = ERROR_COLOR if is_error else INFO_COLOR

# Toggles button interactivity while selection work is running.
func set_busy(next_busy: bool, status_text := "") -> void:
	is_busy = next_busy
	logout_button.disabled = next_busy
	for coach_id_variant in _coach_cards.keys():
		var coach_id: String = str(coach_id_variant)
		var coach_button := _coach_cards[coach_id].get("button") as Button
		if coach_button != null:
			coach_button.disabled = next_busy
	if not status_text.is_empty():
		set_status(status_text, false)

# Rebuilds the coach cards from the configured coach list.
func set_coaches(coaches: Array) -> void:
	_selected_coach_id = ""
	_coach_cards.clear()
	for child in coach_grid.get_children():
		child.queue_free()

	for coach_variant in coaches:
		if coach_variant is Dictionary:
			var coach: Dictionary = coach_variant
			var coach_id: String = str(coach.get("id", "")).strip_edges()
			if coach_id.is_empty():
				continue
			var card: PanelContainer = _build_coach_card(coach)
			coach_grid.add_child(card)

# Applies the currently selected coach to the card styles.
func set_selected_coach(coach_id: String) -> void:
	_selected_coach_id = coach_id
	_update_card_styles()

# Creates the reusable styles for coach cards and buttons.
func _build_styles() -> void:
	_coach_button_normal = _make_style(
		Color(0.976471, 0.992157, 0.996078, 0.9),
		Color(1, 1, 1, 0.44),
		22
	)
	_apply_padding(_coach_button_normal, 18, 18)
	_coach_button_hover = _make_style(
		Color(0.956863, 0.988235, 0.996078, 0.96),
		Color(0.647059, 0.792157, 0.94902, 0.8),
		22
	)
	_apply_padding(_coach_button_hover, 18, 18)
	_coach_button_selected = _make_style(
		Color(0.913725, 0.960784, 0.996078, 0.98),
		Color(0.341176, 0.372549, 0.94902, 0.94),
		22
	)
	_apply_padding(_coach_button_selected, 18, 18)
	_coach_button_disabled = _make_style(
		Color(0.937255, 0.972549, 0.980392, 0.72),
		Color(0.760784, 0.85098, 0.886275, 0.56),
		22
	)
	_apply_padding(_coach_button_disabled, 18, 18)

# Builds a rounded stylebox for coach cards and buttons.
func _make_style(background: Color, border: Color, radius: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = radius
	style.corner_radius_top_right = radius
	style.corner_radius_bottom_right = radius
	style.corner_radius_bottom_left = radius
	style.shadow_color = Color(0.0509804, 0.168627, 0.223529, 0.08)
	style.shadow_size = 8
	return style

# Applies consistent internal padding to a stylebox.
func _apply_padding(style: StyleBoxFlat, horizontal: int, vertical: int) -> void:
	style.content_margin_left = horizontal
	style.content_margin_right = horizontal
	style.content_margin_top = vertical
	style.content_margin_bottom = vertical

# Builds a single coach card with a title and choose button.
func _build_coach_card(coach: Dictionary) -> PanelContainer:
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(0, 112)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.add_theme_stylebox_override("panel", _coach_button_normal)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 18)
	card.add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	margin.add_child(column)

	var title := Label.new()
	title.text = str(coach.get("name", coach.get("id", "Coach")))
	title.add_theme_color_override("font_color", Color(0.0823529, 0.129412, 0.207843, 1))
	title.add_theme_font_size_override("font_size", 24)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(title)

	var select_button := Button.new()
	select_button.text = "Choose"
	select_button.custom_minimum_size = Vector2(0, 44)
	select_button.add_theme_color_override("font_color", Color(0.0823529, 0.129412, 0.207843, 1))
	select_button.add_theme_color_override("font_hover_color", Color(0.0823529, 0.129412, 0.207843, 1))
	select_button.add_theme_color_override("font_pressed_color", Color(0.0823529, 0.129412, 0.207843, 1))
	select_button.add_theme_color_override("font_disabled_color", Color(0.317647, 0.403922, 0.490196, 1))
	select_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	select_button.add_theme_stylebox_override("normal", _coach_button_normal)
	select_button.add_theme_stylebox_override("hover", _coach_button_hover)
	select_button.add_theme_stylebox_override("pressed", _coach_button_selected)
	select_button.add_theme_stylebox_override("focus", _coach_button_hover)
	select_button.add_theme_stylebox_override("disabled", _coach_button_disabled)
	select_button.button_down.connect(_on_select_button_down.bind(str(coach.get("id", ""))))
	column.add_child(select_button)

	var coach_id: String = str(coach.get("id", "")).strip_edges()
	_coach_cards[coach_id] = {
		"card": card,
		"button": select_button,
	}
	return card

# Refreshes card and button states based on the current selection.
func _update_card_styles() -> void:
	for coach_id_variant in _coach_cards.keys():
		var coach_id: String = str(coach_id_variant)
		var coach_button := _coach_cards[coach_id].get("button") as Button
		var coach_card := _coach_cards[coach_id].get("card") as PanelContainer
		if coach_button == null or coach_card == null:
			continue
		var selected: bool = coach_id == _selected_coach_id
		var card_style: StyleBoxFlat = _coach_button_selected if selected else _coach_button_normal
		coach_card.add_theme_stylebox_override("panel", card_style)
		coach_button.add_theme_stylebox_override("normal", _coach_button_selected if selected else _coach_button_normal)
		coach_button.add_theme_stylebox_override("hover", _coach_button_selected if selected else _coach_button_hover)
		coach_button.add_theme_stylebox_override("focus", _coach_button_selected if selected else _coach_button_hover)

# Saves the selected coach and emits it to the app controller.
func _on_select_button_down(coach_id: String) -> void:
	if is_busy or coach_id.is_empty():
		return
	_selected_coach_id = coach_id
	_update_card_styles()
	emit_signal("coach_selected", coach_id)

# Emits a logout request from the coach selection screen.
func _on_logout_button_down() -> void:
	if is_busy:
		return
	emit_signal("logout_requested")
