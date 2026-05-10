param(
    [Parameter(Mandatory = $false)]
    [string]$InputSource = "url",

    [Parameter(Mandatory = $false)]
    [string]$RecipeUrl = "",

    [Parameter(Mandatory = $false)]
    [string]$RecipeTextPath = "",

    [Parameter(Mandatory = $false)]
    [string]$RecipeType = "auto"
)

$emptySentinel = "__EMPTY__"

function Normalize-OptionalValue {
    param(
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmedValue = $Value.Trim()

    if ($trimmedValue -eq $emptySentinel) {
        return ""
    }

    return $trimmedValue
}

$normalizedInputSource = if ([string]::IsNullOrWhiteSpace($InputSource)) {
    "url"
}
else {
    $InputSource.Trim().ToLowerInvariant()
}

$normalizedType = if ([string]::IsNullOrWhiteSpace($RecipeType)) {
    "auto"
}
else {
    $RecipeType.Trim().ToLowerInvariant()
}

$trimmedUrl = Normalize-OptionalValue -Value $RecipeUrl

if ($normalizedInputSource -eq "texte") {
    $resolvedRecipeTextPath = if ([string]::IsNullOrWhiteSpace($RecipeTextPath)) {
        Join-Path $PSScriptRoot "recipe-import-input.txt"
    }
    else {
        $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($RecipeTextPath)
    }

    if (-not (Test-Path -LiteralPath $resolvedRecipeTextPath)) {
        throw "Le fichier texte de recette est introuvable : $resolvedRecipeTextPath"
    }

    $recipeText = Get-Content -Raw -LiteralPath $resolvedRecipeTextPath

    if ([string]::IsNullOrWhiteSpace($recipeText)) {
        throw "Le fichier texte de recette est vide : $resolvedRecipeTextPath"
    }

    $sourceBlock = @"
Source input : texte
Fichier texte : $resolvedRecipeTextPath
Texte recette :
--- DEBUT RECETTE ---
$recipeText
--- FIN RECETTE ---
"@
}
else {
    if ([string]::IsNullOrWhiteSpace($trimmedUrl)) {
        throw "Une URL est requise quand la source d'entree est 'url'."
    }

    $sourceBlock = @"
Source input : url
URL : $trimmedUrl
"@
}

if ($normalizedType -eq "auto") {
    $typeBlock = @"
Determine si c'est une boisson ou une nourriture si possible. Si ce n'est pas certain, demande-moi confirmation.
"@
}
else {
    $typeBlock = @"
Type : $normalizedType
"@
}

$prompt = @"
Utilise l'agent Recipe SQL Import Agent.

Avant de commencer :
- lis et applique strictement le fichier .agent.md a la racine du projet
- lis la memoire des ingredients dans .vscode/recipe-ingredient-memory.json
- lis le schema dans Bobi_app_backend/tables_colonnes.txt
- si possible, charge Bobi_app_backend/.env.local et verifie directement les ingredients dans la table Supabase inventaire
- si la source est une URL et que tu ne peux pas lire correctement la page, dis-le explicitement et demande-moi de passer en mode texte au lieu d'inventer

$sourceBlock
$typeBlock
Memoire des ingredients : .vscode/recipe-ingredient-memory.json
Schema : Bobi_app_backend/tables_colonnes.txt

Je veux que tu :
- lises la source fournie
- consultes d'abord la memoire des matchs ingredients
- verifies les ingredients comme avant
- proposes la categorie et les profils
- affiches les ingredients trouves avec leurs matchs inventaire
- affiches les ingredients non reconnus a creer
- me laisses corriger les matchs reconnus
- me laisses ajouter des matchs aux non reconnus
- recalcules la liste finale des ingredients lies et des ingredients a creer
- me montres les matchs memorises reappliques
- prepares les nouveaux matchs a memoriser apres ma validation
- distingues les ingredients obligatoires des ingredients facultatifs
- determines ensuite la bonne strategie SQL :
  - insertion d'une nouvelle recette si elle n'existe pas
  - mise a jour de la recette si elle existe deja
- generes un script SQL transactionnel pour Supabase
- inclus dans le SQL l'insertion des ingredients manquants dans inventaire
- inclus dans le SQL l'insertion ou la mise a jour de la recette, des ingredients et des etapes
- n'executes rien : ta sortie finale doit etre du SQL a copier dans Supabase
"@

Set-Clipboard -Value $prompt

Write-Host ""
Write-Host "Prompt copie dans le presse-papiers :" -ForegroundColor Green
Write-Host ""
Write-Host $prompt
Write-Host ""
Write-Host "Colle-le dans Codex pour lancer l'agent." -ForegroundColor Cyan
