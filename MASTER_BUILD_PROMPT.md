# Bryan's VC Deal Board - Master Build Prompt

Designed by [Bryan Liu](https://www.linkedin.com/in/bryanchangjiangliu/), a venture capital investor at Alumni Ventures.

## Instructions for the coding agent

Build a small, polished, local-first web app called **VC Deal Board**. It should help a venture capital investor maintain and present a concise list of deals.

The user may not have an engineering background. Explain setup and usage in plain language. Do not require the user to understand databases, terminals, environment variables, or hosting.

Before writing code, ask the user:

1. Where should the project folder be created on their computer?
2. Are they comfortable storing deal data in the current browser and downloading a backup file to a folder they choose?

Clarify that browser local storage does not create a normal database file they can see in Finder. The app should provide **Download backup** and **Restore backup** so the user can keep a visible JSON backup wherever they prefer.

## Product scope

Create one page only. Do not add authentication, AI, a backend, a cloud database, analytics, email integration, profile pages, or subpages.

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

- Store deals only in browser `localStorage`.
- No hidden network calls.
- Provide a Data & Backup menu with:
  - Download backup as JSON
  - Restore backup from JSON
- Clearly explain that clearing browser data can remove deals.
- Validate imported backup files and show a friendly error if the file is invalid.

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

- Prefer plain HTML, CSS, and JavaScript so the project has no required packages and can run locally.
- Keep the code small and understandable.
- Escape user-provided content before inserting it into HTML.
- Use semantic HTML and accessible labels.
- Confirm destructive deletion.
- Add a standard `.gitignore`, MIT license, README, and security notes.
- Do not include example private deals, API keys, personal email addresses, or links to another private application.

## Completion checklist

Before finishing:

1. Test add, edit, delete, search, filters, selection, copy, backup, and restore.
2. Test desktop and mobile widths.
3. Confirm the add/edit dialog cannot be dismissed by an accidental outside click.
4. Scan the repository for API keys, credentials, personal deal data, local file paths, and links to private systems.
5. Tell the user exactly where the project folder is located and where downloaded backup files will normally appear.

## Optional future upgrade

Keep this version local-first. If the user later needs secure multi-device access, suggest a separate upgrade using Vercel and Supabase. Explain that this introduces authentication, database security, hosting, and ongoing maintenance and should be designed deliberately.

