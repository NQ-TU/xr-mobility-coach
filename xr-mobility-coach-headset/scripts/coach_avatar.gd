class_name CoachAvatar
extends Node3D

const RUNTIME_IDLE_NAME := "idle"

@export var model_scene: PackedScene
@export var idle_scene: PackedScene
@export var preferred_idle_animation_name := ""
@export var auto_play_idle := true

var _model_instance: Node3D
var _runtime_animation_player: AnimationPlayer
var _current_runtime_animation_name := ""


# Sets up the coach model and starts the idle loop if configured.
func _ready() -> void:
	_instantiate_model()
	_ensure_runtime_animation_player()
	if auto_play_idle:
		play_idle()


# Plays the configured idle clip on the coach.
func play_idle() -> bool:
	if idle_scene == null:
		push_warning("%s has no idle_scene configured." % name)
		return false

	return play_animation_scene(idle_scene, preferred_idle_animation_name, true, RUNTIME_IDLE_NAME, false)


# Loads, remaps, and plays an imported animation scene on the coach rig.
func play_animation_scene(
	animation_scene: PackedScene,
	preferred_name := "",
	should_loop := true,
	runtime_name := "",
	log_debug := false
) -> bool:
	if animation_scene == null:
		push_warning("%s has no animation scene configured." % name)
		return false

	var payload: Dictionary = _extract_animation_payload(animation_scene, preferred_name)
	if payload.is_empty():
		push_warning("%s could not extract a usable animation clip." % name)
		return false

	var target_model_path: String = _resolve_target_model_path()
	var target_skeleton: Skeleton3D = _find_first_skeleton(_model_instance)
	var target_skeleton_path: String = _resolve_target_skeleton_path()
	if target_model_path.is_empty() or target_skeleton_path.is_empty() or target_skeleton == null:
		push_warning("%s could not resolve its runtime model or skeleton path." % name)
		return false

	var remapped_animation := payload.get("animation") as Animation
	if remapped_animation == null:
		return false
	remapped_animation.loop_mode = Animation.LOOP_LINEAR if should_loop else Animation.LOOP_NONE

	_remap_animation_tracks(
		remapped_animation,
		str(payload.get("source_model_path", "")),
		str(payload.get("source_skeleton_path", "")),
		target_model_path,
		target_skeleton_path,
		target_skeleton
	)
	if log_debug:
		_log_animation_debug(
			str(payload.get("animation_name", "")),
			str(payload.get("source_model_path", "")),
			str(payload.get("source_skeleton_path", "")),
			target_model_path,
			target_skeleton_path,
			remapped_animation,
			target_skeleton
		)
	var resolved_runtime_name: String = runtime_name if not runtime_name.is_empty() else str(payload.get("animation_name", "clip"))
	_store_animation(resolved_runtime_name, remapped_animation)
	_runtime_animation_player.speed_scale = 1.0
	_runtime_animation_player.play(resolved_runtime_name)
	_runtime_animation_player.advance(0.0)
	_current_runtime_animation_name = resolved_runtime_name
	return true


# Stops the current runtime animation.
func stop_animation() -> void:
	if _runtime_animation_player != null:
		_runtime_animation_player.stop()
		_current_runtime_animation_name = ""


# Restarts the last played runtime animation from the beginning.
func restart_animation() -> void:
	if _runtime_animation_player == null or _current_runtime_animation_name.is_empty():
		return
	_runtime_animation_player.play(_current_runtime_animation_name)
	_runtime_animation_player.seek(0.0, true)
	_runtime_animation_player.advance(0.0)


# Pauses or resumes the current runtime animation.
func set_animation_paused(next_paused: bool) -> void:
	if _runtime_animation_player == null:
		return
	_runtime_animation_player.speed_scale = 0.0 if next_paused else 1.0


# Instantiates the imported coach model if it is not already present.
func _instantiate_model() -> void:
	var existing_model := get_node_or_null("Model") as Node3D
	if existing_model != null:
		_model_instance = existing_model
		return

	if model_scene == null:
		push_warning("%s has no model_scene configured." % name)
		return

	var model_instance: Node = model_scene.instantiate()
	model_instance.name = "Model"
	add_child(model_instance)
	if model_instance is Node3D:
		_model_instance = model_instance


# Ensures the runtime animation player exists and points at the coach model.
func _ensure_runtime_animation_player() -> void:
	var player := get_node_or_null("RuntimeAnimationPlayer") as AnimationPlayer
	if player == null:
		player = AnimationPlayer.new()
		player.name = "RuntimeAnimationPlayer"
		add_child(player)
	player.root_node = NodePath("../Model")

	if player.get_animation_library("") == null:
		player.add_animation_library("", AnimationLibrary.new())

	_runtime_animation_player = player


# Stores or replaces a runtime animation clip in the player library.
func _store_animation(animation_name: String, animation: Animation) -> void:
	var library: AnimationLibrary = _runtime_animation_player.get_animation_library("")
	if library.has_animation(animation_name):
		library.remove_animation(animation_name)
	library.add_animation(animation_name, animation)


# Extracts animation data and source paths from an imported animation scene.
func _extract_animation_payload(animation_scene: PackedScene, preferred_name: String) -> Dictionary:
	var source_root: Node = animation_scene.instantiate()
	if source_root == null:
		return {}

	var source_player: AnimationPlayer = _find_animation_player(source_root)
	if source_player == null:
		source_root.queue_free()
		return {}

	var animation_name: String = _resolve_animation_name(source_player, preferred_name)
	if animation_name.is_empty():
		source_root.queue_free()
		return {}

	var source_animation: Animation = source_player.get_animation(animation_name)
	if source_animation == null:
		source_root.queue_free()
		return {}

	var source_context: Node = _resolve_animation_root(source_player, source_root)
	var source_model_root: Node3D = _find_first_node3d(source_root)
	var source_skeleton: Skeleton3D = _find_first_skeleton(source_root)
	if source_context == null or source_model_root == null or source_skeleton == null:
		source_root.queue_free()
		return {}

	var payload := {
		"animation": source_animation.duplicate(true),
		"animation_name": animation_name,
		"source_model_path": String(source_context.get_path_to(source_model_root)),
		"source_skeleton_path": String(source_context.get_path_to(source_skeleton)),
	}
	source_root.queue_free()
	return payload


# Chooses the most suitable clip from an imported animation player.
func _resolve_animation_name(player: AnimationPlayer, preferred_name: String) -> String:
	var animation_names: PackedStringArray = player.get_animation_list()
	if animation_names.is_empty():
		return ""

	if not preferred_name.is_empty() and player.has_animation(preferred_name):
		return preferred_name

	for animation_name in animation_names:
		var normalized_name: String = animation_name.to_lower()
		if normalized_name.contains("idle") or normalized_name.contains("stand"):
			return animation_name

	for animation_name in animation_names:
		if animation_name.to_lower() != "reset":
			return animation_name

	return animation_names[0]


# Resolves the effective root node used by the imported animation tracks.
func _resolve_animation_root(player: AnimationPlayer, fallback: Node) -> Node:
	var root_path: NodePath = player.root_node
	if root_path.is_empty():
		return fallback
	if player.has_node(root_path):
		return player.get_node(root_path)
	return fallback


# Returns the runtime-relative path to the spawned coach model.
func _resolve_target_model_path() -> String:
	if _model_instance == null:
		return ""
	return "."


# Returns the runtime-relative path to the spawned coach skeleton.
func _resolve_target_skeleton_path() -> String:
	if _model_instance == null:
		return ""

	var target_skeleton: Skeleton3D = _find_first_skeleton(_model_instance)
	if target_skeleton == null:
		return ""
	return String(_model_instance.get_path_to(target_skeleton))


# Rewrites imported track paths so they target the active coach rig.
func _remap_animation_tracks(
	animation: Animation,
	source_model_path: String,
	source_skeleton_path: String,
	target_model_path: String,
	target_skeleton_path: String,
	target_skeleton: Skeleton3D
) -> void:
	for track_index in animation.get_track_count():
		var track_path_text: String = String(animation.track_get_path(track_index))
		if not source_model_path.is_empty() and source_model_path != "." and track_path_text.begins_with(source_model_path):
			track_path_text = target_model_path + track_path_text.substr(source_model_path.length())
		if not source_skeleton_path.is_empty() and source_skeleton_path != "." and track_path_text.begins_with(source_skeleton_path):
			track_path_text = target_skeleton_path + track_path_text.substr(source_skeleton_path.length())
		track_path_text = _remap_track_bone_name(track_path_text, target_skeleton_path, target_skeleton)
		animation.track_set_path(track_index, NodePath(track_path_text))


# Finds the first animation player under an imported animation scene.
func _find_animation_player(root: Node) -> AnimationPlayer:
	if root is AnimationPlayer:
		return root

	for child in root.get_children():
		var found: AnimationPlayer = _find_animation_player(child)
		if found != null:
			return found

	return null


# Finds the first skeleton under a node tree.
func _find_first_skeleton(root: Node) -> Skeleton3D:
	if root is Skeleton3D:
		return root

	for child in root.get_children():
		var found: Skeleton3D = _find_first_skeleton(child)
		if found != null:
			return found

	return null


# Finds the first Node3D under a node tree.
func _find_first_node3d(root: Node) -> Node3D:
	if root is Node3D:
		return root

	for child in root.get_children():
		var found: Node3D = _find_first_node3d(child)
		if found != null:
			return found

	return null


# Remaps a skeleton track to a matching bone on the target rig.
func _remap_track_bone_name(track_path_text: String, target_skeleton_path: String, target_skeleton: Skeleton3D) -> String:
	if target_skeleton == null:
		return track_path_text

	var path_parts: PackedStringArray = track_path_text.split(":", false, 1)
	if path_parts.size() != 2:
		return track_path_text

	var node_path_text: String = path_parts[0]
	var bone_name: String = path_parts[1]
	if node_path_text != target_skeleton_path:
		return track_path_text

	if target_skeleton.find_bone(bone_name) != -1:
		return track_path_text

	var remapped_bone_name: String = _find_matching_bone_name(target_skeleton, bone_name)
	if remapped_bone_name.is_empty():
		return track_path_text

	return "%s:%s" % [node_path_text, remapped_bone_name]


# Finds a target bone with an equivalent normalized name.
func _find_matching_bone_name(target_skeleton: Skeleton3D, source_bone_name: String) -> String:
	var normalized_source: String = _normalize_bone_name(source_bone_name)
	for bone_index in target_skeleton.get_bone_count():
		var candidate_name: String = target_skeleton.get_bone_name(bone_index)
		if _normalize_bone_name(candidate_name) == normalized_source:
			return candidate_name
	return ""


# Normalizes bone names so different Mixamo prefixes still match.
func _normalize_bone_name(value: String) -> String:
	var normalized := value.to_lower()
	normalized = normalized.replace("mixamorig", "")
	while not normalized.is_empty() and (normalized[0] == "_" or normalized[0] == ":" or normalized[0] == "-" or normalized[0].is_valid_int()):
		normalized = normalized.substr(1)
	normalized = normalized.replace(":", "")
	normalized = normalized.replace("_", "")
	normalized = normalized.replace("-", "")
	return normalized


# Prints runtime animation mapping details for debugging.
func _log_animation_debug(
	animation_name: String,
	source_model_path: String,
	source_skeleton_path: String,
	target_model_path: String,
	target_skeleton_path: String,
	animation: Animation,
	target_skeleton: Skeleton3D
) -> void:
	var sample_track := ""
	var sample_node_path := ""
	var sample_bone := ""
	var sample_node_exists := false
	var sample_bone_exists := false
	var first_bones: PackedStringArray = []
	var normalized_sample_bone := ""
	var normalized_first_bones: PackedStringArray = []
	if animation.get_track_count() > 0:
		sample_track = String(animation.track_get_path(0))
		var path_parts: PackedStringArray = sample_track.split(":", false, 1)
		if path_parts.size() >= 1:
			sample_node_path = path_parts[0]
			if sample_node_path == ".":
				sample_node_exists = _model_instance != null
			elif _model_instance != null:
				sample_node_exists = _model_instance.has_node(NodePath(sample_node_path))
		if path_parts.size() == 2:
			sample_bone = path_parts[1]
			sample_bone_exists = target_skeleton != null and target_skeleton.find_bone(sample_bone) != -1
			normalized_sample_bone = _normalize_bone_name(sample_bone)
	if target_skeleton != null:
		var preview_count: int = min(target_skeleton.get_bone_count(), 8)
		for bone_index in preview_count:
			var bone_name: String = target_skeleton.get_bone_name(bone_index)
			first_bones.append(bone_name)
			normalized_first_bones.append(_normalize_bone_name(bone_name))

	print(
		"[CoachAvatar] ",
		name,
		" idle='",
		animation_name,
		"' source_model=",
		source_model_path,
		" source_skeleton=",
		source_skeleton_path,
		" target_model=",
		target_model_path,
		" target_skeleton=",
		target_skeleton_path,
		" sample_track=",
		sample_track,
		" sample_node_exists=",
		sample_node_exists,
		" sample_bone=",
		sample_bone,
		" sample_bone_exists=",
		sample_bone_exists,
		" normalized_sample_bone=",
		normalized_sample_bone,
		" first_bones=",
		first_bones,
		" normalized_first_bones=",
		normalized_first_bones
	)
