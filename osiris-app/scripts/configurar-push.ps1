# Configura o push seguro: segredo no Vault e na Edge Function, aplica a migration e publica a send-push.
# Rode a partir de osiris-app/, com a Supabase CLI logada e o projeto linkado:
#   powershell -ExecutionPolicy Bypass -File scripts/configurar-push.ps1
# O segredo é gerado aqui, nunca é impresso e o arquivo SQL temporário é apagado no fim.

$ErrorActionPreference = 'Stop'
$projectRef = 'atghygulbvmtflcipcsr'
$projectUrl = "https://$projectRef.supabase.co"

$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$buf = New-Object byte[] 32
$rng.GetBytes($buf)
$secret = -join ($buf | ForEach-Object { $_.ToString('x2') })

$sqlFile = Join-Path ([IO.Path]::GetTempPath()) ("osiris-vault-" + [guid]::NewGuid() + '.sql')
$sql = @"
delete from vault.secrets where name in ('project_url', 'push_webhook_secret');
select vault.create_secret('$projectUrl', 'project_url');
select vault.create_secret('$secret', 'push_webhook_secret');
select count(*) as segredos from vault.secrets where name in ('project_url', 'push_webhook_secret');
"@
[IO.File]::WriteAllText($sqlFile, $sql, (New-Object Text.UTF8Encoding $false))

try {
    Write-Host '1/4 Guardando segredos no Vault...'
    npx supabase db query --linked -f $sqlFile -o csv
    if ($LASTEXITCODE -ne 0) { throw 'falha ao gravar no Vault' }

    Write-Host '2/4 Configurando o segredo da Edge Function...'
    npx supabase secrets set "PUSH_WEBHOOK_SECRET=$secret" --project-ref $projectRef | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'falha ao configurar o secret da função' }
}
finally {
    [IO.File]::Delete($sqlFile)
    $secret = $null
    $sql = $null
}

Write-Host '3/4 Aplicando a migration...'
npx supabase db push --linked
if ($LASTEXITCODE -ne 0) { throw 'falha no db push' }

Write-Host '4/4 Publicando a função send-push...'
npx supabase functions deploy send-push --project-ref $projectRef --use-api --no-verify-jwt
if ($LASTEXITCODE -ne 0) { throw 'falha no deploy da função' }

Write-Host 'Pronto. Push configurado.'
