import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { notificationService } from "../../services/notificationService";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import { Star, StarHalf, Trash2, Edit, CheckCircle, Clock, Wine, RefreshCw, Search, X, Bell } from 'lucide-react';

export default function CommandesAdmin() {
  const [allCommandes, setAllCommandes] = useState([]); // Toutes les commandes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBobiSuccess, setShowBobiSuccess] = useState(false);
  const [activeFilters, setActiveFilters] = useState(["Commandé", "Servi"]); // Par défaut, les deux activés
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [editingCommande, setEditingCommande] = useState(null);
  const [expandedCommande, setExpandedCommande] = useState(null);
  const [boissons, setBoissons] = useState([]);
  const [degustateurs, setDegustateurs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);

  // Filtrer les commandes selon les filtres actifs et la recherche
  const commandes = allCommandes.filter((c) => {
    if (!activeFilters.includes(c.statut)) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.boisson_nom?.toLowerCase().includes(term) ||
        c.guest_pseudo?.toLowerCase().includes(term) ||
        c.table?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  useEffect(() => {
    load();
    
    // Demander la permission pour les notifications au chargement
    if ('Notification' in window && Notification.permission === 'default') {
      notificationService.requestPermission().then(granted => {
        if (granted) {
          setNotificationsEnabled(true);
          // S'abonner aux changements de commandes
          notificationService.subscribeToOrders(() => {
            load(); // Recharger la liste quand il y a un changement
          });
        }
      });
    } else if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      notificationService.subscribeToOrders(() => {
        load();
      });
    }
    
    // Nettoyer l'abonnement au démontage
    return () => {
      notificationService.unsubscribe();
    };
  }, []); // Pas de dépendance sur activeFilters

  function toggleFilter(status) {
    if (activeFilters.includes(status)) {
      setActiveFilters(activeFilters.filter(s => s !== status));
    } else {
      setActiveFilters([...activeFilters, status]);
    }
  }

  function getCommandeImageUrl(commande, dateCreated) {
    if (!commande.boisson_nom || !commande.guest_pseudo || !dateCreated) return null;
    
    // Format: YYYYMMDD_degustateur_boisson.jpg
    // Extraire la date directement sans conversion UTC pour éviter les décalages de fuseau horaire
    let dateStr;
    if (typeof dateCreated === 'string' && dateCreated.includes('-')) {
      // Si c'est déjà au format YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS
      dateStr = dateCreated.split('T')[0].replace(/-/g, ''); // YYYYMMDD
    } else {
      // Fallback sur l'ancienne méthode
      const date = new Date(dateCreated);
      dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    }
    
    // Normaliser en PascalCase (première lettre de chaque mot en majuscule, sans espaces ni accents)
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
    
    const url = data?.publicUrl;
    console.log(`Image commande: ${fileName}`);
    console.log(`URL complète: ${url}`);
    
    // Tester si l'image existe
    if (url) {
      const img = new Image();
      img.onload = () => console.log(`✅ Image trouvée: ${fileName}`);
      img.onerror = () => console.log(`❌ Image NON trouvée: ${fileName}`);
      img.src = url;
    }
    
    return url;
  }

  function renderStars(note) {
    if (!note) return <span style={{ color: 'var(--text-on-light-secondary)', fontSize: 'var(--font-size-base)' }}>Pas encore noté</span>;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(note)) {
        // Étoile pleine
        stars.push(
          <Star 
            key={i} 
            size={16} 
            fill='var(--secondary-500)' 
            color='var(--secondary-500)' 
          />
        );
      } else if (i === Math.ceil(note) && note % 1 !== 0) {
        // Demi-étoile
        stars.push(
          <StarHalf 
            key={i} 
            size={16} 
            fill='var(--secondary-500)' 
            color='var(--secondary-500)' 
          />
        );
      } else {
        // Étoile vide
        stars.push(
          <Star 
            key={i} 
            size={16} 
            fill='none' 
            color='var(--border-color)' 
          />
        );
      }
    }
    return <div style={{ display: 'flex', gap: 2 }}>{stars}</div>;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Try to select commandes with boisson relation
      const { data, error } = await supabase
        .from("commandes")
        .select("id, boisson_id, degustateur_secret_token, statut, note, commentaire, date_commande")
        .order("date_commande", { ascending: false });

      if (error) throw error;

      let cmds = data || [];

      // Ne plus filtrer ici - on garde toutes les commandes

      // Fetch boisson names for all boisson_id in batch
      const boissonIds = Array.from(new Set(cmds.map((c) => c.boisson_id).filter(Boolean)));
      let boissonMap = {};
      if (boissonIds.length > 0) {
        const { data: boissons } = await supabase.from("boissons").select("id, nom").in("id", boissonIds);
        boissons?.forEach((b) => (boissonMap[b.id] = b.nom));
      }

      // Fetch degustateurs by secret_token
      const tokens = Array.from(new Set(cmds.map((c) => c.degustateur_secret_token).filter(Boolean)));
      let guestMap = {};
      if (tokens.length > 0) {
        const { data: guests } = await supabase.from("degustateur").select("id, pseudo, secret_token").in("secret_token", tokens);
        guests?.forEach((g) => (guestMap[g.secret_token] = g.pseudo));
      }

      const enriched = cmds.map((c) => ({
        ...c,
        boisson_nom: boissonMap[c.boisson_id] || "-",
        guest_pseudo: guestMap[c.degustateur_secret_token] || c.degustateur_secret_token || "-",
      }));

      setAllCommandes(enriched); // Stocker toutes les commandes
      
      // Charger toutes les boissons et dégustateurs pour le formulaire d'édition
      const { data: allBoissons } = await supabase.from("boissons").select("id, nom").order("nom");
      const { data: allDegustateurs } = await supabase.from("degustateur").select("id, pseudo, secret_token").order("pseudo");
      setBoissons(allBoissons || []);
      setDegustateurs(allDegustateurs || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement des commandes");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatut(id, statut) {
    try {
      const { error } = await supabase.from("commandes").update({ statut }).eq("id", id);
      if (error) throw error;
      setAllCommandes((c) => c.map((x) => (x.id === id ? { ...x, statut } : x)));
      
      // Afficher l'animation Bobi quand le statut passe à "Servi"
      if (statut === "Servi") {
        setShowBobiSuccess(true);
        setTimeout(() => setShowBobiSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors du changement de statut");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette commande ?")) return;
    try {
      const { error } = await supabase.from("commandes").delete().eq("id", id);
      if (error) throw error;
      setAllCommandes((c) => c.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  }

  function openEditModal(commande) {
    setEditingCommande({
      id: commande.id,
      boisson_id: commande.boisson_id,
      // degustateur_secret_token: commande.degustateur_secret_token, // colonne supprimée
      date_commande: commande.date_commande ? new Date(commande.date_commande).toISOString().split('T')[0] : '',
      note: commande.note || 0
    });
  }

  async function saveEdit() {
    if (!editingCommande) return;
    try {
      const { error } = await supabase
        .from("commandes")
        .update({
          boisson_id: editingCommande.boisson_id,
          // degustateur_secret_token: editingCommande.degustateur_secret_token, // colonne supprimée
          date_commande: editingCommande.date_commande,
          note: editingCommande.note
        })
        .eq("id", editingCommande.id);
      
      if (error) throw error;
      setEditingCommande(null);
      load(); // Recharger la liste
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la modification : " + err.message);
    }
  }

  if (loading) return <BobiAnimation type="loading" message="Bobi vérifie les stocks..." duration={0} />;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const statuses = ["Commandé", "Servi"];

  return (
    <>
      {showBobiSuccess && (
        <BobiAnimation 
          type="success" 
          message="Cocktail servi avec succès ! 🍹" 
          duration={4000}
          onComplete={() => setShowBobiSuccess(false)}
        />
      )}
      <Header title="Commandes" />
      <div style={{ padding: "1rem", paddingBottom: "80px" }}>
      
      {notificationsEnabled && (
        <p style={{ padding: "8px 12px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", borderRadius: 4, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Bell size={16} /> Notifications activées - Vous serez alerté des nouvelles commandes
        </p>
      )}

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
              placeholder="Rechercher par boisson, pseudo ou table..."
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

      {/* Modal d'édition */}
      {editingCommande && (
        <>
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onClick={() => setEditingCommande(null)}
          />
          <div 
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "white",
              borderRadius: 8,
              padding: 24,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              zIndex: 1000,
              minWidth: 400,
              maxWidth: "90%"
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>Modifier la commande</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>Boisson</label>
              <select
                value={editingCommande.boisson_id}
                onChange={(e) => setEditingCommande({ ...editingCommande, boisson_id: e.target.value })}
                style={{ width: "100%", padding: 8, fontSize: 'var(--font-size-base)', borderRadius: 4, border: "1px solid var(--border-color)" }}
              >
                <option value="">Sélectionner une boisson</option>
                {boissons.map(b => (
                  <option key={b.id} value={b.id}>{b.nom}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>Dégustateur</label>
              <select
                value={editingCommande.degustateur_secret_token}
                onChange={(e) => setEditingCommande({ ...editingCommande, degustateur_secret_token: e.target.value })}
                style={{ width: "100%", padding: 8, fontSize: 'var(--font-size-base)', borderRadius: 4, border: "1px solid var(--border-color)" }}
              >
                <option value="">Sélectionner un dégustateur</option>
                {degustateurs.map(d => (
                  <option key={d.id} value={d.secret_token}>{d.pseudo}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>Date de commande</label>
              <input
                type="date"
                value={editingCommande.date_commande}
                onChange={(e) => setEditingCommande({ ...editingCommande, date_commande: e.target.value })}
                style={{ width: "100%", padding: 8, fontSize: 'var(--font-size-base)', borderRadius: 4, border: "1px solid var(--border-color)" }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>Note (0-5)</label>
              <input
                type="number"
                min="0"
                max="5"
                value={editingCommande.note}
                onChange={(e) => setEditingCommande({ ...editingCommande, note: parseInt(e.target.value) || 0 })}
                style={{ width: "100%", padding: 8, fontSize: 'var(--font-size-base)', borderRadius: 4, border: "1px solid var(--border-color)" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditingCommande(null)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--text-secondary)",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 'var(--font-size-base)'
                }}
              >
                Annuler
              </button>
              <button
                onClick={saveEdit}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--primary-600)",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 'var(--font-size-base)'
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </>
      )}

      {/* Cartes de commandes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {commandes.map((c) => {
          const imageUrl = getCommandeImageUrl(c, c.date_commande);
          const date = c.date_commande ? new Date(c.date_commande).toLocaleDateString('fr-FR') : '-';
          const isExpanded = expandedCommande === c.id;
          
          return (
            <div 
              key={c.id} 
              onClick={(e) => {
                // Ne pas toggle si on clique sur les boutons d'action
                if (!e.target.closest('button')) {
                  setExpandedCommande(isExpanded ? null : c.id);
                }
              }}
              className="order-card order-card-stack order-card-interactive"
            >
              <div className="order-card-main order-card-main-with-actions">
                {/* Image médaillon */}
                <div className="order-card-media">
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
                  <div className="order-card-media-fallback" style={{ display: imageUrl ? "none" : "flex" }}>
                    <Wine size={32} color="var(--primary-400)" />
                  </div>
                </div>

                {/* Détails */}
                <div className="order-card-details">
                  <div className="order-card-title" style={{ whiteSpace: "nowrap", overflow: "visible" }}>
                    {c.boisson_nom}
                  </div>
                  <div className="order-card-meta">
                    {c.guest_pseudo} • {date}
                  </div>
                  <div className="order-card-rating">
                    {renderStars(c.note)}
                  </div>
                </div>

                {/* Boutons d'actions */}
                <div className="order-card-actions">
                  {/* Changer statut */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      changeStatut(c.id, c.statut === "Commandé" ? "Servi" : "Commandé");
                    }}
                    className="order-card-icon-button"
                    title={c.statut === "Commandé" ? "Marquer comme Servi" : "Marquer comme Commandé"}
                  >
                    {c.statut === "Commandé" ? <CheckCircle size={20} color="var(--text-on-light-secondary)" /> : <Clock size={20} color="var(--text-on-light-secondary)" />}
                  </button>

                  {/* Modifier */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(c);
                    }}
                    className="order-card-icon-button"
                    title="Modifier"
                  >
                    <Edit size={20} color="var(--text-on-light-secondary)" />
                  </button>

                  {/* Supprimer */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c.id);
                    }}
                    className="order-card-icon-button"
                    title="Supprimer"
                  >
                    <Trash2 size={20} color="var(--text-on-light-secondary)" />
                  </button>
                </div>
              </div>

              {/* Commentaire (affiché quand expanded) */}
              {isExpanded && c.commentaire && (
                <div className="order-card-comment">
                  <div className="order-card-comment-label">
                    Commentaire:
                  </div>
                  <div className="order-card-comment-text">
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
