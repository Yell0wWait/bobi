import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header({ title, showBackButton = false }) {
  const navigate = useNavigate();

  return (
    <header style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: "var(--header-bg)",
      borderBottom: "1px solid var(--header-border)",
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.35)"
    }}>
      {showBackButton && (
        <button
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary-400)"
          }}
          title="Retour"
        >
          <ArrowLeft size={24} />
        </button>
      )}
      
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <img 
          src="/bobi-logo.png" 
          alt="Bobi" 
          style={{
            width: 48,
            height: 48,
            objectFit: "contain"
          }}
        />
        
        <h1 style={{
          margin: 0,
          fontSize: 16,
          fontFamily: "var(--font-display)",
          fontWeight: "var(--font-weight-bold)",
          color: "var(--text-primary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}>
          {title}
        </h1>
      </div>
    </header>
  );
}
