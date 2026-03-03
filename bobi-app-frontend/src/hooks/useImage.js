import { useState, useEffect } from 'react';
import { getBoissonImageUrl, getBoissonImageUrlPng, getNourritureImageUrl } from '../services/imageService';

/**
 * Hook pour charger une image de boisson avec fallback JPG→PNG
 * @param {string} boissonNom - Le nom de la boisson
 * @returns {string|null} - L'URL de l'image qui existe réellement
 */
export function useBoissonImage(boissonNom) {
  const [imageUrl, setImageUrl] = useState(null);
  
  useEffect(() => {
    if (!boissonNom) {
      return;
    }
    
    const jpgUrl = getBoissonImageUrl(boissonNom);
    const pngUrl = getBoissonImageUrlPng(boissonNom);
    
    // Tester JPG
    const img = new Image();
    img.onload = () => setImageUrl(jpgUrl);
    img.onerror = () => {
      // JPG échoué, essayer PNG
      const img2 = new Image();
      img2.onload = () => setImageUrl(pngUrl);
      img2.onerror = () => setImageUrl(null);
      img2.src = pngUrl;
    };
    img.src = jpgUrl;
  }, [boissonNom]);
  
  return boissonNom ? imageUrl : null;
}

/**
 * Hook pour charger une image de nourriture avec fallback JPG→PNG
 * @param {string} nourritureNom - Le nom de la nourriture
 * @returns {string|null} - L'URL de l'image qui existe réellement
 */
export function useNourritureImage(nourritureNom) {
  const [imageUrl, setImageUrl] = useState(null);
  
  useEffect(() => {
    if (!nourritureNom) {
      return;
    }
    
    const jpgUrl = getNourritureImageUrl(nourritureNom);
    
    // Tester JPG (on peut ajouter PNG plus tard si nécessaire)
    const img = new Image();
    img.onload = () => setImageUrl(jpgUrl);
    img.onerror = () => setImageUrl(null);
    img.src = jpgUrl;
  }, [nourritureNom]);
  
  return nourritureNom ? imageUrl : null;
}
