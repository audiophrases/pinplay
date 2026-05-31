# PinPlay Teacher Setup

This wizard sets up your **own** free copy of PinPlay — your own quiz website,
your own backend, your own storage. Nothing you do here affects anyone else's
PinPlay, and your students' data stays in your own account.

## What you'll need

- A computer (Windows or Mac) with an internet connection.
- About 15 minutes.
- A debit/credit card for Cloudflare's R2 storage. **You will not be charged**
  for normal classroom use — the free allowance (10 GB) is far more than a class
  needs. Cloudflare just requires a card on file to switch storage on.
- (Optional) A free [Render](https://render.com) account if you want questions
  read aloud in natural "neural" voices. Skip it and PinPlay still reads questions
  using your device's built-in voice.

## How to run it (Windows — easiest)

You don't need to download anything first. Just:

1. Click the **Start** menu, type **PowerShell**, and open it.
2. Paste this one line and press **Enter**:

   ```text
   iwr https://raw.githubusercontent.com/audiophrases/pinplay/main/setup/install.ps1 | iex
   ```

That command installs Node.js if needed, downloads PinPlay into a `PinPlay`
folder in your user folder, and starts the wizard automatically. If Windows shows
a permission prompt while installing Node.js, click **Yes**.

> If pasting the command is blocked by your system's security policy, use the
> "Manual steps" below instead.

### Manual steps (Mac, or if the one-liner is blocked)

1. Install **Node.js** (the "LTS" version) from <https://nodejs.org>.
2. Download PinPlay: go to the project's GitHub page, click the green **Code**
   button ➜ **Download ZIP**, and unzip it. That folder is your "PinPlay folder."
3. Open a terminal (Windows: **PowerShell**; Mac: **Terminal**), go to the PinPlay
   folder, and run:

   ```text
   node setup/pinplay-setup.mjs
   ```

## What happens next

Follow the on-screen steps. The wizard opens the right web pages for you and
pauses whenever it needs you to do something (like signing in or clicking a
button), then continues when you press **ENTER**.

When it finishes, it prints your three links:

- **Teacher page** (`…/create/`) — where you build quizzes and host live games.
- **Student page** (`…/`) — where students join.
- **Assignment links** (`…/?assignment=CODE`) — for homework.

## Updating later

When PinPlay gets new features or fixes, just run:

```text
node setup/pinplay-setup.mjs --update
```

That one command does everything: it **downloads the newest PinPlay version for
you** and re-publishes it to your existing setup. You do not need to know about
git or download anything by hand. It does **not** ask for your account, password,
or storage again — your quizzes, students, and settings stay exactly as they are.

Run it whenever you're told a new version is out (or every now and then to stay
current). If your internet hiccups during the download, it safely re-publishes
the version you already have, and you can simply run it again later.

## Notes

- Everything the wizard generates for you lives in `setup/.generated/` and is
  private to your computer (it's never shared or committed).
- If something goes wrong, you can safely run the wizard again — it picks up
  where it can.

## If some students can't load PinPlay on a restrictive network

Your site and backend run on Cloudflare's free `*.workers.dev` domain. A few very
strict networks (some hospitals, guest Wi-Fi, school content filters) block
`workers.dev`. If a student reports that pages or images won't load on such a
network — but it works elsewhere — that's the cause.

The fix is to put your own **custom domain** in front of your Cloudflare Worker
(a domain on `*.workers.dev` becomes e.g. `quiz.yourname.com`). This requires
owning a domain and adding it in the Cloudflare dashboard
(Workers & Pages ➜ your worker ➜ Settings ➜ Domains & Routes ➜ Add Custom Domain).
It's optional and only needed if you actually hit a blocked network.
