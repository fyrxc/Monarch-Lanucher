# Monarch Lanucher

Windows DayZ launcher built with WPF / .NET 8.

## This redesign

- Opens directly on **Servers** instead of a dashboard.
- Removes the old Home / News / Downloads clutter.
- Loads live DayZ server endpoints through Steam and queries the servers with A2S_INFO.
- Never inserts fake preview servers. If discovery fails, the launcher shows the error instead.
- Shows server name, map, players, measured query ping, address and a JOIN button.
- Search filters the live server rows.
- JOIN launches DayZ through Steam with the selected IP/port.
- Keeps a compact Monarch gray/white interface.
- Includes a GitHub self-updater and a separate updater executable so the launcher can replace its own files and restart.

## Build locally

Open PowerShell in the project folder:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\build.ps1
```

The script restores packages, runs tests, publishes the launcher + updater, and creates:

```text
artifacts\MonarchLauncher-win-x64\MonarchLauncher.App.exe
artifacts\MonarchLanucher-win-x64.zip
```

Run it with:

```powershell
.\artifacts\MonarchLauncher-win-x64\MonarchLauncher.App.exe
```

## GitHub updates — upload code, let GitHub build it

The included workflow is designed so you **do not have to manually build and upload a new ZIP every update**.

The easiest setup is:

1. Create a **public GitHub repository**.
2. Upload/push this entire project, including the `.github` folder, to the repository's `main` branch.
3. GitHub Actions automatically builds the launcher and creates a new GitHub Release.
4. Download/install that first GitHub-built release once. That build already contains the correct GitHub owner/repository information.
5. From then on, upload/push your changes to `main`. GitHub builds a new version automatically.
6. Players press **Check for Updates** in Monarch Lanucher. It downloads the newest release, closes the launcher, replaces the files, and starts it again.

The workflow is:

```text
.github\workflows\release.yml
```

Every push to `main` or `master` gets an automatic version like:

```text
v0.3.12
```

where `12` is the GitHub Actions run number. The release contains:

```text
MonarchLanucher-win-x64.zip
```

The launcher checks GitHub's latest release and compares that version to the version it is currently running.

### Important first-build detail

A local build cannot guess which GitHub repository you will eventually use, so its update button will say GitHub updates are not configured. The GitHub Actions build automatically injects the repository name before publishing. **Use the first GitHub Release as the copy you distribute to players.**

If you want to test updates from a local build, edit:

```text
src\MonarchLauncher.App\launcher-settings.json
```

and set:

```json
{
  "githubOwner": "YOUR_GITHUB_NAME_OR_ORG",
  "githubRepository": "YOUR_REPOSITORY_NAME",
  "updateAssetName": "MonarchLanucher-win-x64.zip"
}
```

## Server browser

The current server browser discovers a capped set of DayZ server endpoints through Steam's server-query infrastructure and queries those endpoints directly for live A2S information. Non-responsive endpoints are skipped rather than replaced with made-up data.

## Current limitation

The JOIN button currently connects with `-connect` and `-port`. Full DZSA-style Workshop dependency detection/download and automatic `-mod=` construction is the next major backend phase. Modded joins can fail until that part is added.
