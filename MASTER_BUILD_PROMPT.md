# Bryan's VC Deal Board - Master Build Prompt

Designed by [Bryan Liu](https://www.linkedin.com/in/bryanchangjiangliu/), a venture capital investor at Alumni Ventures.

## Instructions for the coding agent

Build a small, polished, local-first web app called **VC Deal Board**. It should help a venture capital investor maintain and present a concise list of deals. Its source of truth must be a visible Excel file on the user's computer, not browser storage.

The user may not have an engineering background. Explain setup and usage in plain language. Do not require the user to understand databases, terminals, environment variables, or hosting.

Before writing code, ask the user:

1. Where should the project folder be created on their computer?
2. Where should the app keep its master Excel database and automatic backup folder?

Create the project in the agreed location. Inside it, create `data/VC Deal Board.xlsx` as the master database and `backups/` for dated Excel backups. Tell the user exactly where both folders are. Do not use browser `localStorage`, IndexedDB, cookies, or browser cache as the source of truth.

## Product scope

Create one page only. Apart from the small local server required to write the Excel file, do not add authentication, AI, a cloud backend, a cloud database, analytics, email integration, profile pages, or subpages.

The page should include:

- Product title
- Search
- Compact filters
- Add Deal button
- Copy Selected button
- Data & Backup menu
- Responsive grid of deal cards

Each deal should support these fields:

- Company name
- Company website
- One-liner
- Stage
- Raising status: Raising, Raising soon, Not raising, or Unknown
- Round size
- Valuation
- Lead investor
- Tier: 1, 2, or 3
- Tags
- Shareable blurb, written as short bullet points

## Core behavior

### Add and edit

- The Add Deal button opens a focused dialog.
- A user can edit every field later from the card.
- Clicking outside the dialog must not discard typed content.
- View and edit typography should feel consistent.
- Do not create a separate deal profile page.

### Search and filters

- Search across every deal field.
- Filter by raising status and tier.
- Default sort: Tier 1 first, then Tier 2, then Tier 3; alphabetize within each tier.
- Filters should feel instant and should not shift the layout.

### Copy Selected

- Every deal card has a quiet selection checkbox.
- Copy Selected is disabled when nothing is selected.
- Copy both rich HTML and plain text when the browser supports it.
- Use this output format for each deal:

```text
Company Name (company website URL)
One-liner
• First blurb point
• Second blurb point
```

- In rich-text destinations, make the linked company name bold and the one-liner italic.
- Separate deals with one blank line.
- Do not add an email greeting, closing, signature, or invented context.

### Data and backup

- Run a small server bound only to `127.0.0.1`; never expose it to the local network.
- Store every deal in `data/VC Deal Board.xlsx` inside the project folder.
- Create the workbook automatically on first launch.
- Format the workbook so a nontechnical user can open and understand it in Excel: clear headers, frozen header row, filters, readable column widths, wrapped blurbs, and clickable website links.
- Before every successful add, edit, delete, or restore, preserve the previous master file as a dated `.xlsx` copy in `backups/`, then replace the master file atomically.
- Keep the newest 50 automatic backups so the folder does not grow forever.
- Never tell the user a change succeeded until the Excel write succeeds.
- Serialize writes and detect conflicting saves from multiple browser tabs.
- Provide a Data & Backup menu with:
  - Open database folder
  - Download an Excel copy
  - Restore from a Deal Board Excel file
- Validate restored workbooks and show a friendly error without damaging the current master file.
- Keep `data/`, `backups/`, exports, `.env` files, and private files out of Git with `.gitignore`.
- No hidden external network calls at runtime.

## Visual direction

The interface should feel calm, precise, and presentation-ready, inspired by Notion rather than a colorful SaaS dashboard.

- Warm off-white page background
- White cards
- Fine stone-gray borders
- Small corner radius, no oversized pills
- Minimal shadows
- Compact spacing with comfortable reading line height
- Dark neutral primary button
- Restrained green, amber, and gray status tags
- System sans-serif body type
- Stable card dimensions and no visual jump when editing
- No gradients, decorative illustrations, oversized hero, marketing copy, or bright blue accents

The cards should make it easy to present deals on screen. Show the company name, website, one-liner, status, stage, tier, round size, valuation, lead investor, full blurb, and tags without requiring a second page.

## Responsive behavior

- Two-column card grid on desktop when space allows.
- One-column layout on a phone or narrow window.
- Header actions may wrap cleanly but must remain readable.
- Text must never overlap buttons.
- Long values should truncate only in compact metadata fields; the one-liner and blurb should remain readable.

## Technical constraints

- Prefer plain HTML, CSS, and JavaScript for the interface, plus a small local Node.js server.
- Use a well-maintained Excel library and lock its exact version.
- Provide one-click launchers for Mac and Windows. On first launch, they may install the locked dependency; later launches should start immediately.
- Keep the code small and understandable.
- Escape user-provided content before inserting it into HTML.
- Use semantic HTML and accessible labels.
- Confirm destructive deletion.
- Add a standard `.gitignore`, MIT license, README, and security notes.
- Do not include example private deals, API keys, personal email addresses, or links to another private application.

## Completion checklist

Before finishing:

1. Test add, edit, delete, search, filters, selection, copy, Excel write, automatic backup, download, and restore.
2. Test desktop and mobile widths.
3. Confirm the add/edit dialog cannot be dismissed by an accidental outside click.
4. Scan the repository for API keys, credentials, personal deal data, local file paths, and links to private systems.
5. Open the generated workbook and verify that all fields, multiline blurbs, URLs, and Unicode text survive a round trip.
6. Tell the user exactly where the project folder, master Excel database, and automatic backups are located.

## Optional future upgrade

Keep this version local-first. If the user later needs secure multi-device access, suggest a separate upgrade using Vercel and Supabase. Explain that this introduces authentication, database security, hosting, and ongoing maintenance and should be designed deliberately.
