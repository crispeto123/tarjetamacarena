$ErrorActionPreference='Stop'
$runtime='C:\Users\Julian\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$pgBin='C:\Users\Julian\OneDrive\Documentos\Amigos_Del_Golf\macarena-postgres\runtime\pgsql\bin'
$store=Join-Path $env:LOCALAPPDATA 'MacarenaPostgresTest'
$mutex=[Threading.Mutex]::new($false,'Local\TarjetaMacarenaPrincipal')
if(-not $mutex.WaitOne(0)){exit}
try {
  & (Join-Path $pgBin 'pg_ctl.exe') -D (Join-Path $store 'data') status *> $null
  if($LASTEXITCODE -ne 0){& (Join-Path $pgBin 'pg_ctl.exe') -D (Join-Path $store 'data') -l (Join-Path $store 'server.log') -o '-p 18777 -h 127.0.0.1' -w start; if($LASTEXITCODE -ne 0){throw 'No se pudo iniciar PostgreSQL'}}
  $env:PGHOST='127.0.0.1';$env:PGPORT='18777';$env:PGDATABASE='macarena';$env:PGUSER='macarena_app';$env:PGPASSWORD=[IO.File]::ReadAllText((Join-Path $store 'app-password.txt'))
  $env:DATA_DIR=Join-Path $store 'app-data';$env:HOST='0.0.0.0';$env:PORT='8769'
  Set-Location $PSScriptRoot
  while($true){& $runtime server.cjs >> (Join-Path $store 'application.log') 2>&1;Start-Sleep -Seconds 5}
} finally {$mutex.ReleaseMutex();$mutex.Dispose()}
