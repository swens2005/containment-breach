<#
.SYNOPSIS
    Sets the three GitHub Actions secrets the dashboard's deploy needs
    (story 13).

.DESCRIPTION
    Run this yourself, in your own terminal, from the repo root:

        powershell -ExecutionPolicy Bypass -File scripts\set-deploy-secrets.ps1

    It asks for the FTP server, user and password of the web host and
    sends them to GitHub as FTP_SERVER, FTP_USERNAME and FTP_PASSWORD.
    No value is printed or saved. The next push to main then publishes
    the dashboard.
#>

$ErrorActionPreference = 'Stop'
$repo = 'swens2005/containment-breach'

function Read-Plain([string] $prompt) {
    $value = Read-Host -Prompt $prompt
    if ([string]::IsNullOrWhiteSpace($value)) { throw "$prompt cannot be empty." }
    return $value.Trim()
}

function Read-Secret([string] $prompt) {
    $secure = Read-Host -Prompt $prompt -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
    if ([string]::IsNullOrEmpty($value)) { throw "$prompt cannot be empty." }
    return $value
}

# Sends the value on stdin, so it never appears in the process list.
function Set-RepoSecret([string] $name, [string] $value) {
    $psi = New-Object Diagnostics.ProcessStartInfo 'gh', "secret set $name --repo $repo"
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $process = [Diagnostics.Process]::Start($psi)
    $stdin = New-Object IO.StreamWriter($process.StandardInput.BaseStream, (New-Object Text.UTF8Encoding $false))
    $stdin.Write($value)
    $stdin.Close()
    $errors = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw "Setting $name failed: $errors" }
    Write-Host "  set $name" -ForegroundColor Green
}

gh auth status *> $null
if ($LASTEXITCODE -ne 0) { throw 'Log in to GitHub first: gh auth login' }

Write-Host "`nThe web host's FTP account (the one that logs in to the home folder)."
$server = Read-Plain 'FTP server'
$user = Read-Plain 'FTP user'
$password = Read-Secret 'FTP password (hidden)'

Write-Host "`nSending the secrets to $repo ..."
Set-RepoSecret 'FTP_SERVER' $server
Set-RepoSecret 'FTP_USERNAME' $user
Set-RepoSecret 'FTP_PASSWORD' $password

Write-Host "`nDone. The next push to main publishes the dashboard; nothing secret was shown or saved." -ForegroundColor Cyan
