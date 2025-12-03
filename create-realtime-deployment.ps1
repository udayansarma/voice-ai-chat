# Create Azure OpenAI Realtime API Deployment
# This script creates a gpt-realtime deployment in an existing Azure OpenAI resource
#
# USAGE:
# .\create-realtime-deployment.ps1 `
#     -SubscriptionId "12345678-1234-1234-1234-123456789012" `
#     -ResourceGroupName "voice-ai-rg" `
#     -OpenAIResourceName "your-openai-resource" `
#     -DeploymentName "gpt-realtime" `
#     -Location "eastus2"

param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$OpenAIResourceName,
    
    [Parameter(Mandatory=$false)]
    [string]$DeploymentName = "gpt-realtime",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus2",
    
    [Parameter(Mandatory=$false)]
    [string]$ModelName = "gpt-4o-realtime-preview",
    
    [Parameter(Mandatory=$false)]
    [string]$ModelVersion = "2024-12-17",
    
    [Parameter(Mandatory=$false)]
    [int]$Capacity = 1
)

function Write-Step($message) {
    Write-Host "===== $message =====" -ForegroundColor Green
}

function Write-Info($message) {
    Write-Host "INFO: $message" -ForegroundColor Blue
}

function Write-Error($message) {
    Write-Host "ERROR: $message" -ForegroundColor Red
}

function Write-Success($message) {
    Write-Host "SUCCESS: $message" -ForegroundColor Green
}

# Set subscription
Write-Step "Setting Azure Subscription"
az account set --subscription $SubscriptionId
Write-Info "Subscription set to: $SubscriptionId"

# Validate Azure OpenAI resource exists
Write-Step "Validating Azure OpenAI Resource"
$openAIExists = az cognitiveservices account show `
    --name $OpenAIResourceName `
    --resource-group $ResourceGroupName `
    --query "name" -o tsv 2>$null

if (-not $openAIExists) {
    Write-Error "Azure OpenAI resource '$OpenAIResourceName' not found in resource group '$ResourceGroupName'"
    Write-Info "Please create the Azure OpenAI resource first or verify the name and resource group"
    exit 1
}

Write-Success "Azure OpenAI resource found: $OpenAIResourceName"

# Check if deployment already exists
Write-Step "Checking for Existing Deployment"
$existingDeployment = az cognitiveservices account deployment show `
    --name $OpenAIResourceName `
    --resource-group $ResourceGroupName `
    --deployment-name $DeploymentName `
    --query "name" -o tsv 2>$null

if ($existingDeployment) {
    Write-Info "Deployment '$DeploymentName' already exists"
    $deploymentDetails = az cognitiveservices account deployment show `
        --name $OpenAIResourceName `
        --resource-group $ResourceGroupName `
        --deployment-name $DeploymentName `
        -o json | ConvertFrom-Json
    
    Write-Info "Current deployment details:"
    Write-Info "  Model: $($deploymentDetails.properties.model.name)"
    Write-Info "  Version: $($deploymentDetails.properties.model.version)"
    Write-Info "  Capacity: $($deploymentDetails.sku.capacity)"
    
    Write-Host "`nDeployment already exists. Skipping creation." -ForegroundColor Yellow
    exit 0
}

# Create the deployment
Write-Step "Creating Realtime API Deployment"
Write-Info "Deployment Name: $DeploymentName"
Write-Info "Model: $ModelName"
Write-Info "Version: $ModelVersion"
Write-Info "Capacity: $Capacity"

try {
    az cognitiveservices account deployment create `
        --name $OpenAIResourceName `
        --resource-group $ResourceGroupName `
        --deployment-name $DeploymentName `
        --model-name $ModelName `
        --model-version $ModelVersion `
        --model-format OpenAI `
        --sku-capacity $Capacity `
        --sku-name "Standard"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Deployment created successfully!"
        
        # Get deployment details
        $deployment = az cognitiveservices account deployment show `
            --name $OpenAIResourceName `
            --resource-group $ResourceGroupName `
            --deployment-name $DeploymentName `
            -o json | ConvertFrom-Json
        
        Write-Host "`n==============================================================================" -ForegroundColor Green
        Write-Host "DEPLOYMENT CREATED SUCCESSFULLY" -ForegroundColor Green
        Write-Host "==============================================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Deployment Details:" -ForegroundColor Cyan
        Write-Host "  Resource: $OpenAIResourceName" -ForegroundColor White
        Write-Host "  Deployment: $DeploymentName" -ForegroundColor White
        Write-Host "  Model: $($deployment.properties.model.name)" -ForegroundColor White
        Write-Host "  Version: $($deployment.properties.model.version)" -ForegroundColor White
        Write-Host "  Capacity: $($deployment.sku.capacity) units" -ForegroundColor White
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "1. Update your application configuration with:" -ForegroundColor White
        Write-Host "   AZURE_OPENAI_REALTIME_DEPLOYMENT=$DeploymentName" -ForegroundColor Gray
        Write-Host "2. Wait 2-3 minutes for deployment to be fully ready" -ForegroundColor White
        Write-Host "3. Test the deployment using your application" -ForegroundColor White
        Write-Host ""
        Write-Host "==============================================================================" -ForegroundColor Green
    } else {
        Write-Error "Failed to create deployment. Exit code: $LASTEXITCODE"
        exit 1
    }
} catch {
    Write-Error "Error creating deployment: $_"
    Write-Info "Common issues:"
    Write-Info "  - Model not available in region '$Location'"
    Write-Info "  - Insufficient quota for the model"
    Write-Info "  - Azure OpenAI service requires approval for Realtime API access"
    Write-Info ""
    Write-Info "Supported regions for gpt-4o-realtime-preview:"
    Write-Info "  - eastus2"
    Write-Info "  - swedencentral"
    exit 1
}
