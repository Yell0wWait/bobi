import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import { ArrowLeft, Wine, Utensils, Edit, Save, X, Trash2 } from 'lucide-react';
import { getBoissonImageUrl, getNourritureImageUrl } from "../../services/imageService";

export default function IngredientDetailAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [ingredient, setIngredient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    nom: "",
    categorie: "",
    prix: "",
    marque_pref: "",
    magasin_pref: "",
    disponible: true
  });
  
  // Utilisations
  const [boissons, setBoissons] = useState([]);
  const [nourritures, setNourritures] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Charger l'ingrédient
      const { data: ingData, error: ingError } = await supabase
        .from("inventaire")
        .select("*")
        .eq("id", id)
        .single();

      if (ingError) throw ingError;
      if (!ingData) {
        setError("Ingrédient introuvable");
        return;
      }

      setIngredient(ingData);
      setFormData({
        nom: ingData.nom || "",
        categorie: ingData.categorie || "",
        prix: ingData.prix || "",
        marque_pref: ingData.marque_pref || "",
        magasin_pref: ingData.magasin_pref || "",
        disponible: ingData.disponible ?? true
      });

      // Charger les boissons qui utilisent cet ingrédient
      const { data: boissonIngData, error: boissonIngError } = await supabase
        .from("boissons_ingredients")
        .select(`
          quantite,
          unite,
          boisson:boisson_id (
            id,
            nom,
            categorie
          )
        `)
        .eq("ingredient_id", id);

      if (boissonIngError) throw boissonIngError;
      setBoissons((boissonIngData || []).map(bi => ({
        ...bi.boisson,
        quantite: bi.quantite,
        unite: bi.unite
      })));

      // Charger les nourritures qui utilisent cet ingrédient
      const { data: nourritureIngData, error: nourritureIngError } = await supabase
        .from("nourritures_ingredients")
        .select(`
          quantite,
          unite,
          nourriture:nourriture_id (
            id,
            nom,
            categorie
          )
        `)
        .eq("ingredient_id", id);

      if (nourritureIngError) throw nourritureIngError;
      setNourritures((nourritureIngData || []).map(ni => ({
        ...ni.nourriture,
        quantite: ni.quantite,
        unite: ni.unite
      })));

    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("inventaire")
        .update({
          nom: formData.nom,
          categorie: formData.categorie,
          prix: formData.prix || null,
          marque_pref: formData.marque_pref || null,
          magasin_pref: formData.magasin_pref || null,
          disponible: formData.disponible
        })
        .eq("id", id);

      if (updateError) throw updateError;
      
      setIsEditing(false);
      load(); // Recharger les données
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors de la sauvegarde");
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${ingredient.nom}" ?`)) {
      return;
    }
    
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("inventaire")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
      
      navigate("/admin/inventaire");
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors de la suppression");
    }
  }

  if (loading) return <BobiAnimation type="loading" message="Bobi vérifie les stocks..." duration={0} />;
  if (error) return <div style={{ padding: 16, color: "var(--error)" }}>{error}</div>;
  if (!ingredient) return <div style={{ padding: 16 }}>Ingrédient introuvable</div>;

  return (
    <>
      <Header title={ingredient.nom || "Détail ingrédient"} showBackButton={true} />
      <div style={{ padding: 16, paddingBottom: 80, maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>



      {/* Informations de l'ingrédient */}
      <div style={{
        backgroundColor: "white",
        border: "1px solid var(--border-color)",
        borderRadius: 8,
        padding: 20,
        marginBottom: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        color: "var(--text-on-light-primary)"
      }}>
        <h1 style={{ 
          fontSize: "var(--font-size-2xl)", 
          fontWeight: 600, 
          marginTop: 0, 
          marginBottom: 16,
          color: "var(--text-on-light-primary)"
        }}>
          {isEditing ? (
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--secondary-200)",
                borderRadius: 6,
                fontSize: "var(--font-size-2xl)",
                fontWeight: 'var(--font-weight-semibold)',
                backgroundColor: "white",
                color: "var(--text-on-light-primary)",
                outline: "none"
              }}
            />
          ) : (
            ingredient.nom
          )}
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
          {/* Catégorie */}
          <div>
            <label style={{ display: "block", fontSize: 'var(--font-size-base)', color: "var(--text-on-light-secondary)", marginBottom: 4 }}>
              Catégorie
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.categorie}
                onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--secondary-200)",
                  borderRadius: 6,
                  fontSize: 'var(--font-size-base)',
                  backgroundColor: "white",
                  color: "var(--text-on-light-primary)",
                  outline: "none"
                }}
              />
            ) : (
              <div style={{ fontSize: 'var(--font-size-lg)', color: "var(--text-on-light-primary)" }}>{ingredient.categorie || "-"}</div>
            )}
          </div>

          {/* Prix */}
          <div>
            <label style={{ display: "block", fontSize: 'var(--font-size-base)', color: "var(--text-on-light-secondary)", marginBottom: 4 }}>
              Prix
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.prix}
                onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                placeholder="Ex: 5.99$"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--secondary-200)",
                  borderRadius: 6,
                  fontSize: 'var(--font-size-base)',
                  backgroundColor: "white",
                  color: "var(--text-on-light-primary)",
                  outline: "none"
                }}
              />
            ) : (
              <div style={{ fontSize: 'var(--font-size-lg)', color: "var(--text-on-light-primary)" }}>{ingredient.prix || "-"}</div>
            )}
          </div>

          {/* Marque préférée */}
          <div>
            <label style={{ display: "block", fontSize: 'var(--font-size-base)', color: "var(--text-on-light-secondary)", marginBottom: 4 }}>
              Marque préférée
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.marque_pref}
                onChange={(e) => setFormData({ ...formData, marque_pref: e.target.value })}
                placeholder="Ex: Heinz"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--secondary-200)",
                  borderRadius: 6,
                  fontSize: 'var(--font-size-base)',
                  backgroundColor: "white",
                  color: "var(--text-on-light-primary)",
                  outline: "none"
                }}
              />
            ) : (
              <div style={{ fontSize: 'var(--font-size-lg)', color: "var(--text-on-light-primary)" }}>{ingredient.marque_pref || "-"}</div>
            )}
          </div>

          {/* Magasin préféré */}
          <div>
            <label style={{ display: "block", fontSize: 'var(--font-size-base)', color: "var(--text-on-light-secondary)", marginBottom: 4 }}>
              Magasin préféré (optionnel)
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.magasin_pref}
                onChange={(e) => setFormData({ ...formData, magasin_pref: e.target.value })}
                placeholder="Ex: IGA"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--secondary-200)",
                  borderRadius: 6,
                  fontSize: 'var(--font-size-base)',
                  backgroundColor: "white",
                  color: "var(--text-on-light-primary)",
                  outline: "none"
                }}
              />
            ) : (
              <div style={{ fontSize: 'var(--font-size-lg)', color: "var(--text-on-light-primary)" }}>{ingredient.magasin_pref || "-"}</div>
            )}
          </div>

          {/* Disponibilité */}
          <div>
            <label style={{ display: "block", fontSize: 'var(--font-size-base)', color: "var(--text-on-light-secondary)", marginBottom: 4 }}>
              Disponibilité
            </label>
            {isEditing ? (
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formData.disponible}
                  onChange={(e) => setFormData({ ...formData, disponible: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <span style={{ fontSize: 'var(--font-size-lg)', color: "var(--text-on-light-primary)" }}>Disponible</span>
              </label>
            ) : (
              <div style={{ 
                fontSize: 'var(--font-size-base)', 
                color: ingredient.disponible ? "var(--secondary-600)" : "var(--error)",
                fontWeight: 'var(--font-weight-semibold)'
              }}>
                {ingredient.disponible ? "Disponible" : "Indisponible"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section Boissons */}
      {boissons.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ 
            fontSize: "var(--font-size-lg)", 
            fontWeight: 600, 
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--text-primary)"
          }}>
            <Wine size={20} />
            Utilisé dans {boissons.length} boisson{boissons.length > 1 ? 's' : ''}
          </h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {boissons.map((b) => (
              <div
                key={b.id}
                onClick={() => navigate(`/admin/boissons/${b.id}`)}
                style={{
                  backgroundColor: "white",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  padding: 16,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  color: "var(--text-on-light-primary)",
                  cursor: "pointer",
                  transition: "box-shadow 0.2s",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start"
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)"}
              >
                <img
                  src={getBoissonImageUrl(b.nom)}
                  alt={b.nom}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 6,
                    objectFit: "cover"
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-lg)', marginBottom: 4 }}>{b.nom}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: "var(--text-on-light-secondary)", marginBottom: 4 }}>{b.categorie}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: "var(--primary-600)" }}>
                    {b.quantite} {b.unite}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Nourritures */}
      {nourritures.length > 0 && (
        <div>
          <h2 style={{ 
            fontSize: "var(--font-size-lg)", 
            fontWeight: 600, 
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--text-primary)"
          }}>
            <Utensils size={20} />
            Utilisé dans {nourritures.length} plat{nourritures.length > 1 ? 's' : ''}
          </h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {nourritures.map((n) => (
              <div
                key={n.id}
                onClick={() => navigate(`/admin/nourriture/${n.id}`)}
                style={{
                  backgroundColor: "white",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  padding: 16,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  color: "var(--text-on-light-primary)",
                  cursor: "pointer",
                  transition: "box-shadow 0.2s",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start"
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)"}
              >
                <img
                  src={getNourritureImageUrl(n.nom)}
                  alt={n.nom}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 6,
                    objectFit: "cover"
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-lg)', marginBottom: 4 }}>{n.nom}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: "var(--text-on-light-secondary)", marginBottom: 4 }}>{n.categorie}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: "var(--primary-600)" }}>
                    {n.quantite} {n.unite}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message si aucune utilisation */}
      {boissons.length === 0 && nourritures.length === 0 && (
        <div style={{
          backgroundColor: "var(--bg-secondary)",
          borderRadius: 8,
          padding: 20,
          textAlign: "center",
          color: "var(--text-secondary)",
          fontStyle: "italic"
        }}>
          Cet ingrédient n'est utilisé dans aucune boisson ou nourriture pour le moment.
        </div>
      )}
      </div>

      {/* Bouton flottant principal Edit/Annuler */}
      <button
        onClick={() => setIsEditing(!isEditing)}
        className="floating-button"
        style={{ backgroundColor: isEditing ? "var(--bg-secondary)" : "var(--secondary-500)" }}
        title={isEditing ? "Annuler" : "Modifier"}
      >
        {isEditing ? <X size={24} /> : <Edit size={24} />}
      </button>

      {/* Boutons flottants d'action en mode édition */}
      {isEditing && (
        <div className="floating-action-buttons">
          <button
            onClick={handleSave}
            className="floating-save-button"
            title="Enregistrer"
          >
            <Save size={20} />
          </button>
          <button
            onClick={handleDelete}
            className="floating-delete-button"
            title="Supprimer"
          >
            <Trash2 size={20} />
          </button>
        </div>
      )}
    </>
  );
}







