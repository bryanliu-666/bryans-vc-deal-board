# Security

## Data model

This project runs a server only on `127.0.0.1`, so it is reachable from the user's own computer but not exposed to the local network. Deal data is saved to `data/VC Deal Board.xlsx`; automatic copies are saved in `backups/`. Both folders are ignored by Git and are not transmitted to the project author.

## User responsibilities

- Keep the project folder in a private location on the computer.
- Treat the master workbook and backup Excel files as private because they contain deal information.
- Do not commit backups, `.env` files, credentials, or private deal exports to a public fork.
- Review repository changes before publishing a customized version.
- Close the app before moving or renaming its folder or master workbook.

## Reporting a vulnerability

Please open a GitHub security advisory for the repository rather than posting sensitive details in a public issue.

## Scope boundary

This repository is independent software. It has no technical connection to any private database, deployment, email account, or API.
