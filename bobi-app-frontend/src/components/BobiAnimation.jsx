import { useEffect, useState } from "react";

/**
 * Composant pour afficher Bobi avec un message contextuel
 * @param {string} type - Type d'animation: 'welcome', 'success', 'error', 'loading'
 * @param {string} message - Message personnalisé (optionnel)
 * @param {number} duration - Durée d'affichage en ms (défaut: 2500ms pour visibilité optimale, 0 = infini)
 * @param {function} onComplete - Callback après la durée
 */
export default function BobiAnimation({ 
  type = 'welcome', 
  message = '', 
  duration = 2500,
  onComplete 
}) {
  const [visible, setVisible] = useState(true);

  const nightBarBackground = {
    backgroundColor: '#0b1220',
    backgroundImage: `
      radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.35) 0, rgba(255,255,255,0) 100%),
      radial-gradient(1px 1px at 80% 40%, rgba(255,255,255,0.25) 0, rgba(255,255,255,0) 100%),
      radial-gradient(1px 1px at 50% 80%, rgba(255,255,255,0.2) 0, rgba(255,255,255,0) 100%),
      linear-gradient(180deg, #0b1220 0%, #0f172a 50%, #111827 100%)
    `,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover'
  };

  const animations = {
    welcome: {
      image: '/bobi-accueil.png',
      defaultMessage: 'Que puis-je préparer pour vous ?',
      bgStyle: nightBarBackground
    },
    success: {
      image: '/bobi-shaker.png',
      defaultMessage: 'Excellent choix ! Bobi prépare votre cocktail...',
      bgStyle: nightBarBackground
    },
    error: {
      image: '/bobi-erreur.png',
      defaultMessage: 'Il me manque un ingrédient pour celui-ci...',
      bgStyle: nightBarBackground
    },
    loading: {
      image: '/bobi-accueil.png',
      defaultMessage: 'Bobi vérifie les stocks...',
      bgStyle: nightBarBackground
    }
  };

  const config = animations[type] || animations.welcome;
  const displayMessage = message || config.defaultMessage;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onComplete) onComplete();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      ...config.bgStyle,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '2rem',
      animation: 'fadeIn 400ms ease-in-out'
    }}>
      <img 
        src={config.image}
        alt="Bobi"
        style={{
          maxWidth: '280px',
          width: '80%',
          height: 'auto',
          marginBottom: '2rem',
          animation: 'bobiFadeIn 600ms ease-out'
        }}
      />
      
      <p style={{
        color: '#FDFDFD',
        fontFamily: 'var(--font-body)',
        fontSize: '1.25rem',
        fontWeight: 'var(--font-weight-medium)',
        textAlign: 'center',
        maxWidth: '400px',
        margin: 0,
        lineHeight: 1.5,
        animation: 'slideUp 500ms ease-out 200ms both'
      }}>
        {displayMessage}
      </p>

      {duration === 0 && (
        <div style={{
          marginTop: '2rem',
          display: 'flex',
          gap: '8px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#93c5fd',
            animation: 'bounce 1.4s ease-in-out infinite'
          }}/>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#93c5fd',
            animation: 'bounce 1.4s ease-in-out 0.2s infinite'
          }}/>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#93c5fd',
            animation: 'bounce 1.4s ease-in-out 0.4s infinite'
          }}/>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes bobiFadeIn {
          from { 
            opacity: 0; 
            transform: scale(0.9) translateY(20px);
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 80%, 100% { 
            transform: translateY(0); 
          }
          40% { 
            transform: translateY(-10px); 
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
