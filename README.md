# PDF43

Tools for [Open PDF Studio](https://github.com/OpenAEC-Foundation/open-pdf-studio) in one extension. Each tool can be switched on or off on the **Seed43** ribbon tab, and the choice is remembered.

| Tool | What it does |
|---|---|
| **OCR** | PaddleOCR (PP-OCR) text recognition, running locally. It finds every text line and turns it upright before reading, so drawings that mix horizontal and vertical text, and sheets stored sideways, read in one pass. On a test architectural sheet it read 380 clean words where the built-in Tesseract read 38, and every drawing number in the title blocks correctly. |

## Install

In Open PDF Studio: **File > Extensions > Browse**, find PDF43, **Install**. Or **Add custom** with `https://github.com/Seed-43/PDF43`, or download `pdf43.oppx` from the latest release and use **Install from File**.

**OCR:** open **Recognize Text (OCR)** and set **Engine** to **PDF43 OCR (PaddleOCR)**. The app then uses it for the searchable text layer, page labels and form recognition, and falls back to its built-in Tesseract if it fails. Needs an Open PDF Studio build with the OCR engine slot (`api.features.ocrEngines`).

## Build

```bash
npm install
node build.mjs                      # dist/pdf43.oppx
node test/run-node.mjs page.png     # the OCR pipeline in Node, for testing
```

Add a tool: give it a folder under `src/` and an entry in the `TOOLS` list in `src/index.js` (`start(api)` and `stop(api)`).

## Extension catalogue

This repository also holds the shared catalogue that Open PDF Studio reads under **Extensions > Browse**: [`extensions.json`](extensions.json). It works like the pyRevit extensions list.

To add your extension:

1. Publish it in its own GitHub repository.
2. Create a GitHub release with the `.oppx` package attached. The app installs the `.oppx` of the latest release and offers an update when a newer release appears. Use a tag such as `v1.2.0` that matches `version` in your `plugin.json`.
3. Open a pull request that adds one entry to `extensions.json`:

```json
{
  "id": "my-extension",
  "name": "My Extension",
  "description": "One or two sentences on what it does.",
  "author": "Your name",
  "repo": "https://github.com/you/my-extension",
  "tags": ["markup", "measure"]
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Must match `id` in your `plugin.json`: lower case letters, digits, `.`, `_`, `-` |
| `name`, `description`, `author` | yes | Description up to 400 characters |
| `repo` | yes, unless `package` | `https://github.com/owner/repo`; the latest release's `.oppx` is installed |
| `package` | no | A fixed `https://` link to a `.oppx` instead of `repo` |
| `version` | with `package` | The version `package` installs; an update is offered when it is newer |
| `sha256` | no | SHA-256 of `package`; a download that does not match is refused |
| `homepage`, `tags` | no | `homepage` defaults to `repo`; up to 8 tags |

Pull requests are reviewed before they are merged: the extension should do what its description says, and its source should be public.

**Not listed?** **Extensions > Add custom** installs any extension from a GitHub repository or `.oppx` link, or from a file. These are not reviewed, so only install extensions from people you trust. A company can also keep its own `extensions.json` and add its link under **Browse > Catalogues**.

## Licence

Apache-2.0. The bundled models and ONNX Runtime keep their own licences; see [NOTICE.md](NOTICE.md).
