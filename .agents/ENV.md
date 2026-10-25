# Environment

- Node: v24.18.0 (Windows, PowerShell; chain with `;`)
- Browser found: `C:\Program Files\Google\Chrome\Application\chrome.exe` (also present: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`)
- Skill scripts (capture.mjs, drive.mjs, lines.mjs) read `CHROME_PATH`, then fall back to built-in paths that already include the Chrome path above.
- Skill dir (read-only): `C:\Users\k64163939\.kiro\skills\anatomy`

Command prefix:

```powershell
$env:CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'; node C:\Users\k64163939\.kiro\skills\anatomy\scripts\<capture|drive|lines>.mjs ...
```
