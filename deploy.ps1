# 포세린 타일 Q&A 챗봇 배포 스크립트
# 사용법: 이 폴더에서 우클릭 → PowerShell로 실행  또는  .\deploy.ps1

Set-Location $PSScriptRoot

# 1. Git 커밋 (변경된 파일 있을 때만)
$status = git status --porcelain
if ($status) {
  $msg = Read-Host "커밋 메시지 입력 (Enter = 'Update')"
  if (-not $msg) { $msg = "Update" }
  git add -A
  git commit -m $msg
  Write-Host "✓ Git 커밋 완료" -ForegroundColor Green
} else {
  Write-Host "변경 사항 없음 — 커밋 스킵" -ForegroundColor Yellow
}

# 2. GitHub 푸시
git push origin main 2>&1 | Out-Null
Write-Host "✓ GitHub 푸시 완료" -ForegroundColor Green

# 3. Vercel 배포
$authFile = "$env:APPDATA\com.vercel.cli\Data\auth.json"
$token = (Get-Content $authFile | ConvertFrom-Json).token
Write-Host "Vercel 배포 중..." -ForegroundColor Cyan
$result = vercel deploy --prod --yes --token $token 2>&1
$url = ($result | Select-String "https://inoex-chatbot.vercel.app").ToString().Trim()
Write-Host "✓ 배포 완료: https://inoex-chatbot.vercel.app" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
