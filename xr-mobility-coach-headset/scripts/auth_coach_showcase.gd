class_name AuthCoachShowcase
extends Node3D

enum DisplayMode {
	AUTH,
	COACH_SELECT,
}

const PEDESTAL_HEIGHT := 0.08
const PEDESTAL_RADIUS := 0.58
const PEDESTAL_Y_OFFSET := -0.1
const PEDESTAL_COLOR := Color(0.86, 0.88, 0.9, 0.94)
const PEDESTAL_SELECTED_COLOR := Color(0.76, 0.86, 0.98, 0.98)
const LABEL_Y_OFFSET := 2
const LABEL_COLOR := Color(0.97, 0.99, 1.0, 0.98)
const LABEL_OUTLINE_COLOR := Color(0.08, 0.13, 0.21, 0.92)

# Tweak these values for coach positioning.
const COACH_DEFINITIONS := [
	{
		"id": "coach_a",
		"name": "Mannequin",
		"scene": preload("res://scenes/coaches/coach_a.tscn"),
		"position": Vector3(-3.8, -1.08, 1.0),
		"yaw_degrees": 70.0,
		"scale": 1.0,
	},
	{
		"id": "coach_b",
		"name": "Sabrina",
		"scene": preload("res://scenes/coaches/coach_b.tscn"),
		"position": Vector3(-1.9, -1.02, 0.0),
		"yaw_degrees": 0.0,
		"scale": 1.0,
	},
	{
		"id": "coach_c",
		"name": "John",
		"scene": preload("res://scenes/coaches/coach_c.tscn"),
		"position": Vector3(1.9, -1.02, 0.0),
		"yaw_degrees": 0.0,
		"scale": 1.0,
	},
	{
		"id": "coach_d",
		"name": "Jessica",
		"scene": preload("res://scenes/coaches/coach_d.tscn"),
		"position": Vector3(3.8, -1.08, 1.0),
		"yaw_degrees": 290.0,
		"scale": 1.0,
	},
]

var _spawned := false
var _display_mode := DisplayMode.AUTH
var _selected_coach_id := ""
var _pedestals: Dictionary = {}
var _labels: Dictionary = {}

# Starts hidden until the auth or coach selection state is active.
func _ready() -> void:
	visible = false

# Shows the showcase and spawns the coaches the first time it is needed.
func show_showcase() -> void:
	if not _spawned:
		_spawn_coaches()
	_apply_display_mode()
	visible = true

# Hides the coach showcase when the app leaves auth-related states.
func hide_showcase() -> void:
	visible = false

# Switches between plain auth mode and pedestal selection mode.
func set_display_mode(next_mode: int) -> void:
	_display_mode = next_mode
	_apply_display_mode()

# Highlights the selected coach pedestal during coach selection.
func set_selected_coach(coach_id: String) -> void:
	_selected_coach_id = coach_id
	_update_pedestal_styles()

# Spawns the configured coach scenes, name labels, and pedestals.
func _spawn_coaches() -> void:
	_spawned = true

	for coach_definition_variant in COACH_DEFINITIONS:
		var coach_definition: Dictionary = coach_definition_variant
		var coach_scene := coach_definition.get("scene") as PackedScene
		if coach_scene == null:
			continue

		var coach_instance: Node = coach_scene.instantiate()
		coach_instance.name = str(coach_definition.get("id", "Coach"))
		add_child(coach_instance)

		if coach_instance is Node3D:
			var coach_node: Node3D = coach_instance
			coach_node.position = coach_definition.get("position", Vector3.ZERO)
			coach_node.rotation_degrees = Vector3(0.0, float(coach_definition.get("yaw_degrees", 180.0)), 0.0)
			coach_node.scale = Vector3.ONE * float(coach_definition.get("scale", 1.0))
			var coach_id: String = str(coach_definition.get("id", ""))
			if not coach_id.is_empty():
				_pedestals[coach_id] = _create_pedestal(coach_node.position)
				_labels[coach_id] = _create_name_label(
					str(coach_definition.get("name", coach_id)),
					coach_node.position,
					float(coach_definition.get("yaw_degrees", 180.0))
				)

	_apply_display_mode()
	_update_pedestal_styles()

# Creates the pedestal mesh displayed beneath each coach.
func _create_pedestal(coach_position: Vector3) -> MeshInstance3D:
	var pedestal := MeshInstance3D.new()
	pedestal.name = "Pedestal"
	var mesh := CylinderMesh.new()
	mesh.top_radius = PEDESTAL_RADIUS
	mesh.bottom_radius = PEDESTAL_RADIUS
	mesh.height = PEDESTAL_HEIGHT
	mesh.radial_segments = 36
	pedestal.mesh = mesh
	pedestal.position = coach_position + Vector3(0.0, PEDESTAL_Y_OFFSET, 0.0)

	var material := StandardMaterial3D.new()
	material.albedo_color = PEDESTAL_COLOR
	material.roughness = 0.95
	material.metallic = 0.02
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	pedestal.material_override = material
	add_child(pedestal)
	return pedestal

# Applies the current display rules for pedestals and labels.
func _apply_display_mode() -> void:
	var show_pedestals := _display_mode == DisplayMode.COACH_SELECT
	for pedestal_variant in _pedestals.values():
		if pedestal_variant is MeshInstance3D:
			var pedestal: MeshInstance3D = pedestal_variant
			pedestal.visible = show_pedestals
	for label_variant in _labels.values():
		if label_variant is Label3D:
			var label: Label3D = label_variant
			label.visible = true
	_update_pedestal_styles()

# Updates pedestal colors so the selected coach stands out.
func _update_pedestal_styles() -> void:
	for coach_id in _pedestals.keys():
		var pedestal_variant: Variant = _pedestals.get(coach_id, null)
		if not (pedestal_variant is MeshInstance3D):
			continue
		var pedestal: MeshInstance3D = pedestal_variant
		var material := pedestal.material_override as StandardMaterial3D
		if material == null:
			continue
		material.albedo_color = PEDESTAL_SELECTED_COLOR if coach_id == _selected_coach_id else PEDESTAL_COLOR

# Creates a fixed world-space label for a coach name.
func _create_name_label(label_text: String, coach_position: Vector3, yaw_degrees: float) -> Label3D:
	var label := Label3D.new()
	label.name = "%sLabel" % label_text.replace(" ", "")
	label.text = label_text
	label.position = coach_position + Vector3(0.0, LABEL_Y_OFFSET, 0.0)
	label.font_size = 64
	label.rotation_degrees = Vector3(0.0, yaw_degrees, 0.0)
	label.modulate = LABEL_COLOR
	label.outline_modulate = LABEL_OUTLINE_COLOR
	label.outline_size = 16
	add_child(label)
	return label
