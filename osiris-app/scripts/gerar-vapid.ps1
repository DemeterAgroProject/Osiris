# Gera um novo par de chaves VAPID para o Web Push e configura a Edge Function send-push.
# Rode a partir de osiris-app/, com a Supabase CLI logada:
#   powershell -ExecutionPolicy Bypass -File scripts/gerar-vapid.ps1
# A chave privada nunca é impressa. A pública é mostrada no fim, para ir na Vercel como VITE_VAPID_PUBLIC_KEY.
# Inscrições de push feitas com o par antigo deixam de receber notificações: a pessoa precisa entrar de novo no app.

param([string]$ProjectRef = 'atghygulbvmtflcipcsr')

$ErrorActionPreference = 'Stop'

Write-Host '1/3 Gerando o par de chaves...'
$json = npx --yes web-push@3.6.7 generate-vapid-keys --json
if ($LASTEXITCODE -ne 0) { throw 'falha ao gerar as chaves' }
$keys = $json | Out-String | ConvertFrom-Json
if (-not $keys.publicKey -or -not $keys.privateKey) { throw 'resposta inesperada do web-push' }

try {
    Write-Host '2/3 Gravando as chaves nos secrets da Edge Function...'
    npx supabase secrets set "VAPID_PUBLIC_KEY=$($keys.publicKey)" "VAPID_PRIVATE_KEY=$($keys.privateKey)" --project-ref $ProjectRef | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'falha ao gravar os secrets' }

    Write-Host '3/3 Atualizando VITE_VAPID_PUBLIC_KEY no .env local...'
    $envFile = Join-Path (Get-Location) '.env'
    $line = "VITE_VAPID_PUBLIC_KEY=`"$($keys.publicKey)`""
    if (Test-Path $envFile) {
        $content = [IO.File]::ReadAllText($envFile)
        if ($content -match '(?m)^VITE_VAPID_PUBLIC_KEY=.*$') {
            $content = [regex]::Replace($content, '(?m)^VITE_VAPID_PUBLIC_KEY=.*$', $line)
        } else {
            $content = $content.TrimEnd() + [Environment]::NewLine + $line + [Environment]::NewLine
        }
        [IO.File]::WriteAllText($envFile, $content, (New-Object Text.UTF8Encoding $false))
    } else {
        Write-Host '   (.env não encontrado: crie-o a partir do .env.example)'
    }

    Write-Host ''
    Write-Host 'Pronto. Coloque esta chave na Vercel como VITE_VAPID_PUBLIC_KEY e faça um redeploy:'
    Write-Host ''
    Write-Host $keys.publicKey
}
finally {
    $keys = $null
    $json = $null
}
