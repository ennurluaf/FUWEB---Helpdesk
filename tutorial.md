# Turning the FUWEB Helpdesk into a proper GitHub project

This tutorial turns the FUWEB course folders into one clean GitHub repository where:

- every course stage is its **own branch**, and each branch builds on the one before it, so GitHub can show exactly what changed from week to week;
- `main` always holds the finished app;
- GitHub Actions **zip every branch automatically**, using only tracked files, so `node_modules/` and `.env` can never end up in a zip;
- tagging a stage publishes a **GitHub Release** with a downloadable zip.

It also works as a Git/GitHub reference: Part 4 covers moving between branches, comparing them, pushing, pulling, merging, and fixing common mistakes.

All commands are for **PowerShell** on Windows (the VS Code terminal works). Git commands are the same in Git Bash.

---

## Contents

0. [What you are building](#0-what-you-are-building)
1. [One-time setup](#1-one-time-setup)
2. [Create the repository and its GitHub Actions](#2-create-the-repository-and-its-github-actions)
3. [Build the course branches](#3-build-the-course-branches)
4. [Git & GitHub navigation guide](#4-git--github-navigation-guide)
5. [Zipping without node_modules and .env](#5-zipping-without-node_modules-and-env)
6. [Troubleshooting](#6-troubleshooting)
7. [Cheat sheet](#7-cheat-sheet)

---

## 0. What you are building

### Branch plan

Each branch comes from one folder in `School-Websites\Fuweb`:

| Branch | Source folder | Course stage |
| --- | --- | --- |
| `main` | — | Repository setup, then the finished app (merged from `06`) |
| `01-request-flow` | `starter` | Week 1 – trace a browser request through Express; in-memory ticket array; find the deliberate request fault |
| `02-express-api` | `api implementation with express` | Week 2 – REST routes for tickets, API contract (`docs/api-contract.md`), `test.cjs` |
| `03-async-communication` | `asynchronus communication` | `fetch()` and asynchronous UI (the folder is only a scaffold: its files are empty) |
| `04-data-exchange` | `api implementation with express` + `public/data-exchange` | JSON and XML fixtures: parse, validate, handle broken/invalid files |
| `05-api-testing` | `FUWEB_Helpdesk_Backend_Studenten` | Test a ready-made REST API; `API-test-report.md`, `tests.csv` |
| `06-postgres-helpdesk` | `displaying ticket status` | Final app: Express + PostgreSQL, all six lessons in one page |

Each branch starts from the previous branch and then replaces its files with the next folder. As a result:

```text
main ──●  (setup: .gitignore, Actions, tutorial)
        \
         ●── 01 ──●── 02 ──●── 03 ──●── 04 ──●── 05 ──●── 06
                                                         │
main ────────────────────────────────────────────────────● (fast-forward to 06)
```

so `git diff 02-express-api 04-data-exchange` (or GitHub's *Compare* page) shows exactly what that stage of the course added.

### Why a new repository?

Right now everything sits inside the big `School-Websites` repo, alongside unrelated HTML and CMS projects, and the commit messages there don't follow the course. A separate repo, `fuweb-helpdesk`, gives you a clean history, its own README, Actions, and Releases. Your old repo stays as it is.

> **Tip:** create the new repo **outside OneDrive** (for example `C:\dev\fuweb-helpdesk`). OneDrive tries to sync the thousands of small files in `node_modules`, which is slow and can lock files while Git is working on them.

---

## 1. One-time setup

### 1.1 Install the tools

| Tool | Check | Install |
| --- | --- | --- |
| Git | `git --version` | <https://git-scm.com/download/win> |
| GitHub CLI (optional but handy) | `gh --version` | `winget install GitHub.cli` |
| Node.js 18+ | `node --version` | <https://nodejs.org> |

### 1.2 Tell Git who you are (once per computer)

```powershell
git config --global user.name  "ennur"
git config --global user.email "ennurluaf@gmail.com"
git config --global init.defaultBranch main
git config --global pull.rebase false      # 'git pull' merges (simplest behaviour to learn)
```

### 1.3 Log in to GitHub

```powershell
gh auth login        # choose GitHub.com → HTTPS → "Login with a web browser"
```

Without `gh`, Git opens a browser login window (Git Credential Manager) the first time you push. Either way you only log in once.

### 1.4 Save your unfinished work in the old repo first

The old repo has uncommitted changes (`helpdesk.sql`, `public/lessons/app-00.js`). The copy steps below take files **as they are on disk**, so those changes will be included anyway. Committing them in the old repo as well keeps both repos consistent:

```powershell
cd "$HOME\OneDrive\Documents\Website\School-Websites"
git status
git add "Fuweb/displaying ticket status"
git commit -m "Save latest helpdesk work before moving to its own repo"
git push
```

---

## 2. Create the repository and its GitHub Actions

### 2.1 Create the local folder

```powershell
New-Item -ItemType Directory -Force C:\dev\fuweb-helpdesk
cd C:\dev\fuweb-helpdesk
git init -b main
```

### 2.2 `.gitignore`: what Git must never track

Create `.gitignore` in the repo root:

```gitignore
# Dependencies – reinstall with npm install
node_modules/

# Secrets – every developer keeps their own
.env
.env.*
!.env.example

# Logs, OS clutter, build output
*.log
.DS_Store
Thumbs.db
dist/
*.zip

# Local AI-assistant settings
.claude/
```

Git only ignores files that are **not already tracked**. If a file was committed before you added the rule, see [6.1](#61-node_modules-or-env-was-committed-by-accident).

### 2.3 `.gitattributes`: line endings and what to leave out of zips

Create `.gitattributes`:

```gitattributes
# Store text files with LF line endings, so Windows and the Linux runners agree
* text=auto

# Leave repo plumbing out of every zip produced by git archive / Download ZIP
.github        export-ignore
.gitattributes export-ignore
```

`export-ignore` is the zip equivalent of `.gitignore`: those files stay in the repo but are left out of `git archive` output, which includes GitHub's own **Download ZIP** button.

### 2.4 GitHub Action 1 – zip every branch on push

Create `.github/workflows/zip-branch.yml`:

```yaml
name: Zip branch

on:
  push:
    branches: ["**"]
  workflow_dispatch:        # adds a "Run workflow" button on the Actions tab

permissions:
  contents: read

jobs:
  zip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build a zip from tracked files only
        run: |
          NAME="fuweb-helpdesk-${GITHUB_REF_NAME//\//-}"
          echo "NAME=$NAME" >> "$GITHUB_ENV"
          mkdir -p dist
          # git archive packs only committed files, so ignored files
          # (node_modules/, .env) cannot be included.
          git archive --format=zip --prefix="$NAME/" -o "dist/$NAME.zip" HEAD

      - name: Fail if node_modules or .env is tracked
        run: |
          if unzip -Z1 "dist/$NAME.zip" | grep -E '(^|/)(node_modules/|\.env$)'; then
            echo "::error::node_modules or .env is committed. Run: git rm -r --cached <path>"
            exit 1
          fi
          echo "Zip contents:"
          unzip -Z1 "dist/$NAME.zip"

      - name: Unpack so the artifact download is a single zip, not a zip inside a zip
        run: |
          mkdir -p upload
          unzip -q "dist/$NAME.zip" -d upload

      - uses: actions/upload-artifact@v4
        with:
          name: ${{ env.NAME }}
          path: upload/
          retention-days: 30
```

After each push, open **Actions → Zip branch → the run → Artifacts** to download `fuweb-helpdesk-<branch>.zip`.

### 2.5 GitHub Action 2 – publish a Release when you push a tag

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags: ["v*", "stage-*"]

permissions:
  contents: write           # needed to create releases

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Zip the tagged commit
        run: |
          git archive --format=zip \
            --prefix="fuweb-helpdesk-$GITHUB_REF_NAME/" \
            -o "fuweb-helpdesk-$GITHUB_REF_NAME.zip" "$GITHUB_REF_NAME"

      - name: Create the GitHub release with the zip attached
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release create "$GITHUB_REF_NAME" "fuweb-helpdesk-$GITHUB_REF_NAME.zip" \
            --title "$GITHUB_REF_NAME" --generate-notes
```

Unlike Actions artifacts, which expire, Releases are permanent, so they're the right place for the zip you hand in for each stage.

### 2.6 GitHub Action 3 – basic check on every push and pull request

Create `.github/workflows/check.yml`:

```yaml
name: Check

on:
  push:
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        if: hashFiles('package-lock.json') != ''
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies exactly as locked
        if: hashFiles('package-lock.json') != ''
        run: npm ci

      - name: Syntax-check every JavaScript file
        if: hashFiles('package-lock.json') != ''
        run: git ls-files -z '*.js' '*.cjs' | xargs -0 -r -n1 node --check
```

The `if:` lines skip the job on branches without a `package-lock.json` (such as the setup commit on `main`).

### 2.7 First commit

Copy this tutorial into the new repo and commit the setup:

```powershell
Copy-Item "$HOME\OneDrive\Documents\Website\School-Websites\Fuweb\displaying ticket status\tutorial.md" .
git add .
git status            # check: only .gitignore, .gitattributes, .github/, tutorial.md
git commit -m "Set up repository: gitignore, attributes, GitHub Actions, tutorial"
```

### 2.8 Create the GitHub repo and push `main`

**With the GitHub CLI:**

```powershell
gh repo create fuweb-helpdesk --private --source . --remote origin --push
```

**Or on the website:** go to <https://github.com/new>, name the repo `fuweb-helpdesk`, and leave *"Add a README"* **unchecked** (an empty repo avoids a first-push conflict). Then run:

```powershell
git remote add origin https://github.com/ennurluaf/fuweb-helpdesk.git
git push -u origin main
```

`-u` (short for `--set-upstream`) links your local `main` to `origin/main`, so from then on plain `git push` and `git pull` know where to go.

---

## 3. Build the course branches

### 3.1 A helper that imports one course folder

Paste this into the **same PowerShell window** you'll use for the rest of Part 3. Functions only last for that session; if you open a new terminal, paste it again.

```powershell
$src = "$HOME\OneDrive\Documents\Website\School-Websites\Fuweb"

function Import-Stage([string]$folder) {
    # 1. Remove the previous stage's tracked files (keeps the repo plumbing)
    git rm -r -q --ignore-unmatch -- . ':!.github' ':!.gitignore' ':!.gitattributes' ':!tutorial.md'
    # 2. Copy the new stage in, skipping things that must never be committed
    robocopy "$src\$folder" . /E /XD node_modules .claude /XF .env .gitignore *.zip tutorial.md /NFL /NDL /NJH /NJS | Out-Null
    # 3. Stage everything and show what changed
    git add -A
    git status --short
}
```

**What happens to `node_modules` and `.env`?** `git rm` only deletes *tracked* files, so your local `node_modules` and `.env` (both ignored) stay on disk. `robocopy` is told not to copy them, and `.gitignore` would block them anyway. That's three layers of protection.

Before every commit below, look at the `git status --short` output and make sure it doesn't list `node_modules` or `.env`.

### 3.2 Branch `01-request-flow` (Week 1)

```powershell
git switch -c 01-request-flow          # create the branch from main and move onto it
Import-Stage "starter"
git commit -m "Week 1: trace a full-stack request with an in-memory Express API"
git push -u origin 01-request-flow
```

To try it: `npm install`, then `npm start`, then open <http://localhost:3000>.

### 3.3 Branch `02-express-api` (Week 2)

```powershell
git switch -c 02-express-api           # branches from 01, because that's where you are
Import-Stage "api implementation with express"
git commit -m "Week 2: implement ticket REST API with Express routes and API contract"
git push -u origin 02-express-api
```

### 3.4 Branch `03-async-communication`

```powershell
git switch -c 03-async-communication
Import-Stage "asynchronus communication"
git commit -m "Async communication: project scaffold"
git push -u origin 03-async-communication
```

> The source folder only has empty `server.cjs`, `public/app.js`, and `public/index.html`. You can fill them in later on this branch (the finished version of this lesson is `public/lessons/app-04.js` in the final app) and push again; Part 4.5 shows how to carry such a fix forward into later branches.

### 3.5 Branch `04-data-exchange`

The course README says: *copy `public/data-exchange` into the public folder of your existing Express project*. So this branch takes the Week 2 Express project and adds the fixtures:

```powershell
git switch -c 04-data-exchange
Import-Stage "api implementation with express"
robocopy "$src\public\data-exchange" public\data-exchange /E /NFL /NDL /NJH /NJS | Out-Null
New-Item -ItemType Directory -Force docs | Out-Null
Copy-Item "$src\README.txt" docs\data-exchange-instructions.txt
git add -A
git status --short
git commit -m "Data exchange: load, parse and validate JSON/XML ticket fixtures"
git push -u origin 04-data-exchange
```

Open <http://localhost:3000/data-exchange/> (served by Express, not via `file://`).

### 3.6 Branch `05-api-testing`

```powershell
git switch -c 05-api-testing
Import-Stage "FUWEB_Helpdesk_Backend_Studenten"
git commit -m "API testing: exercise a ready-made REST API and write the test report"
git push -u origin 05-api-testing
```

### 3.7 Branch `06-postgres-helpdesk` (final app)

```powershell
git switch -c 06-postgres-helpdesk
Import-Stage "displaying ticket status"
```

The final app reads its database password from `.env`, which is **not** committed. Add a template so others know what to fill in:

```powershell
@"
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=helpdesk
PGUSER=your_postgres_user
PGPASSWORD=your_postgres_password
# ENABLE_TEST_ROUTES=true
"@ | Set-Content -Encoding utf8 .env.example

git add .env.example
git status --short          # .env.example yes, .env NO
git commit -m "Final helpdesk: Express + PostgreSQL with lessons 1-6"
git push -u origin 06-postgres-helpdesk
```

> `helpdesk.sql` creates a `helpdesk_app` role with the placeholder password `ChangeMe_2026!`. That's fine for a course project, but don't reuse that password anywhere real.

### 3.8 Bring `main` up to the finished app

```powershell
git switch main
git merge 06-postgres-helpdesk     # "Fast-forward": main simply moves up to 06
git push
```

### 3.9 Tag each stage, which creates the Releases with zips

```powershell
git tag stage-01 01-request-flow
git tag stage-02 02-express-api
git tag stage-03 03-async-communication
git tag stage-04 04-data-exchange
git tag stage-05 05-api-testing
git tag stage-06 06-postgres-helpdesk
git tag v1.0 main
git push origin --tags
```

Each pushed tag triggers `release.yml`. The **Releases** page then lists one release per stage, each with its own clean zip.

### 3.10 Polish on GitHub

- **Settings → General → Default branch:** `main`.
- **Settings → Branches → Add rule** for `main`: *Require a pull request before merging*. This keeps `main` from being changed by accident; you then change it through pull requests (Part 4.6).
- **About** (gear icon on the repo home page): add a description and topics like `express`, `postgresql`, `fuweb`.
- Add a short root README on `main` that links to each branch. The `06` README already describes the final app.

---

## 4. Git & GitHub navigation guide

### 4.1 The mental model

```text
 working folder ──git add──▶ staging area ──git commit──▶ local branch ──git push──▶ GitHub (origin)
 (your files)               (next commit)                (history)    ◀──git pull───
```

- A **commit** is a snapshot of the whole project.
- A **branch** is a movable label pointing at a commit.
- **`origin`** is the nickname for your GitHub copy of the repo.
- `origin/02-express-api` is your computer's *last known* view of that branch on GitHub. `git fetch` updates it.

### 4.2 Where am I, and what exists?

```powershell
git status                          # current branch + changed files
git branch                          # local branches (* = current)
git branch -a                       # also the remote ones (remotes/origin/...)
git branch -vv                      # each branch, its upstream, and ahead/behind counts
git log --oneline --graph --all     # the whole tree of branches as a drawing
```

### 4.3 Moving between branches

```powershell
git switch 02-express-api           # go to an existing branch
git switch -                        # jump back to the previous branch
git switch -c my-experiment         # create a new branch here and switch to it
```

Switching branches **rewrites the files in your folder** to match that branch. Ignored files (`node_modules`, `.env`) are left alone, which has one consequence:

> **Always run `npm install` after switching** to a branch with a different `package.json`. For example, `06` needs `pg` and `dotenv`, and the earlier branches don't.

If Git refuses to switch because you have uncommitted changes, either commit them or put them aside temporarily:

```powershell
git stash                 # put uncommitted changes aside
git switch 05-api-testing
# ...look around...
git switch -
git stash pop             # bring the changes back
```

### 4.4 Comparing stages (seeing the course progression)

```powershell
git diff 01-request-flow 02-express-api --stat          # which files changed
git diff 01-request-flow 02-express-api -- server.cjs   # line-by-line for one file
git show 02-express-api:server.cjs                      # print a file from another branch
git restore --source 02-express-api -- server.cjs       # copy that file into your current branch
git log 01-request-flow..06-postgres-helpdesk --oneline # commits in 06 that aren't in 01
```

On **GitHub**: `https://github.com/ennurluaf/fuweb-helpdesk/compare/01-request-flow...02-express-api` shows the same diff in the browser. Use the branch dropdown (top-left of the file list) to browse any branch.

### 4.5 Committing, pushing, pulling

```powershell
git add server.cjs                  # stage one file
git add -A                          # stage everything (respects .gitignore)
git commit -m "Explain what and why"
git push                            # send commits to GitHub (upstream already set by -u)
git push -u origin new-branch       # first push of a new branch
```

```powershell
git fetch                           # download news from GitHub without changing your files
git pull                            # fetch + merge into the current branch
```

**Rule of thumb:** `git pull` before you start working and before you push. If you edited the repo on GitHub's website or from another computer, your push is rejected until you pull.

**Carrying a fix forward.** The branches build on each other, so a fix made on an early branch can be merged into the later ones:

```powershell
git switch 03-async-communication
# ...edit and commit the fix...
git push
git switch 04-data-exchange
git merge 03-async-communication    # resolve any conflicts (see 6.3), then:
git push
```

Repeat for `05`, `06`, and `main`. If the fix only matters for one stage, skip this.

### 4.6 Pull requests (the GitHub way to change `main`)

```powershell
git switch main
git pull
git switch -c fix-ticket-search
# ...edit, commit...
git push -u origin fix-ticket-search
gh pr create --base main --fill     # or click "Compare & pull request" on GitHub
```

On GitHub the PR shows the diff and the **Check** workflow result. Click **Merge**, then clean up locally:

```powershell
git switch main
git pull
git branch -d fix-ticket-search             # delete the local branch
git push origin --delete fix-ticket-search  # delete it on GitHub (or click the button in the PR)
```

### 4.7 Getting the repo on another computer

```powershell
git clone https://github.com/ennurluaf/fuweb-helpdesk.git
cd fuweb-helpdesk
git switch 04-data-exchange     # a remote branch becomes a local one automatically
npm install
```

For `06` you also need to create `.env` from the template: `Copy-Item .env.example .env`, then fill in your values.

### 4.8 Undoing things

| Situation | Command |
| --- | --- |
| Throw away changes to one file | `git restore server.cjs` |
| Unstage a file (keep the changes) | `git restore --staged server.cjs` |
| Fix the last commit message (not pushed yet) | `git commit --amend -m "Better message"` |
| Undo a commit that is already pushed | `git revert <commit-id>` (adds a new commit that undoes it) |
| See what the repo looked like at an older commit | `git switch --detach <commit-id>`, then `git switch -` to go back |

Avoid `git reset --hard` and `git push --force` on shared branches. They rewrite history and can delete work.

---

## 5. Zipping without `node_modules` and `.env`

### 5.1 Why `git archive`

The Windows "Send to → Compressed folder" option zips **everything in the folder**, including `node_modules` (tens of MB) and your `.env` password. `git archive` zips **only committed files**, so anything ignored is excluded automatically. GitHub's **Code → Download ZIP** button works the same way.

### 5.2 Zip one branch locally, without switching to it

```powershell
New-Item -ItemType Directory -Force ..\zips | Out-Null
git archive --format=zip --prefix=02-express-api/ -o ..\zips\02-express-api.zip 02-express-api
```

- `--prefix` puts everything inside a top-level folder within the zip.
- The last argument can be any branch, tag, or commit.
- **Uncommitted changes are not included.** Commit first.

### 5.3 Zip every branch at once

```powershell
New-Item -ItemType Directory -Force ..\zips | Out-Null
git for-each-ref --format='%(refname:short)' refs/heads | ForEach-Object {
    git archive --format=zip --prefix="$_/" -o "..\zips\fuweb-helpdesk-$_.zip" $_
    "zipped $_"
}
```

### 5.4 Check a zip before handing it in

```powershell
tar -tf ..\zips\02-express-api.zip                              # list contents (tar ships with Windows 10+)
tar -tf ..\zips\02-express-api.zip | Select-String "node_modules|\.env$"   # should print nothing
```

### 5.5 Zips from GitHub

| Where | When it exists | Expires? |
| --- | --- | --- |
| **Actions → Zip branch → run → Artifacts** | After every push to any branch | Yes, after 30 days |
| **Releases** | After pushing a `stage-*` or `v*` tag | No |
| **Code → Download ZIP** | Any branch, any time | No |

To make a fresh release after changes: `git tag stage-04-v2 04-data-exchange`, then `git push origin stage-04-v2`.

---

## 6. Troubleshooting

### 6.1 `node_modules` or `.env` was committed by accident

The **Zip branch** workflow fails with an error when this happens. To fix it:

```powershell
git rm -r --cached node_modules     # stop tracking it; your local copy stays
git rm --cached .env
git commit -m "Stop tracking node_modules and .env"
git push
```

If a real password was ever pushed, **change that password**. It remains in the Git history even after you remove the file.

### 6.2 `git push` is rejected ("fetch first" / "non-fast-forward")

GitHub has commits you don't have. Run `git pull`, resolve any conflicts, then push again.

### 6.3 Merge conflict

Git marks the conflicting part of the file:

```text
<<<<<<< HEAD
your version
=======
the other branch's version
>>>>>>> 03-async-communication
```

Edit the file so it contains what you want and delete the marker lines. VS Code shows *Accept Current / Incoming / Both* buttons for this. Then run:

```powershell
git add <file>
git commit            # completes the merge
```

To give up on the merge: `git merge --abort`.

### 6.4 "Your local changes would be overwritten by checkout"

Commit or `git stash` first (see 4.3).

### 6.5 App crashes after switching branch (`Cannot find module 'pg'`)

Run `npm install`. Each branch has its own dependencies (see 4.3).

### 6.6 Final app can't reach the database

Check that `.env` exists (it isn't in the repo; copy it from `.env.example`), that PostgreSQL is running, and that you ran `psql -U postgres -f helpdesk.sql`. The server listens on <http://127.0.0.1:6767>.

---

## 7. Cheat sheet

```text
WHERE AM I          git status · git branch -vv · git log --oneline --graph --all
MOVE                git switch <branch> · git switch -c <new> · git switch -
COMPARE             git diff <a> <b> --stat · git show <branch>:<file>
SAVE                git add -A · git commit -m "msg"
SYNC                git pull · git push · git push -u origin <branch> · git fetch
PARK WORK           git stash · git stash pop
MERGE               git switch <target> · git merge <source>
TAG / RELEASE       git tag stage-0X <branch> · git push origin --tags
ZIP (clean)         git archive --format=zip --prefix=<name>/ -o ..\<name>.zip <branch>
CHECK IGNORED       git check-ignore -v .env · git ls-files | Select-String node_modules
UNTRACK             git rm -r --cached <path>
AFTER EVERY SWITCH  npm install
```
