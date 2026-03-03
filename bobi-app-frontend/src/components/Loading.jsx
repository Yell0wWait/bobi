import { Loader2 } from 'lucide-react'

export default function Loading({ size = 'md', text = 'Chargement...' }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      gap: 'var(--spacing-md)',
      padding: 'var(--spacing-xl)'
    }}>
      <Loader2 
        className="spinner" 
        style={{ 
          width: size === 'sm' ? '20px' : size === 'lg' ? '48px' : '40px',
          height: size === 'sm' ? '20px' : size === 'lg' ? '48px' : '40px',
          color: 'var(--primary-600)'
        }} 
      />
      {text && <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{text}</p>}
    </div>
  )
}
