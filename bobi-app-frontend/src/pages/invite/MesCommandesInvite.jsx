import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import { Star, StarHalf, CheckCircle, Clock, Wine, RefreshCw, Search, X } from 'lucide-react';

export default function MesCommandesInvite({ secretToken }) {
  const [allCommandes, setAllCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState(["Commandé", "Servi"]);
  const [expandedCommande, setExpandedCommande] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);

  // Filtrer les commandes selon les filtres actifs et la recherche
  const commandes = allCommandes.filter((c) => {
    if (!activeFilters.includes(c.statut)) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.boisson_nom?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  function toggleFilter(status) {
    if (activeFilters.includes(status)) {
      setActiveFilters(activeFilters.filter(s => s !== status));
    } else {
      setActiveFilters([...activeFilters, status]);
    }
  }

  function getCommandeImageUrl(commande, dateCreated) {
    if (!commande.boisson_nom || !commande.guest_pseudo || !dateCreated) return null;
    
    let dateStr;
    if (typeof dateCreated === 'string' && dateCreated.includes('-')) {
      dateStr = dateCreated.split('T')[0].replace(/-/g, '');
    } else {
      const date = new Date(dateCreated);
      dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    }
    
    const toPascalCase = (text) => {
      const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    };
    
    const fileName = `${dateStr}_${toPascalCase(commande.guest_pseudo)}_${toPascalCase(commande.boisson_nom)}.jpg`;
    
    const { data } = supabase.storage
      .from('boissons')
      .getPublicUrl(`boissons_commandes/${fileName}`);
    
    return data?.publicUrl;
  }

  function renderStars(note) {
    if (!note) return <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>Pas encore noté</span>;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(note)) {
        stars.push(
          <Star 
            key={i} 
            size={16} 
            fill='var(--secondary-500)' 
            color='var(--secondary-500)' 
          />
        );
      } else if (i === Math.ceil(note) && note % 1 !== 0) {
        stars.push(
          <StarHalf 
            key={i} 
            size={16} 
            fill='var(--secondary-500)' 
            color='var(--secondary-500)' 
          />
        );
      } else {
        stars.push(
          <Star 
            key={i} 
            size={16} 
            fill='none' 
            color='#d1d5db'  
          />
        );
      }
    }
    return <div style={{ display: 'flex', gap: 2 }}>{stars}</div>;
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("commandes")
        .select("id, boisson_id, degustateur_secret_token, statut, note, commentaire, date_commande")
        .eq("degustateur_secret_token", secretToken)
        .order("date_commande", { ascending: false });
      setAllCommandes(data || []);

      if (error) throw error;

      let cmds = data || [];

      // Fetch boisson names
      const boissonIds = Array.from(new Set(cmds.map((c) => c.boisson_id).filter(Boolean)));
      let boissonMap = {};
      if (boissonIds.length > 0) {
        const { data: boissons } = await supabase.from("boissons").select("id, nom").in("id", boissonIds);
        boissons?.forEach((b) => (boissonMap[b.id] = b.nom));
      }

      // Fetch guest pseudo
      const { data: guest } = await supabase
        .from("degustateur")
        .select("pseudo")
        .eq("secret_token", secretToken)
        .single();

      const guestPseudo = guest?.pseudo || "-";

      const enriched = cmds.map((c) => ({
        ...c,
        boisson_nom: boissonMap[c.boisson_id] || "-",
        guest_pseudo: guestPseudo,
      }));

      setAllCommandes(enriched);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement des commandes");
    } finally {
      setLoading(false);
    }
  }, [secretToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <BobiAnimation type="loading" message="Bobi vérifie les stocks..." duration={0} />;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const statuses = ["Commandé", "Servi"];

  return (
    <>
      <Header title="Mes Commandes" />
      <div style={{ padding: "1rem", paddingBottom: "80px" }}>

      {/* Barre de recherche extensible */}
      <div className="search-container">
        {!searchExpanded ? (
          <button
            onClick={() => setSearchExpanded(true)}
            className="search-button"
          >
            <Search size={16} /> Rechercher
          </button>
        ) : (
          <div className="search-expanded">
            <input
              type="text"
              placeholder="Rechercher par boisson..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="search-input"
            />
            <button
              onClick={() => {
                setSearchExpanded(false);
                setSearchTerm("");
              }}
              className="search-close-button"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Filtres par tags cliquables */}
      <div className="filter-container">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => toggleFilter(status)}
            className={`filter-button ${activeFilters.includes(status) ? "active" : ""}`}
          >
            {status === "Commandé" ? <Clock size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> : <CheckCircle size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />}
            {status}
          </button>
        ))}
      </div>

      {/* Bouton rafraîchir flottant */}
      <button
        onClick={load}
        className="floating-button"
        title="Rafraîchir"
      >
        <RefreshCw size={24} />
      </button>

      {/* Cartes de commandes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {commandes.map((c) => {
          const imageUrl = getCommandeImageUrl(c, c.date_commande);
          const date = c.date_commande ? new Date(c.date_commande).toLocaleDateString('fr-FR') : '-';
          const isExpanded = expandedCommande === c.id;
          
          return (
            <div 
              key={c.id} 
              onClick={() => setExpandedCommande(isExpanded ? null : c.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: 16,
                backgroundColor: "white",
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid var(--border-color)",
                position: "relative",
                cursor: "pointer",
                transition: "box-shadow 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)"}
            >
              <div style={{ display: "flex", gap: 16 }}>
                {/* Image médaillon */}
                <div style={{
                  width: 80,
                  height: 80,
                  flexShrink: 0,
                  borderRadius: 8,
                  overflow: "hidden",
                  backgroundColor: "var(--bg-secondary)"
                }}>
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={c.boisson_nom}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                    />
                  ) : null}
                  <div style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)",
                    display: imageUrl ? "none" : "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Wine size={32} color="var(--primary-400)" />
                  </div>
                </div>

                {/* Détails */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: "var(--text-primary)", marginBottom: 4, whiteSpace: "nowrap", overflow: "visible" }}>
                    {c.boisson_nom}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-base)', color: "var(--text-secondary)", marginBottom: 4 }}>
                    {c.guest_pseudo} • {date}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-start" }}>
                    {renderStars(c.note)}
                  </div>
                </div>
              </div>

              {/* Commentaire (affiché quand expanded) */}
              {isExpanded && c.commentaire && (
                <div style={{
                  marginTop: 8,
                  padding: 12,
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: 6,
                  borderLeft: "3px solid var(--primary-400)"
                }}>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: "var(--text-secondary)", marginBottom: 4 }}>
                    Commentaire:
                  </div>
                  <div style={{ fontSize: 'var(--font-size-base)', color: "var(--text-primary)", lineHeight: 1.5 }}>
                    {c.commentaire}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {commandes.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: 40, fontSize: 'var(--font-size-lg)' }}>
          Aucune commande avec les filtres sélectionnés
        </p>
      )}
    </div>
    </>
  );
}
