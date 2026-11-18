<#
.SYNOPSIS
  Deploys KölnHaus 2027 to Google Cloud Run (Always-Free-eligible us-central1) with
  a shared group password and persistent cross-device sync via Google Cloud Storage.

.EXAMPLE
  .\deploy-cloudrun.ps1 -ProjectId "koelnhaus-2027" -GroupPassword "OurAgreedSecretPassword"
#>

param(
  [Parameter(Mandatory=$true)]
  [string]$ProjectId,

  [Parameter(Mandatory=$true)]
  [string]$GroupPassword,

  [string]$Region = "us-central1",
  [string]$ServiceName = "koelnhaus-2027"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  Write-Error "gcloud CLI is not installed. Install from https://cloud.google.com/sdk/docs/install then run 'gcloud auth login'."
}

Write-Host "1/5 Setting active GCP project to $ProjectId..." -ForegroundColor Cyan
gcloud config set project $ProjectId

Write-Host "2/5 Enabling required APIs (Cloud Run, Cloud Build, Artifact Registry, Storage)..." -ForegroundColor Cyan
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com

$BucketName = "$ProjectId-koelnhaus-state"
Write-Host "3/5 Ensuring free-tier GCS state bucket gs://$BucketName in $Region..." -ForegroundColor Cyan
$bucketExists = gcloud storage buckets list --filter="name=$BucketName" --format="value(name)"
if (-not $bucketExists) {
  gcloud storage buckets create "gs://$BucketName" --location=$Region --uniform-bucket-level-access
}

$SessionSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

Write-Host "4/5 Building & deploying to Cloud Run ($Region, scale-to-zero min-instances=0)..." -ForegroundColor Cyan
gcloud run deploy $ServiceName `
  --source . `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --min-instances=0 `
  --max-instances=2 `
  --memory=256Mi `
  --cpu=1 `
  --set-env-vars="GROUP_PASSWORD=$GroupPassword,SESSION_SECRET=$SessionSecret,GCS_STATE_BUCKET=$BucketName"

Write-Host "5/5 Done! Share this URL and your agreed Group Password with your roommates:" -ForegroundColor Green
gcloud run services describe $ServiceName --region $Region --format="value(status.url)"
