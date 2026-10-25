param([string]$Log, [string]$Cmd)
# Runs `node <Cmd>` detached in the project folder, writing stdout to .agents\<Log> and stderr to <Log>.err;
# <Log>.done appears when it has finished.
$root = 'c:\Users\k64163939\Develop\mrl-elevator-anatomy'
$out = Join-Path $root ".agents\$Log"
Remove-Item "$out", "$out.err", "$out.done" -ErrorAction SilentlyContinue
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$line = "cd /d `"$root`" && node $Cmd > `"$out`" 2> `"$out.err`" & echo done > `"$out.done`""
Start-Process -FilePath cmd.exe -ArgumentList '/c', $line -WindowStyle Hidden
