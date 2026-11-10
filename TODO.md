# Seed43: required changes

## Member placement should work like the line tool (done)

Placing a member in elevation or plan (point A to point B) should behave
like drawing a line in the app:

- click point A, then point B (not only press-drag-release);
- hold **Ctrl** or **Shift** to keep the member horizontal or vertical
  (snap the angle), as the line tool does.

Noted 2026-11-05. Done 2026-11-05: click A then B with a live preview and
the length beside the cursor; press-drag-release also works; Ctrl or Shift
keeps it horizontal or vertical, both together also allow 45 degrees; Esc
cancels after point A. See `src/library/elements.js` and
`docs/host-changes.md` (a two-point draw mode in the host would replace the
work-around).

## Snapping and grip points for elements (done)

- Elements snap to centre lines and ends: a member's centre-line ends and
  midpoint, and other elements' centre and end points.
- Choose which grip point you place and move by: centre or either end
  (for a section: its centre; for a member: point A, point B or the
  midpoint), and drag a grip to move or stretch the element.

Noted 2026-11-05. Done 2026-11-05: placing and grip drags snap to member
ends A and B, midpoints and centre lines, and section and bolt group
centres, with a marker and its name while hovering. A member is placed by
End A, Midpoint or End B (chosen in the library window footer). A selected
element shows its grips: drag A or B to stretch a member, the midpoint or a
centre to move. The host's own tools do not snap to Seed43 elements yet:
see `docs/host-changes.md`.

## Timber sizes in the library (done)

Add timber to the NZ library (sawn timber sizes and grades, gauged,
glulam / LVL such as Prolam and hyJOIST), placed like the steel sections
(section, elevation, plan). Possible source: the timber families in the
Revit model (Timber Framing, TIMBER GAUGED, Prolam Posts, hyJOIST,
TaranakiPine), checked against the supplier tables before use.

Noted 2026-11-05. Done 2026-11-05: Timber gauged (11 sizes), Glulam / LVL
posts (Prolam, 6) and I-joists (hyJOIST, 6), with the new shapes Rectangle
(timber, drawn with a cross) and I-joist. All rows come from the Revit type
names and are marked `"check": true`; no section properties were added.
Still to do by Fred: the finished Prolam sizes and grades, the hyJOIST
flange depth `tf` and web `tw` (from the Futurebuild design guide), grades
for the gauged sizes, and TaranakiPine (not in the list given).

## Element Library window: needs TLC (done)

The library window works but needs a redesign and polish. Fred is deciding
what it should look like; do not change it until he has said how.

Noted 2026-11-05. Done 2026-11-05 to Fred's brief: filter and browse tree on
the left, search across the top with breadcrumb, back, forward and home and
a result count, a grid of to-scale preview tiles or the editable table
(list view), a details panel, and Place as Section / Elevation / Plan in the
footer.
