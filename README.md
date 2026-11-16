# KölnHaus 2027 — 6-Roommate Cologne Housing Screener, Loan Modeler & Syndikat Hub

A free, centrally hosted collaborative dashboard built for **5 working professionals + 1 university student** targeting a move-in in **Cologne during Summer 2027** (Rent, Buy, ZVG Foreclosures, Erbpacht, or Mietshäuser Syndikat).

## Open-Source Foundations & Research
- **Scraping Architecture:** Inspired by [`orangecoding/fredy`](https://github.com/orangecoding/fredy) (multi-portal provider adapters & deduplication) and [`wiestju/ImmoScout`](https://github.com/wiestju/ImmoScout) (mobile JSON API querying).
- **AI Application Generation:** Informed by [`konradpa/wohnungssuche-bot`](https://github.com/konradpa/wohnungssuche-bot) with German 6er-WG landlord reframing and `dry_run`/human-in-the-loop outreach to avoid portal bans.
- **German Mortgage Math:** Modeled after [`Allaman/darlehenpy`](https://github.com/Allaman/darlehenpy) and [`alfkoehn/Darlehensrechner`](https://github.com/alfkoehn/Darlehensrechner) (NRW 6.5% *Grunderwerbsteuer*, *Annuitätendarlehen*, *Sondertilgung*, *Zinsbindung*, and multi-borrower splitting).

## 100% Free Central Hosting & Automated Notifications (GitHub Pages + GitHub Actions)
1. Push this folder to a **public GitHub repository** (GitHub Pages & Actions are 100% free on public repos).
2. In GitHub repo **Settings → Pages → Source**, choose **GitHub Actions**.
3. Optional: In **Settings → Secrets and variables → Actions**, add:
   - **Signal Notifications:** `CALLMEBOT_SIGNAL_PHONE` & `CALLMEBOT_SIGNAL_KEY` (zero-server free Signal webhook) OR `SIGNAL_REST_URL`, `SIGNAL_SENDER`, `SIGNAL_RECIPIENTS` (for Signal group chats via `signal-cli-rest-api`).
   - **Email Notifications:** `RESEND_API_KEY` (free 3,000 emails/mo tier) & `ALERT_EMAIL_TO` (comma-separated emails of all 6 roommates).
   - **Optional Portal Logins:** `IMMOSCOUT_COOKIE` (for ImmoScout24 Plus 48h early-access listings), `WGGESUCHT_COOKIE`, `KLEINANZEIGEN_COOKIE`.
4. `.github/workflows/scrape-and-deploy.yml` runs every 30 minutes (`*/30 * * * *`), updates `public/data/listings.json`, notifies via Signal/Email, and deploys the live dashboard to `https://<username>.github.io/<repo>/`.

## Local Development
```bash
npm install
npm run dev
```
*(On Windows PowerShell with script execution restricted, use `npm.cmd install` and `npm.cmd run dev`.)*
