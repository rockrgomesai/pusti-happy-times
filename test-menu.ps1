# Login request
$loginBody = @{
    username = "SuperAdmin"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"

Write-Host "Login Status: Success"
$token = $loginResponse.data.tokens.accessToken

# Menu request
$menuHeaders = @{
    Authorization = "Bearer $token"
}

$menuResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/menu-items/user-menu" -Method GET -Headers $menuHeaders

Write-Host "Menu Status: Success"
Write-Host "Menu Response:"
$menuResponse | ConvertTo-Json -Depth 5