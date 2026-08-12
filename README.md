# Bryan's VC Deal Board

Designed by [Bryan Liu](https://www.linkedin.com/in/bryanchangjiangliu/), a venture capital investor at Alumni Ventures.

Every VC runs into the same deal-flow problem. A promising company goes into Notion today, another gets buried in Slack tomorrow, and the next one ends up somewhere in an email thread. A few weeks later, we know we saw something interesting, but we can no longer remember where we put it.

I had the same problem. I have no technical background, but I wanted one simple, presentable place to keep the deals I care about and share them cleanly with other investors. So I decided to vibe-code it for myself.

Here it is: the Deal Board. It is intentionally small, local-first, and easy to make your own.

![License](https://img.shields.io/badge/license-MIT-2f2e2b)
![Local Excel](https://img.shields.io/badge/database-local%20Excel-6b6862)
![Local first](https://img.shields.io/badge/data-local--first-286543)

## What it does

- Keep every deal you want to remember in one clean place.
- See what each company does and the key round details at a glance.
- Find the right deal quickly when another investor asks what you are seeing.
- Pick a few deals and copy a clean, ready-to-send summary into email, WhatsApp, or iMessage.
- Keep your data in a normal Excel file on your computer, with automatic backups after every change.

## Start

1. Download this repository and unzip it into a permanent folder such as Documents, not a temporary Downloads folder.
2. On a Mac, open **Start Deal Board.command**. On Windows, open **Start Deal Board.bat**.
3. The first launch prepares the app and may take a minute. After that, the Deal Board opens automatically in your browser.

Node.js is required. If the launcher says it is missing, install the current LTS version from [nodejs.org](https://nodejs.org) and open the launcher again.

For developers, the equivalent commands are:

```bash
npm install
npm start
```

The app runs only on your own computer at [http://127.0.0.1:4173](http://127.0.0.1:4173). Keep the launcher window open while using it.

## Where the data lives

The first time the app starts, it creates:

```text
your-project-folder/
  data/
    VC Deal Board.xlsx       <- your master database
  backups/
    VC Deal Board [date].xlsx
```

Before every successful add, edit, delete, or restore, the previous version of the master Excel file is saved as a dated backup. The newest 50 backups are kept automatically. Use **Data & backup -> Open database folder** to see the master file, **Download an Excel copy** to make another copy, or **Restore from Excel** when needed.

Do not move or rename the master Excel file while the Deal Board is running. To move the whole app, close it first and move the entire project folder together.

Automatic backups protect against accidental edits and deletions. They do not protect against losing the entire computer or project folder, so occasionally keep an additional Excel copy in another trusted location.

## Privacy and security

- No connection to another private application or database.
- No analytics, authentication, AI model, cloud database, or hidden external network request.
- No user deal data is included in this repository.
- GitHub stores the app's source code, not the deals saved in the ignored local `data` and `backups` folders.

See [SECURITY.md](SECURITY.md) for safe publishing and reporting guidance.

## Customize or rebuild it

The complete plain-English build specification is in [MASTER_BUILD_PROMPT.md](MASTER_BUILD_PROMPT.md). A nontechnical user can give that file to a coding agent to build or customize their own copy.

## Future upgrade path

This edition is intentionally local and simple. A future multi-device version could use Vercel for hosting and Supabase for authentication and private data storage. That should be treated as a separate security-sensitive upgrade, not mixed into this local edition casually.

## License

[MIT](LICENSE)
