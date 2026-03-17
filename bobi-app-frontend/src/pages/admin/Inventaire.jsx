import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import { RefreshCw, Trash2, ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, Plus, Search, X, Check } from 'lucide-react';

export default function Inventaire() {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState(["Disponible", "Indisponible"]);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ nom: "", categorie: "", disponible: true, prix: "", marque_pref: "", magasin_pref: "" });
  const [newCategory, setNewCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);

  // Filtrer les items selon les filtres actifs et la recherche
  const items = allItems.filter((item) => {
    // Filtre par disponibilité
    const matchesAvailability = 
      (activeFilters.includes("Disponible") && item.disponible) ||
      (activeFilters.includes("Indisponible") && !item.disponible);
    
    if (!matchesAvailability) return false;
    
    // Filtre par recherche
    if (searchTerm) {
      return item.nom.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return true;
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("inventaire")
        .select("id, nom, categorie, disponible")
        .order("nom", { ascending: true });

      if (error) throw error;

      setAllItems(data || []);
      
      // Fermer toutes les catégories par défaut
      const categories = [...new Set((data || []).map(i => i.categorie || "Sans catégorie"))];
      const collapsed = {};
      categories.forEach(cat => { collapsed[cat] = true; });
      setCollapsedCategories(collapsed);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }

  async function toggleDisponible(id, currentStatus) {
    try {
      const { error: updateError } = await supabase
        .from("inventaire")
        .update({ disponible: !currentStatus })
        .eq("id", id);

      if (updateError) {
        console.error("Erreur Supabase toggleDisponible:", updateError);
        throw updateError;
      }
      // Recharger les données après mise à jour pour s'assurer de la persistance
      await load();
      setError(null);
    } catch (err) {
      console.error("Erreur complète:", err);
      setError(err.message || "Erreur lors de la mise à jour");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cet article ?")) return;
    try {
      const { error: deleteError } = await supabase.from("inventaire").delete().eq("id", id);
      if (deleteError) {
        console.error("Erreur Supabase handleDelete:", deleteError);
        throw deleteError;
      }
      // Recharger les données après suppression pour s'assurer de la persistance
      await load();
      setError(null);
    } catch (err) {
      console.error("Erreur complète:", err);
      setError(err.message || "Erreur lors de la suppression de l'ingrédient");
    }
  }

  async function handleSaveEdit() {
    if (!editingItem) return;
    if (!formData.nom.trim()) {
      setError("Le nom est requis");
      return;
    }
    try {
      const { error: updateError } = await supabase
        .from("inventaire")
        .update({ 
          nom: formData.nom.trim(), 
          categorie: formData.categorie || null, 
          disponible: formData.disponible,
          prix: formData.prix || null,
          marque_pref: formData.marque_pref || null,
          magasin_pref: formData.magasin_pref || null
        })
        .eq("id", editingItem.id);

      if (updateError) {
        console.error("Erreur Supabase handleSaveEdit:", updateError);
        throw updateError;
      }
      
      setEditingItem(null);
      // Recharger les données après modification pour s'assurer de la persistance
      await load();
      setError(null);
    } catch (err) {
      console.error("Erreur complète:", err);
      setError(err.message || "Erreur lors de la modification de l'ingrédient");
    }
  }

  async function handleAdd() {
    if (!formData.nom.trim()) {
      setError("Le nom est requis");
      return;
    }
    try {
      const { data, error: insertError } = await supabase
        .from("inventaire")
        .insert([{ 
          nom: formData.nom.trim(), 
          categorie: formData.categorie || null, 
          disponible: formData.disponible,
          prix: formData.prix || null,
          marque_pref: formData.marque_pref || null,
          magasin_pref: formData.magasin_pref || null
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      
      setAllItems((i) => [...i, data]);
      setShowAddForm(false);
      setFormData({ nom: "", categorie: "", disponible: true, prix: "", marque_pref: "", magasin_pref: "" });
      setNewCategory("");
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors de l'ajout de l'ingrédient");
    }
  }

  function toggleCategory(category) {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }

  function toggleFilter(status) {
    if (activeFilters.includes(status)) {
      setActiveFilters(activeFilters.filter(s => s !== status));
    } else {
      setActiveFilters([...activeFilters, status]);
    }
  }

  // Grouper les items par catégorie
  const itemsByCategory = items.reduce((acc, item) => {
    const cat = item.categorie || "Sans catégorie";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Fonction pour normaliser les chaînes (ignorer accents)
  function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // Trier les catégories alphabétiquement en ignorant les accents
  const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => 
    normalizeString(a).localeCompare(normalizeString(b))
  );

  // Obtenir toutes les catégories uniques pour le dropdown
  const uniqueCategories = [...new Set(allItems.map(i => i.categorie).filter(Boolean))].sort((a, b) => 
    normalizeString(a).localeCompare(normalizeString(b))
  );

  if (loading) return <BobiAnimation type="loading" message="Bobi vérifie les stocks..." duration={0} />;
  if (error) return <p style={{ color: "var(--error)" }}>{error}</p>;

  return (
    <>
      <Header title="Inventaire" showBackButton={false} />
      {error && <div style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--error)", border: "1px solid var(--error)", padding: 12, margin: "0 16px 16px", borderRadius: 4, fontSize: 14 }}>{error}</div>}
      <div className="inventaire-page" style={{ paddingBottom: 80 }}>
        <div style={{ padding: "16px" }}>

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
                placeholder="Rechercher un ingrédient..."
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
          {["Disponible", "Indisponible"].map((status) => (
            <button
              key={status}
              onClick={() => toggleFilter(status)}
              className={`filter-button ${activeFilters.includes(status) ? "active" : ""}`}
            >
              {status === "Disponible" ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bouton rafraîchir flottant */}
      <button
        onClick={load}
        className="floating-button"
        title="Rafraîchir"
      >
        <RefreshCw size={24} />
      </button>

      {items.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--text-tertiary)", marginTop: 40, padding: "0 16px" }}>Aucun article.</p>
      ) : (
        <div>
          {sortedCategories.map((category) => {
            const isCollapsed = collapsedCategories[category];
            const categoryItems = itemsByCategory[category];

            return (
              <div key={category}>
                {/* En-tête de catégorie cliquable */}
                <div 
                  onClick={() => toggleCategory(category)}
                  className="inventaire-category-header"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    flexWrap: "nowrap",
                    gap: 8,
                    padding: "4px 16px",
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: 'var(--font-size-base)',
                    whiteSpace: "nowrap",
                    textAlign: "left",
                    width: "100%"
                  }}
                >
                  <span className="inventaire-category-icon">
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </span>
                  <span className="inventaire-category-label">{category}</span>
                </div>

                {/* Liste des items */}
                {!isCollapsed && (
                  <table style={{ width: "100%", borderCollapse: "collapse", display: "table" }}>
                    <tbody>
                      {categoryItems.map((item) => (
                        <tr
                          key={item.id}
                          style={{
                            backgroundColor: "var(--bg-secondary)",
                            borderBottom: "1px solid var(--border-color)"
                          }}
                        >
                          {/* Nom de l'ingrédient */}
                          <td 
                            onClick={() => navigate(`/admin/inventaire/${item.id}`)}
                            style={{ 
                              padding: "8px 16px", 
                              fontSize: 'var(--font-size-lg)', 
                              color: item.disponible ? "var(--text-primary)" : "var(--error)",
                              fontStyle: item.disponible ? "normal" : "italic",
                              cursor: "pointer"
                            }}
                          >
                            {item.nom}
                          </td>

                          {/* Icônes d'action */}
                          <td style={{ padding: "8px 16px", textAlign: "right", width: 110 }}>
                            <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                              {/* Toggle disponibilité */}
                              <button
                                onClick={() => toggleDisponible(item.id, item.disponible)}
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
                                title={item.disponible ? "Marquer comme indisponible" : "Marquer comme disponible"}
                              >
                                {item.disponible ? (
                                  <ThumbsUp size={20} color={item.disponible ? "var(--text-tertiary)" : "var(--error)"} />
                                ) : (
                                  <ThumbsDown size={20} color={item.disponible ? "var(--text-tertiary)" : "var(--error)"} />
                                )}
                              </button>

                              {/* Supprimer */}
                              <button
                                onClick={() => handleDelete(item.id)}
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
                                <Trash2 size={20} color={item.disponible ? "var(--text-tertiary)" : "var(--error)"} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Formulaire d'édition modal */}
      {editingItem && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setEditingItem(null)}
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
            backgroundColor: "var(--bg-secondary)",
            padding: 24,
            borderRadius: 8,
            boxShadow: "var(--shadow-lg)",
            zIndex: 1001,
            width: "90%",
            maxWidth: 400,
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>Modifier l'ingrédient</h2>
              <button
                onClick={() => setEditingItem(null)}
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
                title="Fermer"
              >
                <X size={24} color="var(--text-tertiary)" />
              </button>
            </div>
            
            {error && <p style={{ color: "var(--error)", marginBottom: 16, fontSize: 14 }}>{error}</p>}
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Nom</label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: 4,
                  fontSize: 15,
                  boxSizing: "border-box",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)"
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Catégorie</label>
              {newCategory ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onBlur={() => {
                      if (newCategory.trim()) {
                        setFormData({ ...formData, categorie: newCategory.trim() });
                      }
                    }}
                    placeholder="Nouvelle catégorie"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "1px solid var(--border-color)",
                      borderRadius: 4,
                      fontSize: 15,
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)"
                    }}
                  />
                  <button
                    onClick={() => {
                      setNewCategory("");
                      setFormData({ ...formData, categorie: "" });
                    }}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-tertiary)",
                      color: "var(--text-primary)",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 13
                    }}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={formData.categorie}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setNewCategory(" ");
                      } else {
                        setFormData({ ...formData, categorie: e.target.value });
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "1px solid var(--border-color)",
                      borderRadius: 4,
                      fontSize: 15,
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)"
                    }}
                  >
                    <option value="">-- Sélectionner --</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__new__">+ Nouvelle catégorie</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Prix (optionnel)</label>
              <input
                type="number"
                step="0.01"
                value={formData.prix}
                onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: 4,
                  fontSize: 15,
                  boxSizing: "border-box",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)"
                }}
                placeholder="0.00"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Marque préférée (optionnel)</label>
              <input
                type="text"
                value={formData.marque_pref}
                onChange={(e) => setFormData({ ...formData, marque_pref: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: 4,
                  fontSize: 15,
                  boxSizing: "border-box",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)"
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Magasin préféré (optionnel)</label>
              <input
                type="text"
                value={formData.magasin_pref}
                onChange={(e) => setFormData({ ...formData, magasin_pref: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: 4,
                  fontSize: 15,
                  boxSizing: "border-box",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)"
                }}
              />
            </div>

            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={formData.disponible}
                onChange={(e) => setFormData({ ...formData, disponible: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <label style={{ fontWeight: "bold", cursor: "pointer" }} onClick={() => setFormData({ ...formData, disponible: !formData.disponible })}>Disponible</label>
            </div>

            {/* Boutons flottants */}
            <div style={{ display: "flex", gap: 12, position: "fixed", bottom: 20, right: 20, zIndex: 1002 }}>
              <button
                onClick={() => setEditingItem(null)}
                className="floating-cancel-button"
                title="Annuler"
              >
                <X size={24} />
              </button>
              <button
                onClick={handleSaveEdit}
                className="floating-save-button"
                title="Sauvegarder"
              >
                <Check size={24} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Formulaire d'ajout modal */}
      {showAddForm && (
        <>
          {/* Overlay */}
          <div
            onClick={() => {
              setShowAddForm(false);
              setFormData({ nom: "", categorie: "", disponible: true });
              setNewCategory("");
            }}
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
            backgroundColor: "var(--bg-secondary)",
            padding: 24,
            borderRadius: 8,
            boxShadow: "var(--shadow-lg)",
            zIndex: 1001,
            width: "90%",
            maxWidth: 400,
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)"
          }}>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>Ajouter un ingrédient</h2>
            
            {error && <p style={{ color: "var(--error)", marginBottom: 16, fontSize: 14 }}>{error}</p>}
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Nom</label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: 4,
                  fontSize: 15,
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)"
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Catégorie</label>
              {newCategory ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onBlur={() => {
                      if (newCategory.trim()) {
                        setFormData({ ...formData, categorie: newCategory.trim() });
                      }
                    }}
                    placeholder="Nouvelle catégorie"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "1px solid var(--border-color)",
                      borderRadius: 4,
                      fontSize: 15,
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)"
                    }}
                  />
                  <button
                    onClick={() => {
                      setNewCategory("");
                      setFormData({ ...formData, categorie: "" });
                    }}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-tertiary)",
                      color: "var(--text-primary)",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 13
                    }}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={formData.categorie}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setNewCategory(" ");
                      } else {
                        setFormData({ ...formData, categorie: e.target.value });
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "1px solid var(--border-color)",
                      borderRadius: 4,
                      fontSize: 15,
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)"
                    }}
                  >
                    <option value="">-- Sélectionner --</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__new__">+ Nouvelle catégorie</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Prix (optionnel)</label>
              <input
                type="number"
                step="0.01"
                value={formData.prix}
                onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: 4,
                  fontSize: 15,
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)"
                }}
                placeholder="0.00"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Marque préférée (optionnel)</label>
              <input
                type="text"
                value={formData.marque_pref}
                onChange={(e) => setFormData({ ...formData, marque_pref: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: 4,
                  fontSize: 15,
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)"
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Magasin préféré (optionnel)</label>
              <input
                type="text"
                value={formData.magasin_pref}
                onChange={(e) => setFormData({ ...formData, magasin_pref: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: 4,
                  fontSize: 15,
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)"
                }}
              />
            </div>

            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={formData.disponible}
                onChange={(e) => setFormData({ ...formData, disponible: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <label style={{ fontWeight: "bold", cursor: "pointer" }} onClick={() => setFormData({ ...formData, disponible: !formData.disponible })}>Disponible</label>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ nom: "", categorie: "", disponible: true, prix: "", marque_pref: "", magasin_pref: "" });
                  setNewCategory("");
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 15
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--primary-600)",
                  color: "var(--text-on-light-primary)",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 15
                }}
              >
                Ajouter
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bouton flottant pour ajouter */}
      <button
        onClick={() => {
          setShowAddForm(true);
          setFormData({ nom: "", categorie: "", disponible: true, prix: "", marque_pref: "", magasin_pref: "" });
          setNewCategory("");
        }}
        className="floating-add-button"
        title="Ajouter un ingrédient"
      >
        <Plus size={28} />
      </button>
      </div>
    </>
  );
}
