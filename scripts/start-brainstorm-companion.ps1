param(
  [int]$Port = 52341
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SessionDir = Join-Path $ProjectRoot ".superpowers\brainstorm\manual-design"
$ContentDir = Join-Path $SessionDir "content"
$StateDir = Join-Path $SessionDir "state"
$SkillServer = "C:\Users\kensa\.codex\plugins\cache\openai-curated\superpowers\dc902811\skills\brainstorming\scripts\server.cjs"

New-Item -ItemType Directory -Force -Path $ContentDir, $StateDir | Out-Null

$env:BRAINSTORM_DIR = $SessionDir
$env:BRAINSTORM_HOST = "127.0.0.1"
$env:BRAINSTORM_URL_HOST = "localhost"
$env:BRAINSTORM_PORT = "$Port"

@"
<h2>RoastPlus Design Companion</h2>
<p class="subtitle">&#12371;&#12398;&#30011;&#38754;&#12364;&#35211;&#12360;&#12390;&#12356;&#12428;&#12400;&#12289;&#12499;&#12472;&#12517;&#12450;&#12523;&#12467;&#12531;&#12497;&#12491;&#12458;&#12531;&#12399;&#27491;&#24120;&#12395;&#21205;&#12356;&#12390;&#12356;&#12414;&#12377;&#12290;</p>

<div class="options">
  <div class="option" data-choice="ready" onclick="toggleSelect(this)">
    <div class="letter">OK</div>
    <div class="content">
      <h3>&#25509;&#32154;&#12391;&#12365;&#12414;&#12375;&#12383;</h3>
      <p>&#12371;&#12398;&#12354;&#12392; DESIGN.md &#12398;&#26041;&#21521;&#24615;&#12434;&#12486;&#12461;&#12473;&#12488;&#12392;&#24517;&#35201;&#12394;&#27604;&#36611;&#30011;&#38754;&#12391;&#27770;&#12417;&#12390;&#12356;&#12365;&#12414;&#12377;&#12290;</p>
    </div>
  </div>
</div>
"@ | Set-Content -Encoding UTF8 (Join-Path $ContentDir "welcome.html")

Write-Host ""
Write-Host "Brainstorm Companion を起動します。"
Write-Host "この PowerShell は閉じずに置いてください。"
Write-Host ""
Write-Host "URL: http://localhost:$Port"
Write-Host "Session: $SessionDir"
Write-Host ""

node $SkillServer
