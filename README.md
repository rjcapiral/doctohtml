# Doc to HTML

Convert a Google Doc or Word (.docx) file into clean, copy-paste-ready HTML, right in your browser.

> **Note:** This project was generated with **Claude**, an AI assistant made by Anthropic. It was not hand-written by the repository owner. Review the code and test it with your own documents before relying on it.

## How to use

1. **Upload .docx:** drop in a Word file. In Google Docs, get one with *File → Download → Microsoft Word (.docx)*.
2. **Paste from Google Docs:** copy content in Google Docs, click the paste box, and paste.
3. Copy the HTML from the **HTML** tab, or check it in the **Preview** tab.

## What the output looks like

- Plain semantic HTML: headings, paragraphs, lists, tables, links, bold and italic.
- No inline styles, classes or Google-specific markup.
- Images are not included. Each one is replaced with an `<image>` placeholder.
- The revision-colour legend table ("Checklist to 1st Revision - Green Text …") is removed.
- Underline formatting is not kept.

## Privacy

Everything runs in your browser. Documents are not uploaded to any server. The page loads one library (Mammoth) from the jsDelivr CDN, so it needs an internet connection.

## Files

- `index.html`: page layout and styles
- `app.js`: conversion and cleanup logic

## Hosting on GitHub Pages

Put `index.html` and `app.js` at the repo root, then go to **Settings → Pages**, choose the `main` branch and `/ (root)`, and save.

## Credits

- Generated with [Claude](https://claude.ai) (Anthropic).
- .docx conversion by [Mammoth.js](https://github.com/mwilliamson/mammoth.js) (BSD-2-Clause license).

## Disclaimer

Provided as is, with no warranty. Always check converted HTML before publishing it.
