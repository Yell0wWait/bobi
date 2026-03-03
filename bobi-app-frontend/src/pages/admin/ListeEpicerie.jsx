import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

export default function ListeEpicerie() {
  const [allIngredients, setAllIngredients] = useState({});
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMenuIds, setSelectedMenuIds] = useState([]);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  useEffect(() => {
    loadIngredients();
  }, []);

  function toggleMenu(menuId) {
    if (selectedMenuIds.includes(menuId)) {
      setSelectedMenuIds(selectedMenuIds.filter(id => id !== menuId));
    } else {
      setSelectedMenuIds([...selectedMenuIds, menuId]);
    }
  }

  function toggleCategory(category) {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }

  async function loadIngredients() {
    setLoading(true);
    setError(null);
    try {
      // 1. Récupérer menus actifs
      const { data: activeMenus, error: mErr } = await supabase
        .from("menus")
        .select("id, nom, date_debut, date_fin")
        .eq("actif", true)
        .order("date_debut", { ascending: true });

      if (mErr) throw mErr;
      setMenus(activeMenus || []);
      
      // Par défaut, sélectionner tous les menus
      if (selectedMenuIds.length === 0 && activeMenus && activeMenus.length > 0) {
        setSelectedMenuIds(activeMenus.map(m => m.id));
      }

      if (!activeMenus || activeMenus.length === 0) {
        setAllIngredients({});
        setLoading(false);
        return;
      }

      // 2. Récupérer menu_items des menus actifs
      const menuIds = activeMenus.map(m => m.id);
      const { data: items, error: iErr } = await supabase
        .from("menus_items")
        .select("id, boisson_id, nourriture_id, quantite")
        .in("menu_id", menuIds);

      if (iErr) throw iErr;

      const boissonIds = Array.from(new Set((items || []).map(i => i.boisson_id).filter(Boolean)));
      const nourritureIds = Array.from(new Set((items || []).map(i => i.nourriture_id).filter(Boolean)));

      // 3. Récupérer ingrédients pour chaque boisson/nourriture
      let allIngredients = [];

      if (boissonIds.length > 0) {
        const { data: bIng, error: bErr } = await supabase
          .from("boissons_ingredients")
          .select("boisson_id, ingredient_id, quantite, unite")
          .in("boisson_id", boissonIds);

        if (bErr) throw bErr;
        allIngredients = allIngredients.concat(bIng || []);
      }

      if (nourritureIds.length > 0) {
        const { data: nIng, error: nErr } = await supabase
          .from("nourritures_ingredients")
          .select("nourriture_id, ingredient_id, quantite, unite")
          .in("nourriture_id", nourritureIds);

        if (nErr) throw nErr;
        allIngredients = allIngredients.concat(nIng || []);
      }

      // 4. Récupérer les détails des ingrédients depuis inventaire
      const ingredientIds = Array.from(new Set(allIngredients.map(i => i.ingredient_id).filter(Boolean)));
      
      if (ingredientIds.length === 0) {
        setAllIngredients({});
        setLoading(false);
        return;
      }

      const { data: inventaireItems, error: invErr } = await supabase
        .from("inventaire")
        .select("id, nom, categorie, disponible")
        .in("id", ingredientIds);

      if (invErr) throw invErr;

      const inventaireMap = {};
      (inventaireItems || []).forEach(inv => {
        inventaireMap[inv.id] = { 
          nom: inv.nom, 
          categorie: inv.categorie || "Autre",
          disponible: inv.disponible
        };
      });

      // 5. Grouper par ingrédient (nom) - uniquement les NON disponibles
      const grouped = {};
      allIngredients.forEach((ing) => {
        const invInfo = inventaireMap[ing.ingredient_id];
        if (!invInfo) return;

        const key = `${ing.ingredient_id}`;
        if (!grouped[key]) {
          grouped[key] = {
            id: ing.ingredient_id,
            nom: invInfo.nom,
            categorie: invInfo.categorie,
            quantite_total: 0,
            unite: ing.unite || "",
            disponible: invInfo.disponible
          };
        }
        grouped[key].quantite_total += ing.quantite || 0;
      });

      // 6. Grouper par catégorie
      const byCategory = {};
      Object.values(grouped).forEach(item => {
        const cat = item.categorie || "Autre";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(item);
      });

      // Trier par catégorie puis par nom
      Object.keys(byCategory).forEach(cat => {
        byCategory[cat].sort((a, b) => a.nom.localeCompare(b.nom));
      });

      setAllIngredients(byCategory);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }

  async function toggleDisponible(ingredientId, currentStatus) {
    try {
      const { error } = await supabase
        .from("inventaire")
        .update({ disponible: !currentStatus })
        .eq("id", ingredientId);

      if (error) throw error;

      // Recharger la liste après modification
      loadIngredients();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour : " + err.message);
    }
  }

  if (loading) return <BobiAnimation type="loading" message="Bobi vérifie les stocks..." duration={0} />;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  // Filtrer les ingrédients selon les menus sélectionnés
  const filteredIngredients = selectedMenuIds.length === 0 ? {} : allIngredients;

  return (
    <>
      <Header title="Liste d'épicerie" showBackButton={false} />
      <div style={{ paddingBottom: 80 }}>
        <div style={{ padding: "16px" }}>

        {/* Filtres par menus */}
        <div className="filter-container">
          {menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => toggleMenu(menu.id)}
              className={`filter-button ${selectedMenuIds.includes(menu.id) ? "active" : ""}`}
            >
              {menu.nom}
            </button>
          ))}
        </div>
      </div>

      {/* Bouton rafraîchir flottant */}
      <button
        onClick={loadIngredients}
        className="floating-button"
        title="Rafraîchir"
      >
        <RefreshCw size={24} />
      </button>

      {Object.keys(filteredIngredients).length === 0 ? (
        <p style={{ textAlign: "center", color: "#6b7280", marginTop: 40, padding: "0 16px" }}>
          {selectedMenuIds.length === 0 ? "Sélectionnez au moins un menu" : "Aucun ingrédient trouvé."}
        </p>
      ) : (
        <div>
          {Object.entries(filteredIngredients).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => {
            const isCollapsed = collapsedCategories[category];

            return (
              <div key={category}>
                {/* En-tête de catégorie cliquable */}
                <div 
                  onClick={() => toggleCategory(category)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 16px",
                    backgroundColor: "var(--primary-100)",
                    color: "var(--primary-700)",
                    cursor: "pointer",
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: 'var(--font-size-base)',
                    whiteSpace: "nowrap"
                  }}
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <span>{category}</span>
                </div>

                {/* Liste des items */}
                {!isCollapsed && (
                  <table style={{ width: "100%", borderCollapse: "collapse", display: "table" }}>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          style={{
                            backgroundColor: "white",
                            borderBottom: "1px solid #e5e7eb"
                          }}
                        >
                          {/* Case à cocher + Nom de l'ingrédient */}
                          <td style={{ 
                            padding: "8px 16px", 
                            fontSize: 'var(--font-size-lg)', 
                            color: item.disponible ? "#111827" : "var(--error)",
                            fontStyle: item.disponible ? "normal" : "italic",
                            display: "flex",
                            alignItems: "center",
                            gap: 8
                          }}>
                            <input
                              type="checkbox"
                              checked={item.disponible}
                              onChange={() => toggleDisponible(item.id, item.disponible)}
                              style={{ width: 18, height: 18, cursor: "pointer", flexShrink: 0 }}
                            />
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.nom}</span>
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
      </div>
    </>
  );
}
