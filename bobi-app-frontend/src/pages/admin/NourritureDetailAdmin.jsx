import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { useNourritureImage } from "../../hooks/useImage";
import { toPascalCase } from "../../services/imageService";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import { Edit, X, Save, Trash2, Plus, ThumbsUp, ThumbsDown, Check } from 'lucide-react';

// Ajouter les animations CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}

export default function NourritureDetailAdmin() {
  const { id } = useParams(); // 'new' or id
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(id === "new"); // Mode édition activé par défaut pour "new"
  const [nom, setNom] = useState("");
    const imageUrl = useNourritureImage(nom);
  const [categorie, setCategorie] = useState("");
  const [tags, setTags] = useState([]);
  const [origines, setOrigines] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [newOrigine, setNewOrigine] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [lienRecette, setLienRecette] = useState("");
  const [nomSiteRecette, setNomSiteRecette] = useState("");
  const [actif, setActif] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showBobiSuccess, setShowBobiSuccess] = useState(false);

  // Ingrédients
  const [ingredients, setIngredients] = useState([]);
  const [inventaire, setInventaire] = useState([]);
  const [newIngredient, setNewIngredient] = useState({ ingredient_id: "", quantite: "", unite: "" });
  const [editingIngredient, setEditingIngredient] = useState(null);

  // Préparation
  const [preparations, setPreparations] = useState([]);
  const [newPreparation, setNewPreparation] = useState({ ordre: "", description: "" });
  const [editingPreparation, setEditingPreparation] = useState(null);

  // Dropdowns pour catégories
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  
  useEffect(() => {
    let isMounted = true;

    async function fetchIngredients() {
      const { data: ingData, error: ingErr } = await supabase
        .from("nourritures_ingredients")
        .select("id, ingredient_id, quantite, unite")
        .eq("nourriture_id", id)
        .order("id", { ascending: true });
      if (ingErr) throw ingErr;
      if (isMounted) setIngredients(ingData || []);
    }

    async function fetchPreparations() {
      const { data: prepData, error: prepErr } = await supabase
        .from("nourritures_preparation")
        .select("id, ordre, description")
        .eq("nourriture_id", id)
        .order("ordre", { ascending: true });
      if (prepErr) throw prepErr;
      if (isMounted) setPreparations(prepData || []);
    }

    async function load() {
      if (!id || id === "new") return;
      setLoading(true);
      try {
        // Charger la nourriture
        const { data, error } = await supabase.from("nourritures").select("id, nom, categorie, tags, origine, commentaire, lien_recette, recette, actif").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!data) {
          setError("Nourriture introuvable");
          setLoading(false);
          return;
        }
        setNom(data.nom || "");
        setCategorie(data.categorie || "");
        setTags(Array.isArray(data.tags) ? data.tags : []);
        setOrigines(Array.isArray(data.origine) ? data.origine : []);
        setCommentaire(data.commentaire || "");
        setLienRecette(data.lien_recette || "");
        setNomSiteRecette(data.recette || "");
        setActif(data.actif ?? true);

        // Charger les ingrédients et étapes de préparation
        await Promise.all([fetchIngredients(), fetchPreparations()]);
      } catch (err) {
        console.error(err);
        setError(err.message || "Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    }

    async function loadInventaire() {
      try {
        const { data, error } = await supabase
          .from("inventaire")
          .select("id, nom, categorie")
          .order("nom", { ascending: true });
        if (error) throw error;
        setInventaire(data || []);
      } catch (err) {
        console.error(err);
      }
    }

    async function loadAllNourritures() {
      try {
        const { data, error } = await supabase
          .from("nourritures")
          .select("id, nom, categorie")
          .order("nom", { ascending: true });
        if (error) throw error;
        
        // Extraire catégories uniques
        const cats = [...new Set(data.map(n => n.categorie).filter(Boolean))];
        setUniqueCategories(cats.sort());
      } catch (err) {
        console.error(err);
      }
    }

    load();
    loadInventaire();
    loadAllNourritures();

    let channel;
    if (id && id !== "new") {
      channel = supabase
        .channel(`nourriture-detail-${id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "nourritures_ingredients", filter: `nourriture_id=eq.${id}` },
          () => fetchIngredients().catch((err) => console.error(err))
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "nourritures_preparation", filter: `nourriture_id=eq.${id}` },
          () => fetchPreparations().catch((err) => console.error(err))
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [id]);

  const sanitizeArray = (values) => (
    Array.isArray(values) ? values.map((v) => String(v || "").trim()).filter(Boolean) : []
  );

  async function handleSave() {
    setError(null);
    setLoading(true);

    // Validation
    if (!nom || !nom.trim()) {
      setError('Le champ "Nom" est requis.');
      setLoading(false);
      return;
    }

    const cleanTags = sanitizeArray(tags);
    const cleanOrigines = sanitizeArray(origines);

    try {
      if (id === "new") {
        const { error } = await supabase.from("nourritures").insert([
          { nom, categorie, tags: cleanTags, origine: cleanOrigines, commentaire, lien_recette: lienRecette, recette: nomSiteRecette, actif }
        ]).select().maybeSingle();
        if (error) throw error;
        // Retour à la page précédente après création
        navigate(-1);
      } else {
        const { data, error } = await supabase
          .from("nourritures")
          .update({ nom, categorie, tags: cleanTags, origine: cleanOrigines, commentaire, lien_recette: lienRecette, recette: nomSiteRecette, actif })
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          // Rafraîchit l'état local pour refléter la valeur DB
          setNom(data.nom || "");
          setCategorie(data.categorie || "");
          setTags(Array.isArray(data.tags) ? data.tags : cleanTags);
          setOrigines(Array.isArray(data.origine) ? data.origine : cleanOrigines);
          setCommentaire(data.commentaire || "");
          setLienRecette(data.lien_recette || "");
          setNomSiteRecette(data.recette || "");
          setActif(data.actif ?? true);

          // Recharger les ingrédients
          const { data: ingData, error: ingErr } = await supabase
            .from("nourritures_ingredients")
            .select("id, ingredient_id, quantite, unite")
            .eq("nourriture_id", id)
            .order("id", { ascending: true });
          if (!ingErr) setIngredients(ingData || []);

          // Recharger les étapes de préparation
          const { data: prepData, error: prepErr } = await supabase
            .from("nourritures_preparation")
            .select("id, ordre, description")
            .eq("nourriture_id", id)
            .order("ordre", { ascending: true });
          if (!prepErr) setPreparations(prepData || []);
          
          // Afficher l'animation Bobi
          setShowBobiSuccess(true);
          setTimeout(() => setShowBobiSuccess(false), 4000);
        }
        // Sortir du mode édition après sauvegarde
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Fichier trop volumineux (max 2 Mo)");
      return;
    }

    if (!nom || !nom.trim()) {
      setUploadError("Renseigne d'abord le nom de la nourriture");
      return;
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    // Utiliser la convention PascalCase
    const pascalName = toPascalCase(nom.trim());
    const fileName = `${pascalName}.${ext}`;

    try {
      setUploadLoading(true);
      const { error: upErr } = await supabase.storage
        .from("nourritures")
        .upload(fileName, file, { upsert: true, contentType: file.type || `image/${ext}` });

      if (upErr) throw upErr;

      alert(`Image uploadée avec succès : ${fileName}`);
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "Erreur lors de l'upload");
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette nourriture ?")) return;
    try {
      const { error } = await supabase.from("nourritures").delete().eq("id", id);
      if (error) throw error;
      navigate("/admin/nourriture");
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur suppression");
    }
  }

  // Gestion des ingrédients
  async function addIngredient() {
    if (!newIngredient.ingredient_id || !newIngredient.quantite) {
      alert("Sélectionne un ingrédient et une quantité");
      return;
    }
    if (id === "new") {
      alert("Enregistre d'abord la nourriture avant d'ajouter des ingrédients");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("nourritures_ingredients")
        .insert([{ nourriture_id: id, ingredient_id: newIngredient.ingredient_id, quantite: newIngredient.quantite, unite: newIngredient.unite }])
        .select()
        .maybeSingle();
      if (error) throw error;
      setIngredients([...ingredients, data]);
      setNewIngredient({ ingredient_id: "", quantite: "", unite: "" });
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout : " + err.message);
    }
  }

  async function updateIngredient(ingId) {
    if (!editingIngredient) return;
    if (!editingIngredient.ingredient_id || !editingIngredient.quantite) {
      alert("Sélectionne un ingrédient et une quantité");
      return;
    }
    try {
      const { error } = await supabase
        .from("nourritures_ingredients")
        .update({ 
          ingredient_id: editingIngredient.ingredient_id,
          quantite: editingIngredient.quantite, 
          unite: editingIngredient.unite 
        })
        .eq("id", ingId);
      if (error) throw error;
      setIngredients(ingredients.map(i => i.id === ingId ? editingIngredient : i));
      setEditingIngredient(null);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour : " + err.message);
    }
  }

  async function removeIngredient(ingId) {
    if (!confirm("Supprimer cet ingrédient ?")) return;
    try {
      const { error } = await supabase.from("nourritures_ingredients").delete().eq("id", ingId);
      if (error) throw error;
      setIngredients(ingredients.filter(i => i.id !== ingId));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression : " + err.message);
    }
  }

  // Gestion des étapes de préparation
  async function addPreparation() {
    if (!newPreparation.ordre || !newPreparation.description) {
      alert("Remplis l'ordre et la description");
      return;
    }
    if (id === "new") {
      alert("Enregistre d'abord la nourriture avant d'ajouter des étapes");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("nourritures_preparation")
        .insert([{ nourriture_id: id, ...newPreparation }])
        .select()
        .maybeSingle();
      if (error) throw error;
      setPreparations([...preparations, data].sort((a, b) => a.ordre - b.ordre));
      setNewPreparation({ ordre: "", description: "" });
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout : " + err.message);
    }
  }

  async function updatePreparation(prepId) {
    if (!editingPreparation) return;
    try {
      const { error } = await supabase
        .from("nourritures_preparation")
        .update({ 
          ordre: editingPreparation.ordre,
          description: editingPreparation.description 
        })
        .eq("id", prepId);
      if (error) throw error;
      setPreparations(preparations.map(p => p.id === prepId ? editingPreparation : p).sort((a, b) => a.ordre - b.ordre));
      setEditingPreparation(null);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour : " + err.message);
    }
  }

  async function removePreparation(prepId) {
    if (!confirm("Supprimer cette étape ?")) return;
    try {
      const { error } = await supabase.from("nourritures_preparation").delete().eq("id", prepId);
      if (error) throw error;
      setPreparations(preparations.filter(p => p.id !== prepId));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression : " + err.message);
    }
  }

  function getIngredientName(ingredientId) {
    const inv = inventaire.find(i => i.id === ingredientId);
    return inv ? inv.nom : `ID: ${ingredientId}`;
  }

  const pageTitle = id === "new" ? "Nouvelle nourriture" : nom || "Détail nourriture";

  return (
    <>
      {showBobiSuccess && (
        <BobiAnimation 
          type="success" 
          message="Nourriture mise à jour avec succès !" 
          duration={4000}
          onComplete={() => setShowBobiSuccess(false)}
        />
      )}
      <Header title={pageTitle} showBackButton={true} />
      <div style={{ padding: 16, maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      <style>{`
        @media print {
          body { font-family: Arial, sans-serif; }
          button { display: none !important; }
          input, textarea, select { border: none !important; background: transparent !important; }
          h1 { font-size: 28px; margin-bottom: 10px; }
          h2 { font-size: 20px; margin-top: 20px; page-break-after: avoid; }
          table { page-break-inside: avoid; }
          label { display: none; }
          .no-print { display: none !important; }
          form { border: none !important; }
        }
      `}</style>
      
      <div style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 10 }}>
            <h1 style={{ margin: 0 }}>{id === "new" ? "Ajouter une nourriture" : nom || "Nourriture"}</h1>
            {id !== "new" && !isEditing && (
              <div
                className={`availability-indicator ${actif ? "availability-indicator-active" : "availability-indicator-inactive"}`}
                title={actif ? "Disponible" : "Indisponible"}
                aria-label={actif ? "Disponible" : "Indisponible"}
              >
                {actif ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
              </div>
            )}
          </div>
          {!isEditing && categorie && (
            <div className="type-indicator type-indicator-standard">{categorie}</div>
          )}
          {!isEditing && (tags.length > 0 || origines.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 8 }}>
              {tags.map((item, idx) => (
                item && (
                  <span
                    key={`tag-${idx}`}
                    style={{
                      padding: '4px 12px',
                      background: 'var(--primary-100)',
                      color: 'var(--primary-700)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: 'var(--font-weight-medium)'
                    }}
                  >
                    {item}
                  </span>
                )
              ))}
              {origines.map((item, idx) => (
                item && (
                  <span
                    key={`origine-${idx}`}
                    style={{
                      padding: '4px 12px',
                      background: 'var(--secondary-50)',
                      color: 'var(--secondary-700)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: 'var(--font-weight-medium)'
                    }}
                  >
                    {item}
                  </span>
                )
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 12,
          padding: "12px 14px",
          backgroundColor: "#ffebee",
          color: "#c62828",
          borderRadius: 8,
          fontWeight: 'var(--font-weight-semibold)'
        }}>
          {error}
        </div>
      )}

      {/* Floating Action Button */}
      {id !== "new" && (
        <button 
          type="button" 
          onClick={() => setIsEditing(!isEditing)} 
          className="floating-button no-print"
          style={{ backgroundColor: isEditing ? "#6c757d" : "var(--secondary-500)" }}
          title={isEditing ? "Annuler" : "Modifier"}
        >
          {isEditing ? <X size={24} /> : <Edit size={24} />}
        </button>
      )}

      <div style={{ maxWidth: 800 }}>
        {/* Image centrée */}
        <div style={{ marginBottom: 30, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ maxWidth: 400, width: "100%" }}>
            {imageUrl ? (
              <img src={imageUrl} alt={nom} style={{ width: "100%", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
            ) : (
              <div style={{ width: "100%", height: 300, backgroundColor: "#f0f0f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                Aucune image
              </div>
            )}
            {isEditing && (
              <div style={{ marginTop: 10 }}>
                <input type="file" accept="image/*" onChange={handleUpload} disabled={uploadLoading} />
                {uploadLoading && <span style={{ marginLeft: 8, fontSize: 'var(--font-size-base)' }}>Upload...</span>}
                {uploadError && <div style={{ color: "red", fontSize: 'var(--font-size-base)', marginTop: 5 }}>{uploadError}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Informations */}
        <div>
          {isEditing && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 'var(--font-weight-bold)', marginBottom: 5, color: "#666", fontSize: 'var(--font-size-base)' }}>Nom</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} style={{ width: "100%", padding: 10, fontSize: 'var(--font-size-lg)', borderRadius: 5, border: "1px solid #ddd" }} />
            </div>
          )}

          {isEditing && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 'var(--font-weight-bold)', marginBottom: 5, color: "#666", fontSize: 'var(--font-size-base)' }}>Catégorie</label>
              {newCategory ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onBlur={() => {
                      if (newCategory.trim()) {
                        setCategorie(newCategory.trim());
                      }
                    }}
                    placeholder="Nouvelle catégorie"
                    style={{ flex: 1, padding: 10, fontSize: 'var(--font-size-lg)', borderRadius: 5, border: "1px solid #ddd" }}
                  />
                  <button
                    onClick={() => {
                      setNewCategory("");
                      setCategorie("");
                    }}
                    style={{ padding: "10px 16px", backgroundColor: "#f0f0f0", border: "none", borderRadius: 5, cursor: "pointer" }}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <select
                  value={categorie}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setNewCategory(" ");
                    } else {
                      setCategorie(e.target.value);
                    }
                  }}
                  style={{ width: "100%", padding: 10, fontSize: 'var(--font-size-lg)', borderRadius: 5, border: "1px solid #ddd" }}
                >
                  <option value="">-- Sélectionner --</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__new__">+ Nouvelle catégorie</option>
                </select>
              )}
            </div>
          )}

            {isEditing && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
                  <span style={{ fontWeight: 'var(--font-weight-bold)', color: "#666", fontSize: 'var(--font-size-base)' }}>Actif</span>
                </label>
              </div>
            )}

            {isEditing && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 'var(--font-weight-bold)', marginBottom: 5, color: "#666", fontSize: 'var(--font-size-base)' }}>Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 10 }}>
                  {tags.length > 0 ? (
                    tags.map((item, idx) => (
                      item && (
                        <span
                          key={`tag-edit-${idx}`}
                          style={{
                            padding: '4px 12px',
                            background: 'var(--primary-100)',
                            color: 'var(--primary-700)',
                            borderRadius: 'var(--border-radius-sm)',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 'var(--font-weight-medium)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          {item}
                          <button
                            onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary-700)',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: 'var(--font-size-lg)',
                              lineHeight: 1
                            }}
                            title="Retirer"
                          >
                            +
                          </button>
                        </span>
                      )
                    ))
                  ) : (
                    <span style={{ fontStyle: 'italic', color: '#999', fontSize: 'var(--font-size-base)' }}>Aucun tag</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Nouveau tag"
                    style={{ flex: 1, padding: 8, fontSize: 'var(--font-size-base)', borderRadius: 5, border: "1px solid #ddd" }}
                  />
                  <button
                    onClick={() => {
                      const next = newTag.trim();
                      if (next && !tags.includes(next)) {
                        setTags([...tags, next]);
                      }
                      setNewTag("");
                    }}
                    style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 5, cursor: "pointer" }}
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            )}

            {isEditing && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 'var(--font-weight-bold)', marginBottom: 5, color: "#666", fontSize: 'var(--font-size-base)' }}>Origines</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 10 }}>
                  {origines.length > 0 ? (
                    origines.map((item, idx) => (
                      item && (
                        <span
                          key={`origine-edit-${idx}`}
                          style={{
                            padding: '4px 12px',
                            background: 'var(--secondary-50)',
                            color: 'var(--secondary-700)',
                            borderRadius: 'var(--border-radius-sm)',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 'var(--font-weight-medium)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          {item}
                          <button
                            onClick={() => setOrigines(origines.filter((_, i) => i !== idx))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--secondary-700)',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: 'var(--font-size-lg)',
                              lineHeight: 1
                            }}
                            title="Retirer"
                          >
                            +
                          </button>
                        </span>
                      )
                    ))
                  ) : (
                    <span style={{ fontStyle: 'italic', color: '#999', fontSize: 'var(--font-size-base)' }}>Aucune origine</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={newOrigine}
                    onChange={(e) => setNewOrigine(e.target.value)}
                    placeholder="Nouvelle origine"
                    style={{ flex: 1, padding: 8, fontSize: 'var(--font-size-base)', borderRadius: 5, border: "1px solid #ddd" }}
                  />
                  <button
                    onClick={() => {
                      const next = newOrigine.trim();
                      if (next && !origines.includes(next)) {
                        setOrigines([...origines, next]);
                      }
                      setNewOrigine("");
                    }}
                    style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 5, cursor: "pointer" }}
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            )}
            {/* Boutons flottants en mode édition */}
            {isEditing && (
              <div className="floating-action-buttons">
                <button onClick={handleSave} disabled={loading} className="floating-save-button" title={loading ? "Enregistrement..." : "Enregistrer"}>
                  <Save size={20} />
                </button>
                {id !== "new" && (
                  <button type="button" onClick={handleDelete} className="floating-delete-button" title="Supprimer">
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
      </div>

      {/* Section Ingrédients */}
      {id !== "new" && (
        <div style={{ marginTop: 40, maxWidth: 800 }}>
          <h2>Ingrédients</h2>
          
          {ingredients.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#888" }}>Aucun ingrédient défini.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, marginBottom: 20 }}>
              {ingredients.map(ing => {
                const isEditingIng = editingIngredient && editingIngredient.id === ing.id;
                return (
                  <li key={ing.id} style={{ marginBottom: 8, padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {isEditingIng ? (
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Qté"
                          value={editingIngredient.quantite}
                          onChange={(e) => setEditingIngredient({ ...editingIngredient, quantite: e.target.value })}
                          style={{ width: 80, padding: 6 }}
                        />
                        <input
                          placeholder="Unité"
                          value={editingIngredient.unite}
                          onChange={(e) => setEditingIngredient({ ...editingIngredient, unite: e.target.value })}
                          style={{ width: 80, padding: 6 }}
                        />
                        <select
                          value={editingIngredient.ingredient_id}
                          onChange={(e) => setEditingIngredient({ ...editingIngredient, ingredient_id: e.target.value })}
                          style={{ flex: 1, padding: 6 }}
                        >
                          {inventaire.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.nom}</option>
                          ))}
                        </select>
                        <button onClick={() => updateIngredient(ing.id)} style={{ padding: "4px 8px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Sauvegarder">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingIngredient(null)} style={{ padding: "4px 8px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Annuler">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ flex: 1 }}>
                          {ing.quantite && `${ing.quantite} `}
                          {ing.unite && `${ing.unite} `}
                          {getIngredientName(ing.ingredient_id)}
                        </span>
                        {isEditing && (
                          <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={() => setEditingIngredient(ing)} style={{ padding: "4px 8px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Éditer">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => removeIngredient(ing.id)} style={{ padding: "4px 8px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Supprimer">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {isEditing && (
            <div style={{ padding: 15, backgroundColor: "#f9f9f9", borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>Ajouter un ingrédient</h3>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 'var(--font-size-base)' }}>Ingrédient</label>
                  <select
                    value={newIngredient.ingredient_id}
                    onChange={(e) => setNewIngredient({ ...newIngredient, ingredient_id: e.target.value })}
                    style={{ width: "100%", padding: 8 }}
                  >
                    <option value="">-- Sélectionner --</option>
                    {inventaire.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.nom} {inv.categorie ? `(${inv.categorie})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 100 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 'var(--font-size-base)' }}>Quantité</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newIngredient.quantite}
                    onChange={(e) => setNewIngredient({ ...newIngredient, quantite: e.target.value })}
                    style={{ width: "100%", padding: 8 }}
                  />
                </div>
                <div style={{ width: 100 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 'var(--font-size-base)' }}>Unité</label>
                  <input
                    value={newIngredient.unite}
                    onChange={(e) => setNewIngredient({ ...newIngredient, unite: e.target.value })}
                    placeholder="ml, g, etc."
                    style={{ width: "100%", padding: 8 }}
                  />
                </div>
                <button onClick={addIngredient} style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
                  ➕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section Préparation */}
      {id !== "new" && (
        <div style={{ marginTop: 40, maxWidth: 800 }}>
          <h2>Préparation</h2>
          
          {preparations.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#888" }}>Aucune étape définie.</p>
          ) : (
            <ol style={{ paddingLeft: 20, marginBottom: 20 }}>
              {preparations.map(prep => {
                const isEditingPrep = editingPreparation && editingPreparation.id === prep.id;
                return (
                  <li key={prep.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #eee" }}>
                    {isEditingPrep ? (
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input
                          type="number"
                          value={editingPreparation.ordre}
                          onChange={(e) => setEditingPreparation({ ...editingPreparation, ordre: e.target.value })}
                          style={{ width: 60, padding: 4 }}
                        />
                        <input
                          value={editingPreparation.description}
                          onChange={(e) => setEditingPreparation({ ...editingPreparation, description: e.target.value })}
                          style={{ flex: 1, padding: 4 }}
                        />
                        <button onClick={() => updatePreparation(prep.id)} style={{ padding: "4px 8px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Sauvegarder">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingPreparation(null)} style={{ padding: "4px 8px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Annuler">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ flex: 1 }}>{prep.description}</span>
                        {isEditing && (
                          <div>
                            <button onClick={() => setEditingPreparation(prep)} style={{ padding: "4px 8px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: 4, cursor: "pointer", marginLeft: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="Éditer">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => removePreparation(prep.id)} style={{ padding: "4px 8px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: 4, cursor: "pointer", marginLeft: 4, display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="Supprimer">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {isEditing && (
            <div style={{ padding: 15, backgroundColor: "#f9f9f9", borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>Ajouter une étape</h3>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ width: 80 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 'var(--font-size-base)' }}>Ordre</label>
                  <input
                    type="number"
                    value={newPreparation.ordre}
                    onChange={(e) => setNewPreparation({ ...newPreparation, ordre: e.target.value })}
                    style={{ width: "100%", padding: 8 }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 'var(--font-size-base)' }}>Description</label>
                  <input
                    value={newPreparation.description}
                    onChange={(e) => setNewPreparation({ ...newPreparation, description: e.target.value })}
                    placeholder="Ex: Mélanger les ingrédients"
                    style={{ width: "100%", padding: 8 }}
                  />
                </div>
                <button onClick={addPreparation} style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
                  ➕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section Commentaires */}
      {id !== "new" && (
        <div style={{ marginTop: 40, maxWidth: 800 }}>
          <h2>Commentaires</h2>
          {isEditing ? (
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={4} style={{ width: "100%", padding: 10, fontSize: 'var(--font-size-lg)', borderRadius: 5, border: "1px solid #ddd" }} />
          ) : (
            <div style={{ fontSize: 'var(--font-size-lg)', lineHeight: 1.6, color: "white", padding: "10px 0" }}>{commentaire || <span style={{ fontStyle: "italic", color: "#888" }}>Aucun commentaire</span>}</div>
          )}
        </div>
      )}

      {/* Section Recette */}
      {id !== "new" && (
        <div style={{ marginTop: 40, maxWidth: 800 }}>
          <h2>Recette en ligne</h2>
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              <div>
                <label style={{ display: "block", marginBottom: 5, fontWeight: 'var(--font-weight-bold)' }}>Nom du site</label>
                <input 
                  type="text" 
                  value={nomSiteRecette} 
                  onChange={(e) => setNomSiteRecette(e.target.value)} 
                  placeholder="Ex: Ricardo, Trois fois par jour..." 
                  style={{ width: "100%", padding: 10, fontSize: 'var(--font-size-lg)', borderRadius: 5, border: "1px solid #ddd" }} 
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 5, fontWeight: 'var(--font-weight-bold)' }}>URL de la recette</label>
                <input 
                  type="url" 
                  value={lienRecette} 
                  onChange={(e) => setLienRecette(e.target.value)} 
                  placeholder="https://..." 
                  style={{ width: "100%", padding: 10, fontSize: 'var(--font-size-lg)', borderRadius: 5, border: "1px solid #ddd" }} 
                />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 'var(--font-size-lg)', lineHeight: 1.6, color: "white", padding: "10px 0" }}>
              {lienRecette && nomSiteRecette ? (
                <a 
                  href={lienRecette} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: "#4da6ff", textDecoration: "none", fontWeight: 'var(--font-weight-bold)' }}
                  onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                  onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                >
                  {nomSiteRecette}
                </a>
              ) : (
                <span style={{ fontStyle: "italic", color: "#888" }}>Aucun lien de recette</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}









