# QBoard

QBoard is an interactive isomorphic keyboard and multi-keyboard instrument for the browser.

## GitHub Pages

No build step is required. Publish the repository root with GitHub Pages and keep these paths unchanged:

```text
index.html
language/
musics/
tools/
  QBoardBridgeInstaller.exe
  QBoardBridge.exe
  QBoardBridgeInstaller.cs
  QBoardBridge.cs
  qboard-rawinput-bridge.ps1
  qboard-rawinput-bridge.zip
  README.txt
  start-qboard-bridge.cmd
```

In the GitHub repository, open **Settings > Pages**, select **Deploy from a branch**, then select the publishing branch and `/ (root)`.

## Independent external keyboards on Windows

Browsers often expose normal keyboards only as ordinary `keydown` events, which cannot identify the physical keyboard. QBoard therefore includes an optional local Raw Input bridge.

1. Open QBoard and download `QBoardBridgeInstaller.exe` from the manual or the local-bridge dialog.
2. Run the single-file installer and choose an install folder. It installs `QBoardBridge.exe`, registers `qboardbridge://`, copies the chosen path, and opens the bridge.
3. Paste the copied path into **Local bridge connection**, or browse to the install folder.
4. Press **Open bridge**. The narrow bridge panel should report that it is connected.
5. Add a bridge keyboard with `+`, then press one key on the desired physical keyboard to bind it.

The executables are unsigned, so Windows may show a first-run warning. The bridge listens only on `127.0.0.1:8765`. It accepts the published `https://cbv-deux.github.io` origin, local development pages, and the portable local file; other website origins receive HTTP 403.

The older PowerShell/ZIP bridge remains in `tools/` as a compatibility fallback.
