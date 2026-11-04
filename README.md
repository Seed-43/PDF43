# PDF43

Extensions for [Open PDF Studio](https://github.com/OpenAEC-Foundation/open-pdf-studio), and the shared catalogue of extensions for [Open PDF Studio](https://github.com/OpenAEC-Foundation/open-pdf-studio). The app reads [`extensions.json`](extensions.json) from this repository and lists every entry under **Extensions > Browse**, where it installs with one click. It works like the pyRevit extensions list.

## Add your extension

1. Publish your extension in its own GitHub repository.
2. Create a GitHub release and attach the `.oppx` package as a release asset. The app installs the `.oppx` of the latest release and offers an update when you publish a newer one. Use a version tag such as `v1.2.0` that matches `version` in your `plugin.json`.
3. Open a pull request here that adds one entry to `extensions.json`:

```json
{
  "id": "my-extension",
  "name": "My Extension",
  "description": "One or two sentences on what it does.",
  "author": "Your name",
  "repo": "https://github.com/you/my-extension",
  "homepage": "https://...",
  "tags": ["markup", "measure"]
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Must match `id` in your `plugin.json`: lower case letters, digits, `.`, `_`, `-` |
| `name` | yes | Shown in the list |
| `description` | yes | Up to 400 characters |
| `author` | yes | |
| `repo` | yes, unless `package` | `https://github.com/owner/repo`; the latest release's `.oppx` is installed |
| `package` | no | A fixed `https://` link to a `.oppx` instead of `repo` (for repositories that hold several extensions) |
| `version` | with `package` | The version that `package` installs; the app offers an update when it is newer than the installed one |
| `sha256` | no | SHA-256 of `package`; the app refuses a download that does not match |
| `homepage` | no | Defaults to `repo` |
| `tags` | no | Up to 8 |

Pull requests are reviewed before they are merged: the extension should do what its description says, and its source should be public.

## Install an extension that is not listed

**Extensions > Add custom** installs any extension from a GitHub repository link or a direct `.oppx` link, or from a file. These are not reviewed, so only install extensions from people you trust.

## Your own catalogue

A company can keep its own `extensions.json` in the same format and add its raw link under **Extensions > Browse > Catalogues**.

## Extensions in this repository

| Extension | What it does |
|---|---|
| [Lens OCR](extensions/lens-ocr) | PaddleOCR text recognition for drawings and scans: reads horizontal and vertical text, runs locally |
