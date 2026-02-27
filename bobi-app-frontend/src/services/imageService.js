import { supabase } from './supabaseClient'

/**
 * Transforme un nom en PascalCase sans espaces
 * "Pop The Sour" → "PopTheSour"
 * "Caïpirinha" → "Caipirinha"
 */
export function toPascalCase(text) {
  if (!text) return ''
  
  // Normaliser les accents (é → e, ï → i, etc.)
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  
  // Séparer par espaces, capitaliser chaque mot, joindre sans espaces
  return normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

/**
 * Génère l'URL publique d'une image de boisson depuis le bucket Supabase
 * Essaie .jpg puis .png
 * @param {string} boissonNom - Le nom de la boisson
 * @returns {string} - L'URL publique de l'image
 */
export function getBoissonImageUrl(boissonNom) {
  if (!boissonNom) return null
  
  // Transformer en PascalCase
  const baseName = toPascalCase(boissonNom.trim())
  
  // Essayer d'abord .jpg, puis .png (vous avez les deux)
  const fileName = baseName + '.jpg'  // On suppose .jpg par défaut
  
  // DEBUG: Afficher le nom transformé
  console.log(`Boisson: "${boissonNom}" → Fichier: "${fileName}"`)
  
  // Générer l'URL publique
  const { data } = supabase.storage
    .from('boissons')
    .getPublicUrl(fileName)
  
  console.log(`URL générée: ${data?.publicUrl}`)
  
  return data?.publicUrl || null
}

/**
 * Version alternative qui essaie .png si vous savez que c'est un PNG
 */
export function getBoissonImageUrlPng(boissonNom) {
  if (!boissonNom) return null
  const baseName = toPascalCase(boissonNom.trim())
  const fileName = baseName + '.png'
  
  console.log(`Boisson PNG: "${boissonNom}" → Fichier: "${fileName}"`)
  
  const { data } = supabase.storage.from('boissons').getPublicUrl(fileName)
  
  console.log(`URL PNG générée: ${data?.publicUrl}`)
  
  return data?.publicUrl || null
}

/**
 * Génère l'URL publique d'une image de nourriture depuis le bucket Supabase
 * @param {string} nourritureNom - Le nom de la nourriture
 * @returns {string} - L'URL publique de l'image
 */
export function getNourritureImageUrl(nourritureNom) {
  if (!nourritureNom) return null
  
  const baseName = toPascalCase(nourritureNom.trim())
  const fileName = baseName + '.jpg'
  
  console.log(`Nourriture: "${nourritureNom}" → Fichier: "${fileName}"`)
  
  const { data } = supabase.storage
    .from('nourritures')
    .getPublicUrl(fileName)
  
  console.log(`URL générée: ${data?.publicUrl}`)
  
  return data?.publicUrl || null
}

/**
 * Version alternative qui essaie .png pour les nourritures
 */
export function getNourritureImageUrlPng(nourritureNom) {
  if (!nourritureNom) return null
  const baseName = toPascalCase(nourritureNom.trim())
  const fileName = baseName + '.png'
  
  console.log(`Nourriture PNG: "${nourritureNom}" → Fichier: "${fileName}"`)
  
  const { data } = supabase.storage.from('nourritures').getPublicUrl(fileName)
  
  console.log(`URL PNG générée: ${data?.publicUrl}`)
  
  return data?.publicUrl || null
}
