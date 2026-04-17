class_name XrApiClient
extends Node

const SESSION_FILE := "user://xr_auth.cfg"

@export var api_base_url := "http://localhost:8080"

var token := ""
var current_user: Dictionary = {}

# Loads any saved auth session when the API client starts.
func _ready() -> void:
	load_session()

# Stores a normalized API base URL for future requests.
func set_base_url(value: String) -> void:
	api_base_url = _normalize_base_url(value)

# Returns whether the client currently has an auth token.
func is_authenticated() -> bool:
	return not token.is_empty()

# Returns a copy of the cached signed-in user record.
func get_current_user() -> Dictionary:
	return current_user.duplicate(true)

# Restores any saved token and user data from local storage.
func load_session() -> void:
	if not FileAccess.file_exists(SESSION_FILE):
		return

	var config: ConfigFile = ConfigFile.new()
	if config.load(SESSION_FILE) != OK:
		return

	api_base_url = _normalize_base_url(str(config.get_value("auth", "base_url", api_base_url)))
	token = str(config.get_value("auth", "token", ""))
	var email := str(config.get_value("auth", "email", ""))
	var user_id := str(config.get_value("auth", "user_id", ""))
	if not email.is_empty() and not user_id.is_empty():
		current_user = {
			"email": email,
			"userId": user_id,
		}

# Clears the current session and removes the saved auth file.
func logout() -> void:
	_clear_session()

# Verifies the saved session against the backend.
func restore_session() -> Dictionary:
	if not is_authenticated():
		return _failure(0, "No saved session found.")

	return await fetch_me()

# Registers a new user and stores the returned auth details.
func register_user(email: String, password: String) -> Dictionary:
	var result: Dictionary = await _request_json(
		HTTPClient.METHOD_POST,
		"/api/auth/register",
		{
			"email": email,
			"password": password,
		},
		false,
	)

	if bool(result.get("ok", false)):
		_apply_auth_payload(result.get("data", {}))

	return result

# Signs in an existing user and stores the returned auth details.
func login_user(email: String, password: String) -> Dictionary:
	var result: Dictionary = await _request_json(
		HTTPClient.METHOD_POST,
		"/api/auth/login",
		{
			"email": email,
			"password": password,
		},
		false,
	)

	if bool(result.get("ok", false)):
		_apply_auth_payload(result.get("data", {}))

	return result

# Fetches the currently authenticated user profile.
func fetch_me() -> Dictionary:
	var result: Dictionary = await _request_json(HTTPClient.METHOD_GET, "/api/auth/me")
	var data: Variant = result.get("data", {})
	if bool(result.get("ok", false)) and data is Dictionary:
		current_user = data.duplicate(true)
		_save_session()
	return result

# Loads a page of routine summaries from the backend.
func list_routines(page := 0, size := 10, sort := "createdAt,desc") -> Dictionary:
	var query: String = "?page=%s&size=%s&sort=%s" % [
		String.num_int64(page),
		String.num_int64(size),
		sort.uri_encode(),
	]
	return await _request_json(HTTPClient.METHOD_GET, "/api/routines%s" % query)

# Loads exercise records used by the XR routine and playback flow.
func list_exercises(page := 0, size := 100, sort := "name,asc") -> Dictionary:
	var query: String = "?page=%s&size=%s&sort=%s" % [
		String.num_int64(page),
		String.num_int64(size),
		sort.uri_encode(),
	]
	return await _request_json(HTTPClient.METHOD_GET, "/api/exercises%s" % query)

# Fetches the full detail for a single routine.
func get_routine(routine_id: String) -> Dictionary:
	return await _request_json(HTTPClient.METHOD_GET, "/api/routines/%s" % routine_id.uri_encode())

# Creates a new routine for the signed-in user.
func create_routine(payload: Dictionary) -> Dictionary:
	return await _request_json(HTTPClient.METHOD_POST, "/api/routines", payload)

# Submits a completed session payload to the backend.
func create_session(payload: Dictionary) -> Dictionary:
	return await _request_json(HTTPClient.METHOD_POST, "/api/sessions", payload)

# Sends an HTTP JSON request and normalizes the result shape.
func _request_json(method: HTTPClient.Method, path: String, body: Variant = null, include_auth := true) -> Dictionary:
	var request: HTTPRequest = HTTPRequest.new()
	add_child(request)

	var headers: PackedStringArray = PackedStringArray(["Accept: application/json"])
	if body != null:
		headers.append("Content-Type: application/json")
	if include_auth and not token.is_empty():
		headers.append("Authorization: Bearer %s" % token)

	var payload: String = ""
	if body != null:
		payload = JSON.stringify(body)

	var error: int = request.request(_with_base(path), headers, method, payload)
	if error != OK:
		request.queue_free()
		return _failure(0, "Could not start request (%s)." % error)

	var response: Array = await request.request_completed
	request.queue_free()

	var transport_result: int = response[0]
	var status_code: int = response[1]
	var response_body: PackedByteArray = response[3]
	if transport_result != HTTPRequest.RESULT_SUCCESS:
		return _failure(status_code, "Network request failed (%s)." % transport_result)

	var body_text: String = response_body.get_string_from_utf8()
	var data: Variant = null
	if not body_text.is_empty():
		data = JSON.parse_string(body_text)
		if data == null:
			data = body_text

	if status_code >= 200 and status_code < 300:
		return _success(data)

	if status_code == 401:
		_clear_session()

	var message: String = _extract_error_message(data)
	if message.is_empty():
		message = "Request failed with status %s." % status_code
	return _failure(status_code, message)

# Applies token and user fields returned from auth responses.
func _apply_auth_payload(data: Dictionary) -> void:
	token = str(data.get("token", ""))
	current_user = {
		"userId": str(data.get("userId", "")),
		"email": str(data.get("email", "")),
	}
	_save_session()

# Persists the current auth session to local storage.
func _save_session() -> void:
	if token.is_empty():
		return

	var config: ConfigFile = ConfigFile.new()
	config.set_value("auth", "base_url", api_base_url)
	config.set_value("auth", "token", token)
	config.set_value("auth", "email", str(current_user.get("email", "")))
	config.set_value("auth", "user_id", str(current_user.get("userId", "")))
	config.save(SESSION_FILE)

# Clears saved auth state from memory and disk.
func _clear_session() -> void:
	token = ""
	current_user.clear()
	if FileAccess.file_exists(SESSION_FILE):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(SESSION_FILE))

# Joins a relative API path to the current base URL.
func _with_base(path: String) -> String:
	if path.begins_with("http"):
		return path

	var base: String = _normalize_base_url(api_base_url)
	if base.is_empty():
		return path

	if path.begins_with("/"):
		return "%s%s" % [base, path]

	return "%s/%s" % [base, path]

# Trims whitespace and trailing slashes from the base URL.
func _normalize_base_url(value: String) -> String:
	var cleaned: String = value.strip_edges()
	while cleaned.ends_with("/"):
		cleaned = cleaned.left(cleaned.length() - 1)
	return cleaned

# Extracts a readable error message from different response shapes.
func _extract_error_message(data: Variant) -> String:
	if data is String:
		return data.strip_edges()

	if data is Dictionary:
		var record: Dictionary = data
		for key in ["message", "detail", "error", "title"]:
			var value = record.get(key)
			if value is String and not value.strip_edges().is_empty():
				return value.strip_edges()

		var errors = record.get("errors", [])
		if errors is Array:
			for entry in errors:
				var nested: String = _extract_error_message(entry)
				if not nested.is_empty():
					return nested

		var serialized: String = JSON.stringify(record)
		if serialized != "{}":
			return serialized

	return ""

# Wraps a successful request in the shared result format.
func _success(data: Variant) -> Dictionary:
	return {
		"ok": true,
		"status": 200,
		"data": data,
		"message": "",
	}

# Wraps a failed request in the shared result format.
func _failure(status: int, message: String) -> Dictionary:
	return {
		"ok": false,
		"status": status,
		"data": null,
		"message": message,
	}
