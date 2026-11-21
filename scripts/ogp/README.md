# OGP 画像

`public/ogp.png`(1200×630)の元データは `ogp.html` です。README の画像にも、この画像を使っています。

## 書き出し

Chrome がある環境で、プロジェクトのフォルダから PowerShell で実行します。

```powershell
$tmp = Join-Path $env:TEMP ("ogp-" + [guid]::NewGuid().ToString("N"))
$html = (Resolve-Path "scripts/ogp/ogp.html").Path -replace "\\", "/"
Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -Wait -ArgumentList @(
  "--headless=new", "--disable-gpu", "--no-first-run", "--user-data-dir=$tmp",
  "--window-size=1200,630", "--force-device-scale-factor=1", "--virtual-time-budget=8000",
  "--hide-scrollbars", "--screenshot=$((Resolve-Path 'public').Path)\ogp.png", "file:///$html"
)
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
```

フォント(M PLUS Rounded 1c、Rubik)は Google Fonts から読み込むため、ネットワークが必要です。
