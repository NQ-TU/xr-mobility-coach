class_name AuthPanelView
extends Control

signal login_requested(base_url: String, email: String, password: String)
signal register_requested(base_url: String, email: String, password: String)
signal restore_requested()

@onready var mode_tabs: TabContainer = $CenterContainer/GlassPanel/ContentMargin/ContentRow/FormCard/FormMargin/FormColumn/ModeTabs
@onready var api_base_url_input: LineEdit = $CenterContainer/GlassPanel/ContentMargin/ContentRow/FormCard/FormMargin/FormColumn/AdvancedBox/ApiBaseUrlInput
@onready var login_email_input: LineEdit = $CenterContainer/GlassPanel/ContentMargin/ContentRow/FormCard/FormMargin/FormColumn/ModeTabs/Login/FormFields/LoginEmailInput
@onready var login_password_input: LineEdit = $CenterContainer/GlassPanel/ContentMargin/ContentRow/FormCard/FormMargin/FormColumn/ModeTabs/Login/FormFields/LoginPasswordInput
@onready var login_button: Button = $CenterContainer/GlassPanel/ContentMargin/ContentRow/FormCard/FormMargin/FormColumn/ModeTabs/Login/LoginButton
@onready var register_email_input: LineEdit = $CenterContainer/GlassPanel/ContentMargin/ContentRow/FormCard/FormMargin/FormColumn/ModeTabs/Register/FormFields/RegisterEmailInput
@onready var register_password_input: LineEdit = $CenterContainer/GlassPanel/ContentMargin/ContentRow/FormCard/FormMargin/FormColumn/ModeTabs/Register/FormFields/RegisterPasswordInput
@onready var register_button: Button = $CenterContainer/GlassPanel/ContentMargin/ContentRow/FormCard/FormMargin/FormColumn/ModeTabs/Register/RegisterButton
@onready var restore_button: Button = $CenterContainer/GlassPanel/ContentMargin/ContentRow/FormCard/FormMargin/FormColumn/FooterActions/RestoreButton
@onready var status_label: Label = $CenterContainer/GlassPanel/ContentMargin/ContentRow/FormCard/FormMargin/FormColumn/StatusLabel

var is_busy := false

# Initializes the auth form and connects button actions.
func _ready() -> void:
	login_password_input.secret = true
	register_password_input.secret = true

	login_button.button_down.connect(_on_login_button_down)
	register_button.button_down.connect(_on_register_button_down)
	restore_button.button_down.connect(_on_restore_button_down)


# Updates the editable API base URL field.
func set_api_base_url(value: String) -> void:
	api_base_url_input.text = value


# Prefills the email inputs after restore or authentication.
func set_email_hint(value: String) -> void:
	login_email_input.text = value
	register_email_input.text = value


# Toggles form interactivity while auth requests are in flight.
func set_busy(next_busy: bool, status_text := "") -> void:
	is_busy = next_busy

	api_base_url_input.editable = not next_busy
	login_email_input.editable = not next_busy
	login_password_input.editable = not next_busy
	register_email_input.editable = not next_busy
	register_password_input.editable = not next_busy

	login_button.disabled = next_busy
	register_button.disabled = next_busy
	restore_button.disabled = next_busy
	mode_tabs.tabs_visible = not next_busy

	if not status_text.is_empty():
		set_status(status_text, false)


# Shows a success or error message at the bottom of the form.
func set_status(text: String, is_error := false) -> void:
	status_label.text = text
	status_label.modulate = Color(0.74, 0.21, 0.27, 1.0) if is_error else Color(0.25, 0.33, 0.45, 1.0)


# Switches the tab view back to the login form.
func show_login_mode() -> void:
	mode_tabs.current_tab = 0


# Clears the stored passwords after auth state changes.
func clear_passwords() -> void:
	login_password_input.text = ""
	register_password_input.text = ""


# Emits a login request using the current login form values.
func _on_login_button_down() -> void:
	emit_signal(
		"login_requested",
		api_base_url_input.text.strip_edges(),
		login_email_input.text.strip_edges(),
		login_password_input.text,
	)


# Emits a registration request using the current register form values.
func _on_register_button_down() -> void:
	emit_signal(
		"register_requested",
		api_base_url_input.text.strip_edges(),
		register_email_input.text.strip_edges(),
		register_password_input.text,
	)


# Requests a saved session restore from the auth panel.
func _on_restore_button_down() -> void:
	emit_signal("restore_requested")
