class_name AppController
extends Control

signal state_changed(next_state: int)
signal playback_coach_state_changed(coach_id: String, coach_state: Dictionary)
signal playback_coach_move_requested(coach_id: String)

enum AppState {
	BOOT,
	AUTH,
	COACH_SELECT,
	ROUTINE_LIST,
	PLAYBACK,
}

const AVAILABLE_COACHES := [
	{
		"id": "coach_a",
		"name": "Mannequin",
	},
	{
		"id": "coach_b",
		"name": "Sabrina",
	},
	{
		"id": "coach_c",
		"name": "John",
	},
	{
		"id": "coach_d",
		"name": "Jessica",
	},
]

const DEFAULT_API_BASE_URL := "https://api.moflowai.com"
const XR_DEMO_ROUTINE_TITLE := "XR Demo: Varied Exercise Warm-up"
const XR_DEMO_ROUTINE_TARGET_AREA := "Shoulders, Hips, Full Body"
const XR_DEMO_ROUTINE_ESTIMATED_DURATION := 7
const XR_DEMO_ROUTINE_ITEMS := [
	{
		"animationAssetId": "cross_body_arm_pull",
		"sets": 2,
		"repsOrHoldSeconds": 20,
		"coachingNotes": "Ready for your first demo? Place one arm across the front of your body and use your other arm to pull back, with light pulses. Switch arms after 10 seconds.",
	},
	{
		"animationAssetId": "front_raise",
		"sets": 1,
		"repsOrHoldSeconds": 20,
		"coachingNotes": "Lets continue with something easy! Raise your arms in front of your body, as high as you can comfortably move. Take slowly, focus on control.",
	},
	{
		"animationAssetId": "half_kneeling_hip_flexor",
		"sets": 1,
		"repsOrHoldSeconds": 30,
		"coachingNotes": "Good work! Now, kneel down and extend your front foot to the side, slowly lean towards that front foot until you reach resistance, rock 5 times and swap legs.",
	},
	{
		"animationAssetId": "air_squat",
		"sets": 1,
		"repsOrHoldSeconds": 30,
		"coachingNotes": "Legs feel warm after that? Brace your core, keep your chest high and push your arms forwards while sitting into a squat. Reach a comfortable depth and repeat.",
	},
	{
		"animationAssetId": "pike_walk",
		"sets": 1,
		"repsOrHoldSeconds": 30,
		"coachingNotes": "This one is a bit harder, don't get discouraged! Keep core tight, arms straight, and try to walk yourself in as close as possible to your feet. Stop walking in the moment it gets difficult.",
	},
	{
		"animationAssetId": "situps",
		"sets": 1,
		"repsOrHoldSeconds": 30,
		"coachingNotes": "Last one, to raise your heart rate a bit! Plant your feet under something secure if needed, control each rep.",
	},
]

@onready var api_client: XrApiClient = $ApiClient
@onready var auth_panel: AuthPanelView = $AuthPanel
@onready var coach_select_panel: CoachSelectPanelView = $CoachSelectPanel
@onready var routine_list_panel: RoutineListPanelView = $RoutineListPanel
@onready var playback_panel: PlaybackPanelView = $PlaybackPanel

var current_state := AppState.BOOT
var routine_summaries: Array = []
var selected_routine_detail: Dictionary = {}
var selected_coach_id := ""


# Initializes the main XR app flow, default UI state, and API base URL.
func _ready() -> void:
	_connect_signals()
	_prepare_api_base_url()
	auth_panel.set_api_base_url(api_client.api_base_url)
	auth_panel.show_login_mode()
	coach_select_panel.set_coaches(AVAILABLE_COACHES)
	routine_list_panel.set_user_email(str(api_client.get_current_user().get("email", "guest")))
	playback_panel.set_user_email(str(api_client.get_current_user().get("email", "guest")))
	playback_panel.set_selected_coach(selected_coach_id)
	_set_state(AppState.BOOT)
	call_deferred("_bootstrap")


# Connects events from each panel into the central app controller flow.
func _connect_signals() -> void:
	auth_panel.login_requested.connect(_on_login_requested)
	auth_panel.register_requested.connect(_on_register_requested)
	auth_panel.restore_requested.connect(_on_restore_requested)
	coach_select_panel.coach_selected.connect(_on_coach_selected)
	coach_select_panel.logout_requested.connect(_on_logout_requested)
	routine_list_panel.refresh_requested.connect(_on_refresh_requested)
	routine_list_panel.logout_requested.connect(_on_logout_requested)
	routine_list_panel.routine_selected.connect(_on_routine_selected)
	routine_list_panel.start_requested.connect(_on_start_requested)
	playback_panel.back_requested.connect(_on_playback_back_requested)
	playback_panel.submit_requested.connect(_on_playback_submit_requested)
	playback_panel.coach_state_changed.connect(_on_playback_coach_state_changed)
	playback_panel.coach_move_requested.connect(_on_playback_coach_move_requested)


# Forces the production API base URL if the client is still using a local default.
func _prepare_api_base_url() -> void:
	var current_base: String = api_client.api_base_url.strip_edges()
	if current_base.is_empty() or current_base == "http://localhost:8080":
		api_client.set_base_url(DEFAULT_API_BASE_URL)


# Restores any saved session and decides whether to enter auth or continue signed in.
func _bootstrap() -> void:
	auth_panel.set_busy(true, "Checking for a saved session...")
	auth_panel.set_status("Checking for a saved session...", false)

	if api_client.is_authenticated():
		var restored: Dictionary = await api_client.restore_session()
		if bool(restored.get("ok", false)):
			await _handle_authenticated("Welcome back.")
			return

	auth_panel.set_busy(false)
	auth_panel.set_status("Sign in or create an account to continue.", false)
	_set_state(AppState.AUTH)


# Switches the visible XR panel to match the current app state.
func _set_state(next_state: int) -> void:
	current_state = next_state
	auth_panel.visible = next_state == AppState.BOOT or next_state == AppState.AUTH
	coach_select_panel.visible = next_state == AppState.COACH_SELECT
	routine_list_panel.visible = next_state == AppState.ROUTINE_LIST
	playback_panel.visible = next_state == AppState.PLAYBACK
	emit_signal("state_changed", next_state)


# Handles login validation, API sign-in, and auth failure states.
func _on_login_requested(base_url: String, email: String, password: String) -> void:
	if email.is_empty():
		auth_panel.set_status("Email is required.", true)
		return
	if password.is_empty():
		auth_panel.set_status("Password is required.", true)
		return

	api_client.set_base_url(base_url if not base_url.is_empty() else DEFAULT_API_BASE_URL)
	auth_panel.set_busy(true, "Signing in...")
	var result: Dictionary = await api_client.login_user(email, password)
	auth_panel.set_busy(false)

	if bool(result.get("ok", false)):
		auth_panel.set_status("Signed in successfully.", false)
		await _handle_authenticated("Signed in successfully.")
		return

	auth_panel.set_status(str(result.get("message", "Login failed.")), true)


# Handles account creation, sign-in, and registration failure states.
func _on_register_requested(base_url: String, email: String, password: String) -> void:
	if email.is_empty():
		auth_panel.set_status("Email is required.", true)
		return
	if password.is_empty():
		auth_panel.set_status("Password is required.", true)
		return

	api_client.set_base_url(base_url if not base_url.is_empty() else DEFAULT_API_BASE_URL)
	auth_panel.set_busy(true, "Creating your account...")
	var result: Dictionary = await api_client.register_user(email, password)
	auth_panel.set_busy(false)

	if bool(result.get("ok", false)):
		auth_panel.set_status("Account created successfully.", false)
		await _handle_authenticated("Account created successfully.")
		return

	auth_panel.set_status(str(result.get("message", "Registration failed.")), true)


# Restores a saved authenticated session from local device storage.
func _on_restore_requested() -> void:
	auth_panel.set_busy(true, "Restoring saved session...")
	var result: Dictionary = await api_client.restore_session()
	auth_panel.set_busy(false)

	if bool(result.get("ok", false)):
		await _handle_authenticated("Welcome back.")
		return

	auth_panel.set_status(str(result.get("message", "No saved session found.")), true)


# Prepares the UI after authentication and moves the user into coach selection.
func _handle_authenticated(message: String) -> void:
	var user: Dictionary = api_client.get_current_user()
	auth_panel.set_api_base_url(api_client.api_base_url)
	auth_panel.set_email_hint(str(user.get("email", "")))
	auth_panel.clear_passwords()
	selected_coach_id = ""
	coach_select_panel.set_user_email(str(user.get("email", "guest")))
	coach_select_panel.set_selected_coach(selected_coach_id)
	coach_select_panel.set_busy(false)
	coach_select_panel.set_status("Coach choice only affects the visual guide and does not change session tracking.", false)
	routine_list_panel.set_user_email(str(user.get("email", "guest")))
	playback_panel.set_user_email(str(user.get("email", "guest")))
	playback_panel.set_selected_coach(selected_coach_id)
	_set_state(AppState.COACH_SELECT)


# Creates the starter XR routine on the account if it does not already exist.
func _ensure_demo_routine_exists() -> void:
	routine_list_panel.set_busy(true, "Checking starter routine...")
	var list_result: Dictionary = await api_client.list_routines(0, 50)
	routine_list_panel.set_busy(false)

	if not bool(list_result.get("ok", false)):
		routine_list_panel.set_status("Signed in, but the starter routine check could not complete.", false)
		return

	var routine_data: Variant = list_result.get("data", {})
	var summaries: Array = _extract_routine_summaries(routine_data)
	for summary_variant in summaries:
		if summary_variant is Dictionary:
			var summary: Dictionary = summary_variant
			var title: String = str(summary.get("title", "")).strip_edges()
			if title.to_lower() == XR_DEMO_ROUTINE_TITLE.to_lower():
				return

	routine_list_panel.set_busy(true, "Creating starter routine...")
	var exercises_result: Dictionary = await api_client.list_exercises(0, 100)
	if not bool(exercises_result.get("ok", false)):
		routine_list_panel.set_busy(false)
		routine_list_panel.set_status("Signed in, but the starter routine could not be created.", false)
		return

	var exercise_data: Variant = exercises_result.get("data", {})
	var exercise_records: Array = _extract_exercise_records(exercise_data)
	var exercises_by_asset_id: Dictionary = {}
	for exercise_variant in exercise_records:
		if exercise_variant is Dictionary:
			var exercise: Dictionary = exercise_variant
			var asset_id: String = str(exercise.get("animationAssetId", "")).strip_edges()
			if not asset_id.is_empty():
				exercises_by_asset_id[asset_id] = exercise

	var payload_items: Array = []
	for item_variant in XR_DEMO_ROUTINE_ITEMS:
		var item: Dictionary = item_variant
		var animation_asset_id: String = str(item.get("animationAssetId", "")).strip_edges()
		var exercise_record: Variant = exercises_by_asset_id.get(animation_asset_id, null)
		if not (exercise_record is Dictionary):
			routine_list_panel.set_busy(false)
			routine_list_panel.set_status("Signed in, but one or more starter exercises are missing from the catalogue.", false)
			return

		var exercise_detail: Dictionary = exercise_record
		var exercise_id: String = str(exercise_detail.get("id", "")).strip_edges()
		if exercise_id.is_empty():
			routine_list_panel.set_busy(false)
			routine_list_panel.set_status("Signed in, but the starter routine exercise IDs were incomplete.", false)
			return

		payload_items.append({
			"exerciseId": exercise_id,
			"sets": int(item.get("sets", 1)),
			"repsOrHoldSeconds": int(item.get("repsOrHoldSeconds", 30)),
			"coachingNotes": str(item.get("coachingNotes", "")).strip_edges(),
		})

	var create_payload: Dictionary = {
		"title": XR_DEMO_ROUTINE_TITLE,
		"targetArea": XR_DEMO_ROUTINE_TARGET_AREA,
		"estimatedDuration": XR_DEMO_ROUTINE_ESTIMATED_DURATION,
		"items": payload_items,
	}
	var create_result: Dictionary = await api_client.create_routine(create_payload)
	routine_list_panel.set_busy(false)

	if bool(create_result.get("ok", false)):
		routine_list_panel.set_status("Starter routine added to your account.", false)
		return

	routine_list_panel.set_status(
		str(create_result.get("message", "Signed in, but the starter routine could not be created.")),
		false
	)


# Loads the user's routine summaries and optionally selects the first routine.
func _load_routines(select_first: bool) -> void:
	routine_list_panel.set_busy(true, "Loading routines...")
	var result: Dictionary = await api_client.list_routines()
	routine_list_panel.set_busy(false)

	if not bool(result.get("ok", false)):
		routine_summaries.clear()
		selected_routine_detail.clear()
		routine_list_panel.clear_selection()
		routine_list_panel.set_routines([])
		routine_list_panel.set_status(str(result.get("message", "Could not load routines.")), true)
		return

	var data: Variant = result.get("data", {})
	routine_summaries = _extract_routine_summaries(data)
	routine_list_panel.set_user_email(str(api_client.get_current_user().get("email", "guest")))
	routine_list_panel.set_routines(routine_summaries)

	if routine_summaries.is_empty():
		selected_routine_detail.clear()
		routine_list_panel.clear_selection()
		routine_list_panel.set_status("No routines were returned for this account.", false)
		return

	routine_list_panel.set_status("Loaded %s routines." % routine_summaries.size(), false)
	if select_first:
		routine_list_panel.select_routine(0)
		await _load_routine_detail(0)


# Fetches the full detail for the selected routine.
func _load_routine_detail(index: int) -> void:
	if index < 0 or index >= routine_summaries.size():
		return

	var routine_summary: Dictionary = routine_summaries[index]
	var routine_id: String = str(routine_summary.get("id", ""))
	if routine_id.is_empty():
		return

	routine_list_panel.set_busy(true, "Loading routine detail...")
	var result: Dictionary = await api_client.get_routine(routine_id)
	routine_list_panel.set_busy(false)

	if not bool(result.get("ok", false)):
		selected_routine_detail.clear()
		routine_list_panel.set_status(str(result.get("message", "Could not load routine detail.")), true)
		return

	var data: Variant = result.get("data", {})
	selected_routine_detail = _extract_routine_detail(data)
	routine_list_panel.set_routine_detail(selected_routine_detail)
	routine_list_panel.set_status("Routine ready. Start playback when you're ready.", false)


# Extracts routine summary records from different API response shapes.
func _extract_routine_summaries(data: Variant) -> Array:
	if data is Array:
		return data.duplicate(true)

	if data is Dictionary:
		var record: Dictionary = data
		for key in ["content", "items", "routines", "results", "data"]:
			var nested: Variant = record.get(key, null)
			if nested is Array:
				return nested.duplicate(true)
			if nested is Dictionary:
				var nested_result: Array = _extract_routine_summaries(nested)
				if not nested_result.is_empty():
					return nested_result

	return []


# Extracts a full routine detail record from nested API response shapes.
func _extract_routine_detail(data: Variant) -> Dictionary:
	if data is Dictionary:
		var record: Dictionary = data
		var items: Array = _extract_routine_items(record)
		if record.has("id") or record.has("title") or record.has("targetArea") or not items.is_empty():
			var detail := record.duplicate(true)
			if items.is_empty():
				for key in ["data", "content", "routine", "result"]:
					var nested: Variant = record.get(key, null)
					if nested is Dictionary:
						var nested_detail: Dictionary = _extract_routine_detail(nested)
						if not nested_detail.is_empty():
							for nested_key in nested_detail.keys():
								if not detail.has(nested_key):
									detail[nested_key] = nested_detail[nested_key]
							items = _extract_routine_items(detail)
							break
			if not detail.has("items") and not items.is_empty():
				detail["items"] = items
			return detail

		for key in ["data", "content", "routine", "result"]:
			var nested: Variant = record.get(key, null)
			if nested is Dictionary:
				var detail_result: Dictionary = _extract_routine_detail(nested)
				if not detail_result.is_empty():
					return detail_result

	return {}


# Extracts the exercise item list from a routine record.
func _extract_routine_items(record: Dictionary) -> Array:
	for key in ["items", "exercises", "exerciseItems", "routineItems", "content"]:
		var value: Variant = record.get(key, null)
		if value is Array:
			return value.duplicate(true)

	return []


# Extracts exercise catalogue records from different API response shapes.
func _extract_exercise_records(data: Variant) -> Array:
	if data is Array:
		return data.duplicate(true)

	if data is Dictionary:
		var record: Dictionary = data
		for key in ["content", "items", "exercises", "results", "data"]:
			var nested: Variant = record.get(key, null)
			if nested is Array:
				return nested.duplicate(true)
			if nested is Dictionary:
				var nested_result: Array = _extract_exercise_records(nested)
				if not nested_result.is_empty():
					return nested_result

	return []


# Reloads the routine library without changing the current selection.
func _on_refresh_requested() -> void:
	await _load_routines(false)


# Clears the current session and returns the user to the auth screen.
func _on_logout_requested() -> void:
	api_client.logout()
	routine_summaries.clear()
	selected_routine_detail.clear()
	selected_coach_id = ""
	auth_panel.set_api_base_url(api_client.api_base_url if not api_client.api_base_url.is_empty() else DEFAULT_API_BASE_URL)
	auth_panel.clear_passwords()
	auth_panel.show_login_mode()
	auth_panel.set_busy(false)
	auth_panel.set_status("Signed out successfully.", false)
	coach_select_panel.set_selected_coach("")
	coach_select_panel.set_busy(false)
	coach_select_panel.set_status("Coach choice only affects the visual guide and does not change session tracking.", false)
	playback_panel.set_selected_coach("")
	_set_state(AppState.AUTH)


# Loads the detail for the routine selected in the library.
func _on_routine_selected(index: int) -> void:
	await _load_routine_detail(index)


# Stores the chosen coach, then loads the routine library.
func _on_coach_selected(coach_id: String) -> void:
	if coach_id.is_empty():
		return

	selected_coach_id = coach_id
	coach_select_panel.set_selected_coach(coach_id)
	playback_panel.set_selected_coach(coach_id)
	_set_state(AppState.ROUTINE_LIST)
	routine_list_panel.set_status("%s selected. Preparing your routine library..." % _coach_name_for_id(coach_id), false)
	await _ensure_demo_routine_exists()
	await _load_routines(true)


# Starts the playback flow for the currently selected routine.
func _on_start_requested() -> void:
	if selected_routine_detail.is_empty():
		routine_list_panel.set_status("Select a routine first.", true)
		return

	playback_panel.set_user_email(str(api_client.get_current_user().get("email", "guest")))
	playback_panel.set_selected_coach(selected_coach_id)
	playback_panel.load_routine(selected_routine_detail)
	_set_state(AppState.PLAYBACK)


# Returns from playback to the routine library screen.
func _on_playback_back_requested() -> void:
	_set_state(AppState.ROUTINE_LIST)
	routine_list_panel.set_status("Returned to your routine library.", false)


# Submits the completed session metrics and updates the success UI.
func _on_playback_submit_requested(payload: Dictionary, summary: Dictionary) -> void:
	playback_panel.set_busy(true, "Submitting session metrics...")
	var result: Dictionary = await api_client.create_session(payload)
	playback_panel.set_busy(false)

	if not bool(result.get("ok", false)):
		playback_panel.set_status(str(result.get("message", "Session submission failed.")), true)
		return

	var data: Variant = result.get("data", {})
	var response_data: Dictionary = data.duplicate(true) if data is Dictionary else {}
	playback_panel.show_submission_success(summary, response_data)
	routine_list_panel.set_status("Session metrics submitted successfully.", false)


# Forwards the selected coach animation state to the 3D playback scene.
func _on_playback_coach_state_changed(coach_state: Dictionary) -> void:
	if selected_coach_id.is_empty():
		return
	emit_signal("playback_coach_state_changed", selected_coach_id, coach_state)


# Forwards coach reposition requests to the 3D playback scene.
func _on_playback_coach_move_requested() -> void:
	if selected_coach_id.is_empty():
		return
	emit_signal("playback_coach_move_requested", selected_coach_id)


# Resolves a coach ID into the display name used in the UI.
func _coach_name_for_id(coach_id: String) -> String:
	for coach_variant in AVAILABLE_COACHES:
		if coach_variant is Dictionary:
			var coach: Dictionary = coach_variant
			if str(coach.get("id", "")) == coach_id:
				return str(coach.get("name", coach_id))
	return coach_id
