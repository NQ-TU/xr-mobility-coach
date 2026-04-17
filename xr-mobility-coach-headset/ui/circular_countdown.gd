class_name CircularCountdown
extends Control

var progress := 1.0:
	set(value):
		progress = clampf(value, 0.0, 1.0)
		queue_redraw()

var accent_color := Color(0.341176, 0.372549, 0.94902, 1.0):
	set(value):
		accent_color = value
		queue_redraw()

var track_color := Color(0.843137, 0.913725, 0.941176, 0.72):
	set(value):
		track_color = value
		queue_redraw()

var fill_color := Color(0.976471, 0.992157, 0.996078, 0.92):
	set(value):
		fill_color = value
		queue_redraw()

var stroke_width := 18.0:
	set(value):
		stroke_width = maxf(2.0, value)
		queue_redraw()

# Applies the default interaction settings for the countdown ring.
func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	queue_redraw()

# Redraws the control when its size changes.
func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		queue_redraw()

# Draws the filled center, track ring, and active progress arc.
func _draw() -> void:
	var radius: float = maxf(0.0, min(size.x, size.y) * 0.5 - stroke_width)
	var center: Vector2 = size * 0.5
	var inner_radius: float = maxf(0.0, radius - stroke_width * 0.7)

	if inner_radius > 0.0:
		draw_circle(center, inner_radius, fill_color)

	if radius <= 0.0:
		return

	var start_angle := -PI * 0.5
	draw_arc(center, radius, start_angle, start_angle + TAU, 96, track_color, stroke_width, true)

	if progress <= 0.0:
		return

	draw_arc(center, radius, start_angle, start_angle + TAU * progress, 96, accent_color, stroke_width, true)
