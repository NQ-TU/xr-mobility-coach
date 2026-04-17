extends Node3D

const VIEWPORT_PANEL_SCENE := preload("res://addons/godot-xr-tools/objects/viewport_2d_in_3d.tscn")
const FUNCTION_POINTER_SCENE := preload("res://addons/godot-xr-tools/functions/function_pointer.tscn")
const VIRTUAL_KEYBOARD_SCENE := preload("res://addons/godot-xr-tools/objects/virtual_keyboard.tscn")
const APP_UI_SCENE := preload("res://ui/app_controller.tscn")
const COACH_A_SCENE := preload("res://scenes/coaches/coach_a.tscn")
const COACH_B_SCENE := preload("res://scenes/coaches/coach_b.tscn")
const COACH_C_SCENE := preload("res://scenes/coaches/coach_c.tscn")
const COACH_D_SCENE := preload("res://scenes/coaches/coach_d.tscn")
const EXERCISE_CROSS_BODY_ARM_PULL := preload("res://assets/animations/exercises/Cross_body_arm_pull.fbx")
const EXERCISE_FRONT_RAISE := preload("res://assets/animations/exercises/Shoulder_front_raises.fbx")
const EXERCISE_HALF_KNEELING_HIP_FLEXOR := preload("res://assets/animations/exercises/Half_Kneeling_Hip_Flexor.fbx")
const EXERCISE_AIR_SQUAT := preload("res://assets/animations/exercises/Air_Squat.fbx")
const EXERCISE_PIKE_WALK := preload("res://assets/animations/exercises/Pike_walk.fbx")
const EXERCISE_SITUPS := preload("res://assets/animations/exercises/Situps.fbx")
const UI_MOVE_ACTION := &"by_button"
const COACH_MOVE_ACTION := &"ax_button"
const POINTER_DISTANCE := 2
const POINTER_Y_OFFSET := -0.01
const POINTER_LASER_THICKNESS := 0.0012
const POINTER_TARGET_RADIUS := 0.01
const POINTER_IDLE_HIDE_DELAY := 2
const POINTER_MOVE_DISTANCE_THRESHOLD := 0.006
const POINTER_ROTATION_THRESHOLD := 0.03
const UI_PLACEMENT_DISTANCE := 1.35
const UI_ANCHOR_HEIGHT_OFFSET := -0.05
const KEYBOARD_LOCAL_OFFSET := Vector3(0.0, -1, 0.14)
const COACH_PLACEMENT_DISTANCE := 1.9
const COACH_LATERAL_OFFSET := 0.72
const COACH_VERTICAL_OFFSET := 0.0
const DASHBOARD_PANEL_NAME := "DashboardPanel"
const VIRTUAL_KEYBOARD_NAME := "VirtualKeyboard"
const AUTH_SHOWCASE_NODE_NAME := "AuthCoachShowcase"
const ACTIVE_PLAYBACK_COACH_NAME := "ActivePlaybackCoach"

const COACH_SCENES := {
	"coach_a": COACH_A_SCENE,
	"coach_b": COACH_B_SCENE,
	"coach_c": COACH_C_SCENE,
	"coach_d": COACH_D_SCENE,
}

const EXERCISE_ANIMATION_SCENES := {
	"cross_body_arm_pull": EXERCISE_CROSS_BODY_ARM_PULL,
	"front_raise": EXERCISE_FRONT_RAISE,
	"shoulder_front_raises": EXERCISE_FRONT_RAISE,
	"half_kneeling_hip_flexor": EXERCISE_HALF_KNEELING_HIP_FLEXOR,
	"air_squat": EXERCISE_AIR_SQUAT,
	"pike_walk": EXERCISE_PIKE_WALK,
	"situps": EXERCISE_SITUPS,
}

var xr_interface: XRInterface
var _ui_move_active := false
var _ui_move_controller: XRController3D
var _left_move_down := false
var _right_move_down := false
var _coach_move_active := false
var _coach_move_controller: XRController3D
var _left_coach_move_down := false
var _right_coach_move_down := false
var _dashboard_panel: XRToolsViewport2DIn3D
var _virtual_keyboard: Node3D
var _auth_coach_showcase: AuthCoachShowcase
var _app_controller: AppController
var _avatar_root: Node3D
var _playback_coach: CoachAvatar
var _playback_coach_id := ""
var _active_playback_mode := ""
var _active_playback_animation_key := ""
var _active_playback_revision := -1
var _pointer_states: Dictionary = {}
@onready var xr_origin: XROrigin3D = $XROrigin3D
@onready var xr_camera: XRCamera3D = $XROrigin3D/XRCamera3D
@onready var world_environment: WorldEnvironment = $WorldEnvironment
@onready var ui_root: Node3D = $UI
@onready var playback_area: Node3D = $PlaybackArea

# Initializes XR, passthrough, controller pointers, UI, and playback staging.
func _ready() -> void:
	xr_interface = XRServer.primary_interface

	if not xr_interface or not xr_interface.is_initialized():
		push_error("OpenXR not initialized")
		return

	print("OpenXR initialised successfully")

	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	Engine.physics_ticks_per_second = 90
	get_viewport().use_xr = true

	if world_environment.environment == null:
		world_environment.environment = Environment.new()

	get_viewport().transparent_bg = true
	world_environment.environment.background_mode = Environment.BG_COLOR
	world_environment.environment.background_color = Color(0.0, 0.0, 0.0, 0.0)
	world_environment.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR

	if not _enable_passthrough():
		push_error("Passthrough could not be enabled")

	_setup_pointer_rig()
	_setup_ui()
	_setup_playback_area()

# Runs per-frame interaction updates for UI movement, coach movement, and pointer visibility.
func _process(_delta: float) -> void:
	_try_bind_app_controller()
	_update_ui_move_input()
	_update_playback_coach_move_input()
	_update_pointer_visibility(_delta)
	_update_virtual_keyboard_visibility()
	if _ui_move_active:
		_update_ui_anchor_from_controller(_ui_move_controller)
	if _coach_move_active:
		_update_playback_coach_from_controller(_coach_move_controller)

# Enables passthrough or falls back to alpha blended background mode.
func _enable_passthrough() -> bool:
	if xr_interface and xr_interface.is_passthrough_supported():
		return xr_interface.start_passthrough()

	var modes = xr_interface.get_supported_environment_blend_modes()
	if XRInterface.XR_ENV_BLEND_MODE_ALPHA_BLEND in modes:
		xr_interface.environment_blend_mode = XRInterface.XR_ENV_BLEND_MODE_ALPHA_BLEND
		return true

	return false


# Ensures both hand controllers have pointer rigs attached and configured.
func _setup_pointer_rig() -> void:
	_ensure_controller("LeftHandController", &"left_hand")
	_ensure_controller("RightHandController", &"right_hand")


# Creates a controller node and function pointer if they do not already exist.
func _ensure_controller(node_name: String, tracker: StringName) -> void:
	var controller := xr_origin.get_node_or_null(node_name) as XRController3D
	if controller == null:
		controller = XRController3D.new()
		controller.name = node_name
		controller.tracker = tracker
		controller.pose = &"aim"
		xr_origin.add_child(controller)

	if controller.get_node_or_null("FunctionPointer") == null:
		var pointer := FUNCTION_POINTER_SCENE.instantiate()
		pointer.name = "FunctionPointer"
		controller.add_child(pointer)

	var function_pointer := controller.get_node_or_null("FunctionPointer") as Node3D
	if function_pointer != null:
		_configure_function_pointer(function_pointer)
		_register_pointer_state(controller, function_pointer)


# Builds the floating viewport UI, keyboard, and auth showcase anchor.
func _setup_ui() -> void:
	var ui_anchor := _get_or_create_ui_anchor()

	if ui_anchor.get_node_or_null("DashboardPanel") == null:
		var panel := VIEWPORT_PANEL_SCENE.instantiate()
		panel.name = "DashboardPanel"
		panel.position = Vector3.ZERO
		panel.set("screen_size", Vector2(2.15, 1.32))
		panel.set("viewport_size", Vector2(1760, 1080))
		panel.set("scene", APP_UI_SCENE)
		panel.set("update_mode", 1)
		panel.set("transparent", 0)
		panel.set("unshaded", true)
		panel.set("filter", true)
		ui_anchor.add_child(panel)
		_dashboard_panel = panel as XRToolsViewport2DIn3D

	if ui_anchor.get_node_or_null("VirtualKeyboard") == null:
		var keyboard := VIRTUAL_KEYBOARD_SCENE.instantiate()
		keyboard.name = "VirtualKeyboard"
		keyboard.position = KEYBOARD_LOCAL_OFFSET
		keyboard.scale = Vector3.ONE * 0.92
		ui_anchor.add_child(keyboard)
		_virtual_keyboard = keyboard as Node3D

	_dashboard_panel = ui_anchor.get_node_or_null(DASHBOARD_PANEL_NAME) as XRToolsViewport2DIn3D
	_virtual_keyboard = ui_anchor.get_node_or_null(VIRTUAL_KEYBOARD_NAME) as Node3D
	if _virtual_keyboard != null:
		_virtual_keyboard.visible = false

	if ui_anchor.get_node_or_null(AUTH_SHOWCASE_NODE_NAME) == null:
		var showcase := AuthCoachShowcase.new()
		showcase.name = AUTH_SHOWCASE_NODE_NAME
		ui_anchor.add_child(showcase)

	_auth_coach_showcase = ui_anchor.get_node_or_null(AUTH_SHOWCASE_NODE_NAME) as AuthCoachShowcase

	_place_ui_anchor_in_front_of_camera()
	call_deferred("_try_bind_app_controller")


# Applies the visual settings for the controller laser and hit reticle.
func _configure_function_pointer(pointer: Node3D) -> void:
	pointer.set("y_offset", POINTER_Y_OFFSET)
	pointer.set("distance", POINTER_DISTANCE)
	pointer.set("show_laser", 1)
	pointer.set("laser_length", 1)
	pointer.set("show_target", true)
	pointer.set("target_radius", POINTER_TARGET_RADIUS)

	var laser_material := _make_pointer_material(
		Color(0.545098, 0.862745, 0.94902, 0.48),
		Color(0.396078, 0.713726, 1.0, 1.0),
		0.35
	)
	var laser_hit_material := _make_pointer_material(
		Color(0.341176, 0.372549, 0.94902, 0.78),
		Color(0.341176, 0.372549, 0.94902, 1.0),
		0.7
	)
	var target_material := _make_pointer_material(
		Color(0.152941, 0.662745, 0.647059, 0.96),
		Color(0.152941, 0.662745, 0.647059, 1.0),
		1.0
	)

	pointer.set("laser_material", laser_material)
	pointer.set("laser_hit_material", laser_hit_material)
	pointer.set("target_material", target_material)

	var ray_cast := pointer.get_node_or_null("RayCast") as RayCast3D
	if ray_cast != null:
		ray_cast.target_position = Vector3(0.0, 0.0, -POINTER_DISTANCE)

	var laser := pointer.get_node_or_null("Laser") as MeshInstance3D
	if laser != null:
		var laser_mesh := laser.mesh as BoxMesh
		if laser_mesh != null:
			laser_mesh = laser_mesh.duplicate()
			laser_mesh.size = Vector3(POINTER_LASER_THICKNESS, POINTER_LASER_THICKNESS, POINTER_DISTANCE)
			laser.mesh = laser_mesh
		laser.position = Vector3(0.0, POINTER_Y_OFFSET, -POINTER_DISTANCE * 0.5)

	var target := pointer.get_node_or_null("Target") as MeshInstance3D
	if target != null:
		var target_mesh := target.mesh as SphereMesh
		if target_mesh != null:
			target_mesh = target_mesh.duplicate()
			target_mesh.radius = POINTER_TARGET_RADIUS
			target_mesh.height = POINTER_TARGET_RADIUS * 2.0
			target.mesh = target_mesh


# Stores per-controller pointer state so rays can hide when idle.
func _register_pointer_state(controller: XRController3D, pointer: Node3D) -> void:
	if controller == null or pointer == null:
		return

	var forward: Vector3 = -controller.global_transform.basis.z
	if forward.length_squared() < 0.001:
		forward = Vector3(0.0, 0.0, -1.0)
	else:
		forward = forward.normalized()

	_pointer_states[controller.name] = {
		"pointer": pointer,
		"last_origin": controller.global_transform.origin,
		"last_forward": forward,
		"idle_time": 0.0,
	}
	_set_pointer_visuals(pointer, true)


# Shows or hides controller rays based on motion and active repositioning.
func _update_pointer_visibility(delta: float) -> void:
	for controller in [_get_left_controller(), _get_right_controller()]:
		if controller == null:
			continue

		var pointer_state_variant: Variant = _pointer_states.get(controller.name, null)
		if not (pointer_state_variant is Dictionary):
			var pointer_node := controller.get_node_or_null("FunctionPointer") as Node3D
			if pointer_node == null:
				continue
			_register_pointer_state(controller, pointer_node)
			pointer_state_variant = _pointer_states.get(controller.name, {})

		var pointer_state: Dictionary = pointer_state_variant
		var pointer := pointer_state.get("pointer", null) as Node3D
		if pointer == null:
			continue

		var current_origin: Vector3 = controller.global_transform.origin
		var current_forward: Vector3 = -controller.global_transform.basis.z
		if current_forward.length_squared() < 0.001:
			current_forward = Vector3(0.0, 0.0, -1.0)
		else:
			current_forward = current_forward.normalized()

		var last_origin: Vector3 = pointer_state.get("last_origin", current_origin)
		var last_forward: Vector3 = pointer_state.get("last_forward", current_forward)
		var moved: bool = current_origin.distance_to(last_origin) > POINTER_MOVE_DISTANCE_THRESHOLD
		var rotated: bool = current_forward.angle_to(last_forward) > POINTER_ROTATION_THRESHOLD
		var force_visible: bool = (
			(_ui_move_active and controller == _ui_move_controller)
			or (_coach_move_active and controller == _coach_move_controller)
		)

		var idle_time: float = float(pointer_state.get("idle_time", 0.0))
		if moved or rotated or force_visible:
			idle_time = 0.0
			_set_pointer_visuals(pointer, true)
		else:
			idle_time += delta
			if idle_time >= POINTER_IDLE_HIDE_DELAY:
				_set_pointer_visuals(pointer, false)

		pointer_state["last_origin"] = current_origin
		pointer_state["last_forward"] = current_forward
		pointer_state["idle_time"] = idle_time
		_pointer_states[controller.name] = pointer_state


# Toggles the pointer beam and reticle visuals together.
func _set_pointer_visuals(pointer: Node3D, next_visible: bool) -> void:
	if pointer == null:
		return

	pointer.set("show_laser", 1 if next_visible else 0)
	pointer.set("show_target", next_visible)

	var laser := pointer.get_node_or_null("Laser") as MeshInstance3D
	if laser != null and not next_visible:
		laser.visible = false

	var target := pointer.get_node_or_null("Target") as MeshInstance3D
	if target != null and not next_visible:
		target.visible = false


# Creates a simple unshaded material for pointer beams and reticles.
func _make_pointer_material(albedo: Color, emission: Color, emission_energy: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.no_depth_test = true
	material.albedo_color = albedo
	material.emission_enabled = true
	material.emission = emission
	material.emission_energy_multiplier = emission_energy
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	return material


# Creates the playback coach root node if it is missing from the scene.
func _setup_playback_area() -> void:
	_avatar_root = playback_area.get_node_or_null("AvatarRoot") as Node3D
	if _avatar_root == null:
		_avatar_root = Node3D.new()
		_avatar_root.name = "AvatarRoot"
		playback_area.add_child(_avatar_root)

# Returns the floating UI anchor, creating it if needed.
func _get_or_create_ui_anchor() -> Node3D:
	var ui_anchor := ui_root.get_node_or_null("UIAnchor") as Node3D
	if ui_anchor == null:
		ui_anchor = Node3D.new()
		ui_anchor.name = "UIAnchor"
		ui_root.add_child(ui_anchor)
	return ui_anchor


# Returns the existing floating UI anchor node.
func _get_ui_anchor() -> Node3D:
	return ui_root.get_node_or_null("UIAnchor") as Node3D


# Returns the left XR controller if available.
func _get_left_controller() -> XRController3D:
	return xr_origin.get_node_or_null("LeftHandController") as XRController3D


# Returns the right XR controller if available.
func _get_right_controller() -> XRController3D:
	return xr_origin.get_node_or_null("RightHandController") as XRController3D


# Watches the UI move input and starts or stops panel repositioning.
func _update_ui_move_input() -> void:
	var left_controller := _get_left_controller()
	var right_controller := _get_right_controller()
	var left_down := left_controller != null and left_controller.get_is_active() and left_controller.is_button_pressed(UI_MOVE_ACTION)
	var right_down := right_controller != null and right_controller.get_is_active() and right_controller.is_button_pressed(UI_MOVE_ACTION)

	if left_down and not _left_move_down:
		_begin_ui_move(left_controller)
	elif right_down and not _right_move_down:
		_begin_ui_move(right_controller)

	if _ui_move_active and is_instance_valid(_ui_move_controller):
		var active_down := _ui_move_controller.is_button_pressed(UI_MOVE_ACTION)
		if not active_down:
			_end_ui_move()

	_left_move_down = left_down
	_right_move_down = right_down


# Watches the coach move input and starts or stops coach repositioning.
func _update_playback_coach_move_input() -> void:
	var left_controller := _get_left_controller()
	var right_controller := _get_right_controller()
	var left_down := left_controller != null and left_controller.get_is_active() and left_controller.is_button_pressed(COACH_MOVE_ACTION)
	var right_down := right_controller != null and right_controller.get_is_active() and right_controller.is_button_pressed(COACH_MOVE_ACTION)

	if left_down and not _left_coach_move_down:
		_begin_playback_coach_move(left_controller)
	elif right_down and not _right_coach_move_down:
		_begin_playback_coach_move(right_controller)

	if _coach_move_active and is_instance_valid(_coach_move_controller):
		var active_down := _coach_move_controller.is_button_pressed(COACH_MOVE_ACTION)
		if not active_down:
			_end_playback_coach_move()

	_left_coach_move_down = left_down
	_right_coach_move_down = right_down


# Begins moving the floating UI from the selected controller.
func _begin_ui_move(controller: XRController3D) -> void:
	if controller == null:
		return

	_ui_move_active = true
	_ui_move_controller = controller
	_update_ui_anchor_from_controller(controller)


# Ends the current UI reposition action.
func _end_ui_move() -> void:
	_ui_move_active = false
	_ui_move_controller = null


# Begins moving the active playback coach during the playback state.
func _begin_playback_coach_move(controller: XRController3D) -> void:
	if controller == null or _app_controller == null or _app_controller.current_state != AppController.AppState.PLAYBACK:
		return

	var coach_id: String = _playback_coach_id if not _playback_coach_id.is_empty() else _app_controller.selected_coach_id
	if coach_id.is_empty():
		return

	var coach: CoachAvatar = _ensure_playback_coach(coach_id)
	if coach == null:
		return

	_coach_move_active = true
	_coach_move_controller = controller
	_update_playback_coach_from_controller(controller)


# Ends the current playback coach reposition action.
func _end_playback_coach_move() -> void:
	_coach_move_active = false
	_coach_move_controller = null


# Places the floating UI in front of the user's current view.
func _place_ui_anchor_in_front_of_camera() -> void:
	var forward := -xr_camera.global_transform.basis.z
	forward.y = 0.0
	if forward.length_squared() < 0.001:
		forward = Vector3(0.0, 0.0, -1.0)
	else:
		forward = forward.normalized()

	var target_position := xr_camera.global_transform.origin + forward * UI_PLACEMENT_DISTANCE
	target_position.y = xr_camera.global_transform.origin.y + UI_ANCHOR_HEIGHT_OFFSET
	_set_ui_anchor_transform(target_position)


# Repositions the UI anchor using the controller aim direction.
func _update_ui_anchor_from_controller(controller: XRController3D) -> void:
	if controller == null:
		return

	var target_position := controller.global_transform.origin + (-controller.global_transform.basis.z).normalized() * UI_PLACEMENT_DISTANCE
	target_position.y = clampf(target_position.y, 0.95, 1.85)
	_set_ui_anchor_transform(target_position)


# Applies the final UI anchor transform so the panel faces the user.
func _set_ui_anchor_transform(target_position: Vector3) -> void:
	var ui_anchor := _get_ui_anchor()
	if ui_anchor == null:
		return

	var to_camera := xr_camera.global_transform.origin - target_position
	to_camera.y = 0.0
	if to_camera.length_squared() < 0.001:
		to_camera = Vector3(0.0, 0.0, 1.0)
	else:
		to_camera = to_camera.normalized()

	var facing_basis := Basis.looking_at(-to_camera, Vector3.UP)
	ui_anchor.global_transform = Transform3D(facing_basis, target_position)


# Shows the virtual keyboard only while a text input has focus.
func _update_virtual_keyboard_visibility() -> void:
	if _virtual_keyboard == null:
		return

	var focus_owner := _get_dashboard_focus_owner()
	var should_show := focus_owner is LineEdit or focus_owner is TextEdit
	if _virtual_keyboard.visible != should_show:
		_virtual_keyboard.visible = should_show


# Returns the currently focused control inside the XR viewport UI.
func _get_dashboard_focus_owner() -> Control:
	if _dashboard_panel == null:
		return null

	var viewport := _dashboard_panel.get_node_or_null("Viewport") as Viewport
	if viewport == null:
		return null

	return viewport.gui_get_focus_owner()


# Binds the main app controller once the viewport scene has finished loading.
func _try_bind_app_controller() -> void:
	if _app_controller != null and is_instance_valid(_app_controller):
		return

	var dashboard_root: Node = _get_dashboard_scene_root()
	if not (dashboard_root is AppController):
		return

	_app_controller = dashboard_root
	if not _app_controller.state_changed.is_connected(_on_app_state_changed):
		_app_controller.state_changed.connect(_on_app_state_changed)
	if not _app_controller.playback_coach_state_changed.is_connected(_on_playback_coach_state_changed):
		_app_controller.playback_coach_state_changed.connect(_on_playback_coach_state_changed)
	if not _app_controller.playback_coach_move_requested.is_connected(_on_playback_coach_move_requested):
		_app_controller.playback_coach_move_requested.connect(_on_playback_coach_move_requested)
	_on_app_state_changed(_app_controller.current_state)


# Returns the root scene running inside the XR viewport panel.
func _get_dashboard_scene_root() -> Node:
	if _dashboard_panel == null:
		return null

	var viewport := _dashboard_panel.get_node_or_null("Viewport") as Viewport
	if viewport == null:
		return null

	for child in viewport.get_children():
		if child is AppController:
			return child

	return null


# Updates showcase visibility and playback staging when the app state changes.
func _on_app_state_changed(next_state: int) -> void:
	var show_auth_showcase := (
		next_state == AppController.AppState.BOOT
		or next_state == AppController.AppState.AUTH
		or next_state == AppController.AppState.COACH_SELECT
	)
	if _auth_coach_showcase != null:
		if next_state == AppController.AppState.COACH_SELECT:
			_auth_coach_showcase.set_display_mode(AuthCoachShowcase.DisplayMode.COACH_SELECT)
		else:
			_auth_coach_showcase.set_display_mode(AuthCoachShowcase.DisplayMode.AUTH)
		if _app_controller != null:
			_auth_coach_showcase.set_selected_coach(_app_controller.selected_coach_id)
		if show_auth_showcase:
			_auth_coach_showcase.show_showcase()
		else:
			_auth_coach_showcase.hide_showcase()

	_set_playback_scaffold_visible(not show_auth_showcase)
	if next_state != AppController.AppState.PLAYBACK:
		_end_playback_coach_move()
		_hide_playback_coach()


# Placeholder hook for any future playback-area visuals.
func _set_playback_scaffold_visible(_next_visible: bool) -> void:
	return


# Applies the requested coach animation state during playback.
func _on_playback_coach_state_changed(coach_id: String, coach_state: Dictionary) -> void:
	if _app_controller == null or _app_controller.current_state != AppController.AppState.PLAYBACK:
		return

	if coach_id.is_empty() or not bool(coach_state.get("visible", false)):
		_hide_playback_coach()
		return

	var coach_changed: bool = (
		_playback_coach == null
		or not is_instance_valid(_playback_coach)
		or coach_id != _playback_coach_id
	)
	var coach: CoachAvatar = _ensure_playback_coach(coach_id)
	if coach == null:
		return

	coach.visible = true
	var mode: String = str(coach_state.get("mode", "idle"))
	var animation_key: String = str(coach_state.get("animationKey", "")).strip_edges()
	var revision: int = int(coach_state.get("revision", 0))
	var paused: bool = bool(coach_state.get("paused", false))
	var needs_restart: bool = (
		coach_changed
		or mode != _active_playback_mode
		or animation_key != _active_playback_animation_key
		or revision != _active_playback_revision
	)

	if needs_restart:
		if mode == "exercise":
			var animation_scene_variant: Variant = EXERCISE_ANIMATION_SCENES.get(animation_key, null)
			if animation_scene_variant is PackedScene:
				var animation_scene: PackedScene = animation_scene_variant
				if not coach.play_animation_scene(animation_scene, "", true, "exercise_%s" % animation_key, false):
					coach.play_idle()
			else:
				coach.play_idle()
		else:
			coach.play_idle()

	_playback_coach_id = coach_id
	_active_playback_mode = mode
	_active_playback_animation_key = animation_key
	_active_playback_revision = revision
	coach.set_animation_paused(paused if mode == "exercise" else false)


# Handles explicit coach reposition requests coming from the UI.
func _on_playback_coach_move_requested(coach_id: String) -> void:
	if _app_controller == null or _app_controller.current_state != AppController.AppState.PLAYBACK:
		return
	if coach_id.is_empty():
		return

	var coach: CoachAvatar = _ensure_playback_coach(coach_id)
	if coach == null:
		return
	_reposition_playback_coach()


# Ensures the selected playback coach is spawned and ready in the scene.
func _ensure_playback_coach(coach_id: String) -> CoachAvatar:
	if _avatar_root == null:
		return null

	if _playback_coach != null and is_instance_valid(_playback_coach) and _playback_coach_id == coach_id:
		return _playback_coach

	if _playback_coach != null and is_instance_valid(_playback_coach):
		_playback_coach.queue_free()
		_playback_coach = null

	var coach_scene_variant: Variant = COACH_SCENES.get(coach_id, null)
	if not (coach_scene_variant is PackedScene):
		return null

	var coach_scene: PackedScene = coach_scene_variant
	var coach_node: Node = coach_scene.instantiate()
	if not (coach_node is CoachAvatar):
		return null

	coach_node.name = ACTIVE_PLAYBACK_COACH_NAME
	_avatar_root.add_child(coach_node)
	var coach_avatar: CoachAvatar = coach_node
	_playback_coach = coach_avatar
	_playback_coach_id = coach_id
	_reposition_playback_coach()
	return _playback_coach


# Places the playback coach near the user and facing back toward them.
func _reposition_playback_coach() -> void:
	if _avatar_root == null:
		return

	var forward: Vector3 = -xr_camera.global_transform.basis.z
	forward.y = 0.0
	if forward.length_squared() < 0.001:
		forward = Vector3(0.0, 0.0, -1.0)
	else:
		forward = forward.normalized()

	var right: Vector3 = xr_camera.global_transform.basis.x
	right.y = 0.0
	if right.length_squared() < 0.001:
		right = Vector3(1.0, 0.0, 0.0)
	else:
		right = right.normalized()

	var floor_y: float = xr_origin.global_transform.origin.y + COACH_VERTICAL_OFFSET
	var target_position: Vector3 = xr_camera.global_transform.origin + forward * COACH_PLACEMENT_DISTANCE + right * COACH_LATERAL_OFFSET
	target_position.y = floor_y

	var to_camera: Vector3 = xr_camera.global_transform.origin - target_position
	to_camera.y = 0.0
	if to_camera.length_squared() < 0.001:
		to_camera = Vector3(0.0, 0.0, 1.0)
	else:
		to_camera = to_camera.normalized()

	var facing_basis: Basis = Basis.looking_at(-to_camera, Vector3.UP)
	_avatar_root.global_transform = Transform3D(facing_basis, target_position)


# Repositions the playback coach using the controller aim direction.
func _update_playback_coach_from_controller(controller: XRController3D) -> void:
	if controller == null or _avatar_root == null:
		return

	var forward: Vector3 = -controller.global_transform.basis.z
	forward.y = 0.0
	if forward.length_squared() < 0.001:
		forward = -xr_camera.global_transform.basis.z
		forward.y = 0.0
	if forward.length_squared() < 0.001:
		forward = Vector3(0.0, 0.0, -1.0)
	else:
		forward = forward.normalized()

	var floor_y: float = xr_origin.global_transform.origin.y + COACH_VERTICAL_OFFSET
	var target_position: Vector3 = controller.global_transform.origin + forward * COACH_PLACEMENT_DISTANCE
	target_position.y = floor_y

	var to_camera: Vector3 = xr_camera.global_transform.origin - target_position
	to_camera.y = 0.0
	if to_camera.length_squared() < 0.001:
		to_camera = Vector3(0.0, 0.0, 1.0)
	else:
		to_camera = to_camera.normalized()

	var facing_basis: Basis = Basis.looking_at(-to_camera, Vector3.UP)
	_avatar_root.global_transform = Transform3D(facing_basis, target_position)


# Hides the active playback coach and clears cached playback state.
func _hide_playback_coach() -> void:
	if _playback_coach != null and is_instance_valid(_playback_coach):
		_playback_coach.visible = false
		_playback_coach.stop_animation()
	_playback_coach_id = ""
	_active_playback_mode = ""
	_active_playback_animation_key = ""
	_active_playback_revision = -1
