import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import { Trash2, Plus, Calendar, Copy, Wine, Utensils, ThumbsUp, ThumbsDown, Search, X } from 'lucide-react';

export default function MenuAdmin() {
  const [menus, setMenus] = useState([]);
  const [menuItems, setMenuItems] = useState({}); // {menuId: [{boisson/nourriture}]}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    date_debut: "",
    date_fin: "",
    actif: true,
  });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState(["active", "inactive"]);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("menus")
        .select("id, nom, description, date_debut, date_fin, actif")
        .order("date_debut", { ascending: false });

      if (error) throw error;
      setMenus(data || []);

      // Charger les items pour chaque menu
      if (data && data.length > 0) {
        const itemsMap = {};
        for (const menu of data) {
          const { data: items, error: itemsErr } = await supabase
            .from("menus_items")
            .select(`
              id,
              quantite,
              boisson:boisson_id (id, nom),
              nourriture:nourriture_id (id, nom)
            `)
            .eq("menu_id", menu.id);

          if (!itemsErr && items) {
            itemsMap[menu.id] = items.map(item => ({
              ...item,
              type: item.boisson ? 'boisson' : 'nourriture',
              nom: item.boisson?.nom || item.nourriture?.nom
            }));
          }
        }
        setMenuItems(itemsMap);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.nom || !formData.date_debut || !formData.date_fin) {
      alert("Remplis tous les champs requis");
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("menus")
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const now = new Date().toISOString();
        const payload = {
          ...formData,
          created_at: now,
          updated_at: now,
        };
        const { error } = await supabase.from("menus").insert([payload]);
        if (error) throw error;
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        nom: "",
        description: "",
        date_debut: "",
        date_fin: "",
        actif: true,
      });
      load();
    } catch (err) {
      console.error(err);
      alert(`Erreur lors de la sauvegarde: ${err.message || err}`);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce menu ?")) return;
    try {
      const { error } = await supabase.from("menus").delete().eq("id", id);
      if (error) throw error;
      setMenus((m) => m.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  }

  async function handleDuplicate(menu) {
    try {
      // Créer un nouveau menu avec les mêmes données
      const { data: newMenu, error: menuError } = await supabase
        .from("menus")
        .insert({
          nom: `${menu.nom} (Copie)`,
          description: menu.description,
          date_debut: menu.date_debut,
          date_fin: menu.date_fin,
          actif: false // Par défaut inactif pour la copie
        })
        .select()
        .single();

      if (menuError) throw menuError;

      // Copier tous les items du menu
      const items = menuItems[menu.id] || [];
      if (items.length > 0) {
        const itemsToCopy = items.map(item => ({
          menu_id: newMenu.id,
          boisson_id: item.boisson?.id || null,
          nourriture_id: item.nourriture?.id || null,
          quantite: item.quantite
        }));

        const { error: itemsError } = await supabase
          .from("menus_items")
          .insert(itemsToCopy);

        if (itemsError) throw itemsError;
      }

      alert("Menu dupliqué avec succès!");
      load();
    } catch (err) {
      console.error(err);
      alert(`Erreur lors de la duplication: ${err.message || err}`);
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      nom: "",
      description: "",
      date_debut: "",
      date_fin: "",
      actif: true,
    });
  }

  function toggleFilter(status) {
    if (activeFilters.includes(status)) {
      setActiveFilters(activeFilters.filter(f => f !== status));
    } else {
      setActiveFilters([...activeFilters, status]);
    }
  }

  // Filtrer les menus selon le terme de recherche et le filtre de statut
  const filteredMenus = menus.filter((menu) => {
    const matchesSearch = menu.nom.toLowerCase().includes(searchTerm.toLowerCase());
    // Si aucun filtre n'est sélectionné, afficher rien
    const matchesFilter = activeFilters.length > 0 && ((activeFilters.includes("active") && menu.actif) || (activeFilters.includes("inactive") && !menu.actif));
    return matchesSearch && matchesFilter;
  });

  if (loading) return <BobiAnimation type="loading" message="Bobi vérifie les stocks..." duration={0} />;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <>
      <Header title="Menus" showBackButton={false} />
      <div style={{ paddingBottom: 80 }}>

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
              placeholder="Rechercher un menu..."
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

      {/* Filtres de statut */}
      <div className="filter-container">
        <button
          onClick={() => toggleFilter("active")}
          className={`filter-button ${activeFilters.includes("active") ? "active" : ""}`}
        >
          <ThumbsUp size={14} style={{ marginRight: 4 }} />
          Actifs
        </button>
        <button
          onClick={() => toggleFilter("inactive")}
          className={`filter-button ${activeFilters.includes("inactive") ? "active" : ""}`}
        >
          <ThumbsDown size={14} style={{ marginRight: 4 }} />
          Inactifs
        </button>
      </div>

      {/* Bouton flottant pour ajouter */}
      <button
        onClick={() => setShowForm(true)}
        className="floating-button"
        title="Ajouter un menu"
      >
        <Plus size={24} />
      </button>

      {menus.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6b7280", marginTop: 40, padding: "0 16px" }}>Aucun menu.</p>
      ) : filteredMenus.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6b7280", marginTop: 40, padding: "0 16px" }}>Aucun menu correspondant aux critères.</p>
      ) : (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredMenus.map((m) => {
            const items = menuItems[m.id] || [];
            
            return (
              <div
                key={m.id}
                onClick={() => navigate(`/admin/menus/${m.id}`)}
                style={{
                  backgroundColor: "transparent",
                  borderRadius: 8,
                  padding: 16,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  position: "relative",
                  cursor: "pointer"
                }}
              >
                {/* Badge Actif en haut à gauche */}
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    backgroundColor: m.actif ? "var(--secondary-100)" : "#f0f0f0",
                    color: m.actif ? "var(--secondary-700)" : "#6c757d",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  {m.actif ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                  {m.actif ? "Actif" : "Inactif"}
                </div>

                {/* Nom du menu (comme BoissonCard) */}
                <h3 style={{ 
                  fontSize: "var(--font-size-lg)", 
                  fontWeight: 'var(--font-weight-semibold)',
                  marginTop: 40,
                  marginBottom: 8,
                  color: "var(--text-primary)"
                }}>
                  {m.nom}
                </h3>

                {/* Description */}
                {m.description && (
                  <p style={{ margin: "0 0 8px 0", fontSize: 'var(--font-size-base)', color: "#6b7280" }}>
                    {m.description}
                  </p>
                )}

                {/* Dates */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 'var(--font-size-base)', color: "#6b7280" }}>
                  <Calendar size={16} />
                  <span>{m.date_debut} → {m.date_fin}</span>
                </div>

                {/* Items du menu */}
                {items.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {items.map((item, idx) => (
                        <span 
                          key={idx}
                          style={{
                            padding: "3px 8px",
                            background: item.type === 'boisson' ? "var(--primary-100)" : "#fef3c7",
                            color: item.type === 'boisson' ? "var(--primary-700)" : "#92400e",
                            borderRadius: "var(--border-radius-sm)",
                            fontSize: "0.75rem",
                            fontWeight: 'var(--font-weight-medium)',
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                          }}
                        >
                          {item.type === 'boisson' ? <Wine size={12} /> : <Utensils size={12} />}
                          {item.nom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div 
                  style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleDuplicate(m)}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    title="Dupliquer"
                  >
                    <Copy size={20} color="#6b7280" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(m.id)}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    title="Supprimer"
                  >
                    <Trash2 size={20} color="#6b7280" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal du formulaire */}
      {showForm && (
        <>
          {/* Overlay */}
          <div
            onClick={resetForm}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 1000
            }}
          />
          
          {/* Modal */}
          <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            padding: 24,
            borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            zIndex: 1001,
            width: "90%",
            maxWidth: 500,
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>
              {editingId ? "Modifier le menu" : "Nouveau menu"}
            </h2>
            
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 4, fontFamily: 'var(--font-display)', fontWeight: "var(--font-weight-bold)" }}>Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 15
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 15,
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Date début *</label>
                <input
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 15
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Date fin *</label>
                <input
                  type="date"
                  value={formData.date_fin}
                  onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 15
                  }}
                />
              </div>

              <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={formData.actif}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <label style={{ fontWeight: "bold", cursor: "pointer" }} onClick={() => setFormData({ ...formData, actif: !formData.actif })}>
                  Actif
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f0f0f0",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 15
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "var(--primary-600)",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 15
                  }}
                >
                  {editingId ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
    </>
  );
}
