import { Wine } from 'lucide-react';
import { getBoissonImageUrl, getBoissonImageUrlPng } from '../services/imageService';
import { useState, useEffect } from 'react';

export default function BoissonCard({ boisson, onClick }) {
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  
  useEffect(() => {
    // Essayer de charger l'image pour vérifier si elle existe
    const jpgUrl = getBoissonImageUrl(boisson.nom);
    const pngUrl = getBoissonImageUrlPng(boisson.nom);
    
    // Tester d'abord JPG
    const img = new Image();
    img.onload = () => {
      console.log(`✅ JPG chargé: ${jpgUrl}`);
      setCurrentImageUrl(jpgUrl);
    };
    img.onerror = () => {
      console.log(`❌ JPG échoué, essai PNG: ${pngUrl}`);
      // JPG échoué, essayer PNG
      const img2 = new Image();
      img2.onload = () => {
        console.log(`✅ PNG chargé: ${pngUrl}`);
        setCurrentImageUrl(pngUrl);
      };
      img2.onerror = () => {
        console.log(`❌ PNG échoué aussi, pas d'image pour ${boisson.nom}`);
        setCurrentImageUrl(null);
      };
      img2.src = pngUrl;
    };
    img.src = jpgUrl;
  }, [boisson.nom]);

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
        opacity: boisson.actif === false ? 0.7 : 1,
        filter: boisson.actif === false ? 'grayscale(30%)' : 'none',
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
            alt={boisson.nom}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform var(--transition-base)'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          />
          {boisson.categorie && (
            <div
              className="type-indicator type-indicator-compact"
              style={{
              position: 'absolute',
              top: 'var(--spacing-sm)',
              left: 'var(--spacing-sm)'
            }}
            >
              {boisson.categorie}
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
          <Wine size={48} color="#6b7280" />
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
          {boisson.nom}
        </h3>

        {boisson.profil && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--spacing-sm)' }}>
            {Array.isArray(boisson.profil) ? (
              boisson.profil.map((item, idx) => (
                item && (
                  <span 
                    key={idx} 
                    style={{
                      padding: '2px 8px',
                      background: '#fff3e0',
                      color: '#e65100',
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
              Object.entries(boisson.profil).map(([key, value]) => (
                value && (
                  <span 
                    key={key} 
                    style={{
                      padding: '2px 8px',
                      background: '#fff3e0',
                      color: '#e65100',
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
      </div>
    </div>
  );
}
