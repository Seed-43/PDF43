# Host changes that would help Seed43

Seed43 places members click by click, snaps to its own elements and shows
grips without changing Open PDF Studio. A few things are done around the
plug-in API rather than through it. These are the host changes that would
let Seed43 drop those work-arounds. Nothing here is required for Seed43 to
work today.

## 1. The pointer position for plug-in tools between clicks

**Today.** A `drawMode: 'click'` tool gets `create(x, y, ..., e, state)` on
each press and nothing in between, so the plug-in cannot draw a live preview
from point A to the cursor. Seed43 listens to `pointermove` on `window` and
maps screen pixels to page points itself, the way the host does in
`js/tools/tool-context.js` (`resolvePointerCoords`): the `#annotation-canvas`
rectangle with `window.__pdfViewport` (zoom, offsetX, offsetY), or the
`.canvas-container-cont` of the page in the continuous view. Every click the
host hands over is used to check and correct that mapping
(`src/library/overlay.js`). It draws the preview on its own canvas layer over
the page.

**Limits of the work-around.** A rotated view (#200) is not mirrored; there
the preview and snap markers can be off until the next click (the placed
element is still right, because the clicks come from the host). It reads
`window.__pdfViewport` and DOM class names that are not part of the API.

**Wanted.** One of:

- `drawMode: 'twoPoint'`: the host collects A and B like the line tool
  (click-click and press-drag-release, Ctrl/Shift square, type a length),
  calls `preview(ctx, ax, ay, cx, cy, state, e)` while moving and
  `create(ax, ay, bx, by, e, state)` at B; or
- `handler.onPointerMove(x, y, e, state)` for plug-in tools plus a host
  preview pass that calls `preview()` for `click` tools as well; and
- `api.toPagePoint(event)` returning `{ page, x, y }` (and the inverse) for
  any pointer event, rotation included.

## 2. Snap points from plug-in annotation types

**Today.** `collectSnapPoints` in `js/tools/snap-engine.js` only knows the
host's own types; plug-in annotations give no snap points. So the host's
tools (line, dimension, move) do not snap to Seed43 member ends or section
centres, and dragging an element by its body (the host's move) does not snap
to them either. Seed43 snaps its own placing and grip drags to its own
elements (`src/library/snap.js`) and uses the host's snapped click point
(`state.startX`, `state.startY`) as the fallback.

**Wanted.** An optional `getSnapPoints(annotation)` on the annotation-type
handler returning `[{ x, y, type: 'endpoint' | 'midpoint' | 'center' }]`,
and `getSnapEdges(annotation)` returning centre-line segments, collected by
`collectSnapPoints` / `getEdgeSegments`. Also `api.snap(page, x, y)` so a
plug-in can use the host's snap result (PDF content, grid, polar) while the
pointer moves.

## 3. Grips (handles) for plug-in annotation types

**Today.** The host shows the bounding-box handles of a selected plug-in
annotation; resizing one changes `x/y/width/height`, which means nothing for
a member drawn from `startX/startY` to `endX/endY`. Seed43 draws its own
grips (A, B, midpoint; centre for sections and bolt groups) and catches a
press on a grip with a `pointerdown` listener on `window` in the capture
phase, before the host sees it. The drag ends in one
`api.applyAnnotationBatch` update (one undo step).

**Wanted.** An optional `getHandles(annotation)` returning
`[{ id, x, y, cursor }]` and `applyHandle(annotation, id, x, y, e)` returning
the changes, so the host draws the grips, runs the drag with its own snapping
and type-a-length input, and records the undo step.

## 4. Noted while testing

- After Esc ends a drawing tool, the first click on an annotation with the
  Select tool does not select it; the second does. This happens with the
  host's own box tool too, so it is not Seed43's doing.
