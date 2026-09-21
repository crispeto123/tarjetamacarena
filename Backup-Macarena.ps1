$ErrorActionPreference='Stop'
$store=Join-Path $env:LOCALAPPDATA 'MacarenaPostgresTest'
$backup=Join-Path $store 'backups';New-Item -ItemType Directory -Force $backup | Out-Null
$env:PGPASSWORD=[IO.File]::ReadAllText((Join-Path $store 'password.txt'))
$file=Join-Path $backup ('macarena-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.dump')
& 'C:\Users\Julian\OneDrive\Documentos\Amigos_Del_Golf\macarena-postgres\runtime\pgsql\bin\pg_dump.exe' -h 127.0.0.1 -p 18777 -U macarena_test -Fc -f $file macarena
if($LASTEXITCODE -ne 0){throw 'Respaldo fallido'}
Write-Output "Respaldo creado: $file"
