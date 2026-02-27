import { UtensilsCrossed } from 'lucide-react';
import { getNourritureImageUrl, getNourritureImageUrlPng } from '../services/imageService';
import { useState, useEffect } from 'react';

export default function NourritureCard({ nourriture, onClick }) {
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  
  useEffect(() => {
    // Essayer de charger l'image pour vérifier si elle existe
    const jpgUrl = getNourritureImageUrl(nourriture.nom);
    const pngUrl = getNourritureImageUrlPng(nourriture.nom);
    
    // Tester d'abord JPG
    const img = new Image();
    img.onload = () => {
      setCurrentImageUrl(jpgUrl);
    };
    img.onerror = () => {
      // JPG échoué, essayer PNG
      const img2 = new Image();
      img2.onload = () => {
        setCurrentImageUrl(pngUrl);
      };
      img2.onerror = () => {
        setCurrentImageUrl(null);
      };
      img2.src = pngUrl;
    };
    img.src = jpgUrl;
  }, [nourriture.nom]);

  return (
    <div 
      className="card card-interactive" 
      onClick={onClick}
      style={{
        cursor: 'pointer',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: nourriture.actif === false ? 0.7 : 1,
        filter: nourriture.actif === false ? 'grayscale(30%)' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Image */}
      {currentImageUrl ? (
        <div style={{
          width: '100%',
          height: '200px',
          overflow: 'hidden',
          borderRadius: 'var(--border-radius-md)',
          marginBottom: 'var(--spacing-md)',
          position: 'relative'
        }}>
          <img 
            src={currentImageUrl} 
            alt={nourriture.nom}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform var(--transition-base)'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          />
          {nourriture.categorie && (
            <div style={{
              position: 'absolute',
              top: 'var(--spacing-sm)',
              left: 'var(--spacing-sm)',
              padding: '3px 8px',
              background: 'rgba(59, 130, 246, 0.9)',
              color: 'white',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              {nourriture.categorie}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          width: '100%',
          height: '200px',
          background: 'linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)',
          borderRadius: 'var(--border-radius-md)',
          marginBottom: 'var(--spacing-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <UtensilsCrossed size={48} color="var(--primary-400)" />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ 
          fontSize: 'var(--font-size-lg)', 
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--spacing-xs)',
          color: 'var(--text-primary)'
        }}>
          {nourriture.nom}
        </h3>

        {nourriture.profil && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--spacing-sm)' }}>
            {Array.isArray(nourriture.profil) ? (
              nourriture.profil.map((item, idx) => (
                item && (
                  <span 
                    key={idx} 
                    style={{
                      padding: '2px 8px',
                      background: 'var(--primary-100)',
                      color: 'var(--primary-700)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}
                  >
                    {item}
                  </span>
                )
              ))
            ) : (
              Object.entries(nourriture.profil).map(([key, value]) => (
                value && (
                  <span 
                    key={key} 
                    style={{
                      padding: '2px 8px',
                      background: 'var(--primary-100)',
                      color: 'var(--primary-700)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)'
                    }}
                  >
                    {key}: {value}
                  </span>
                )
              ))
            )}
          </div>
        )}

        {nourriture.ingredients && nourriture.ingredients.length > 0 && (
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginTop: 'auto'
          }}>
            <strong>Ingrédients :</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              {nourriture.ingredients.slice(0, 3).map((ing, idx) => (
                <li key={idx}>
                  {ing.inventaire?.nom || 'Ingrédient'}
                  {ing.quantite && ` (${ing.quantite}${ing.unite || ''})`}
                </li>
              ))}
              {nourriture.ingredients.length > 3 && (
                <li style={{ fontStyle: 'italic' }}>+ {nourriture.ingredients.length - 3} autre(s)...</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
