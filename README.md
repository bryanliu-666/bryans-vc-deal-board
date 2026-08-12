# Bryan's VC Deal Board

Designed by [Bryan Liu](https://www.linkedin.com/in/bryanchangjiangliu/), a venture capital investor at Alumni Ventures.

A small, local-first web app for keeping a clean, presentation-ready list of deals and copying selected opportunities into email or messaging apps.

![License](https://img.shields.io/badge/license-MIT-2f2e2b)
![No backend](https://img.shields.io/badge/backend-none-6b6862)
![Local first](https://img.shields.io/badge/data-local--first-286543)

## What it does

- Add, edit, search, filter, and delete deals.
- Track stage, raising status, round size, valuation, lead investor, tier, tags, a one-liner, and a shareable blurb.
- Select several deals and copy them in a clean format for Gmail, WhatsApp, iMessage, or another messaging app.
- Keep data in the current browser with no account, server, or external database.
- Download and restore a JSON backup.

## Start

No installation is required. Download this repository and open `index.html` in a modern browser.

For a more reliable local URL, run a simple local server from the project folder:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Where the data lives

Deals are stored in the browser's `localStorage`. They are not uploaded to GitHub and are not sent to Bryan or to any external service.

Browser data can disappear if someone clears site data, switches browsers, or changes computers. Use **Data & backup -> Download backup** regularly. The downloaded JSON file can be stored anywhere and restored through **Data & backup -> Restore backup**.

## Privacy and security

- No connection to another private application or database.
- No analytics, authentication, AI model, API, database, or hidden network request.
- No user deal data is included in this repository.
- GitHub stores the app's source code, not the deals entered in a user's browser.

See [SECURITY.md](SECURITY.md) for safe publishing and reporting guidance.

## Customize or rebuild it

The complete plain-English build specification is in [MASTER_BUILD_PROMPT.md](MASTER_BUILD_PROMPT.md). A nontechnical user can give that file to a coding agent to build or customize their own copy.

## Future upgrade path

This edition is intentionally local and simple. A future multi-device version could use Vercel for hosting and Supabase for authentication and private data storage. That should be treated as a separate security-sensitive upgrade, not mixed into this local edition casually.

## License

[MIT](LICENSE)
