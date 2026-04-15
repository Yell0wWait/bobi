import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { useBoissonImage } from "../../hooks/useImage";
import { toPascalCase } from "../../services/imageService";
import { toLocalDateYYYYMMDD, toLocalTimestamp } from "../../services/dateService";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import RecipeImportModal from "../../components/RecipeImportModal";
import { Edit, X, Save, Trash2, Plus, Star, StarHalf, Wine, ThumbsUp, ThumbsDown, Check, ShoppingCart, Download, Flower, AlertTriangle } from 'lucide-react';

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

export default function BoissonDetailAdmin() {
  const { id } = useParams(); // 'new' or id
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(id === "new"); // Mode édition activé par défaut pour "new"
  const [nom, setNom] = useState("");
  const imageUrl = useBoissonImage(nom);
  const [categorie, setCategorie] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [lienRecette, setLienRecette] = useState("");
  const [nomSiteRecette, setNomSiteRecette] = useState("");
  const [profil, setProfil] = useState([]);
  const [actif, setActif] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [commandLoading, setCommandLoading] = useState(false);
  const [commandSuccess, setCommandSuccess] = useState(null);
  const [showBobiSuccess, setShowBobiSuccess] = useState(false);

  const adminData = JSON.parse(localStorage.getItem("bobi_admin") || "null");
  const adminId = adminData?.id || null;

  // Ingrédients
  const [ingredients, setIngredients] = useState([]);
  const [inventaire, setInventaire] = useState([]);
  const [newIngredient, setNewIngredient] = useState({ ingredient_id: "", quantite: "", unite: "", alternatives: "" });
  const [editingIngredient, setEditingIngredient] = useState(null);

  // Préparation
  const [preparations, setPreparations] = useState([]);
  const [newPreparation, setNewPreparation] = useState({ ordre: "", description: "" });
  const [editingPreparation, setEditingPreparation] = useState(null);

  // Variantes
  const [variantes, setVariantes] = useState([]);
  const [allBoissons, setAllBoissons] = useState([]);
  const [selectedVariante, setSelectedVariante] = useState("");

  // Dropdowns pour catégories et profils
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [uniqueProfils, setUniqueProfils] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [newProfil, setNewProfil] = useState("");
  const [selectedProfil, setSelectedProfil] = useState("");

  // Commandes avec cette boisson
  const [commandes, setCommandes] = useState([]);
  const [expandedCommande, setExpandedCommande] = useState(null);

  // Import depuis URL
  const [showImportModal, setShowImportModal] = useState(false);

  async function loadBoissonData() {
    if (!id || id === "new") return;
    setLoading(true);
    try {
      // Charger la boisson
      const { data, error } = await supabase
        .from("boissons")
        .select("id, nom, categorie, commentaire, lien_recette, recette, profil, actif")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setError("Boisson introuvable");
        setLoading(false);
        return;
      }
      const boissonName = data.nom || "";
      setNom(boissonName);
      setCategorie(data.categorie || "");
      setCommentaire(data.commentaire || "");
      setLienRecette(data.lien_recette || "");
      setNomSiteRecette(data.recette || "");
      setProfil(data.profil || []);
      setActif(data.actif ?? true);

      // Charger les ingrédients
      const { data: ingData, error: ingErr } = await supabase
        .from("boissons_ingredients")
        .select("id, ingredient_id, quantite, unite, alternatives, type")
        .eq("boisson_id", id)
        .order("id", { ascending: true });
      if (ingErr) throw ingErr;
      setIngredients((ingData || []).map((ing) => ({
        ...ing,
        alternatives: normalizeAlternatives(ing.alternatives)[0] || "",
      })));

      // Charger les étapes de préparation
      const { data: prepData, error: prepErr } = await supabase
        .from("boissons_preparation")
        .select("id, ordre, description")
        .eq("boisson_id", id)
        .order("ordre", { ascending: true });
      if (prepErr) throw prepErr;
      setPreparations(prepData || []);

      // Charger les variantes
      const { data: varData, error: varErr } = await supabase
        .from("boissons_variantes")
        .select(`
          id,
          variante:variante_id(
            id,
            nom,
            categorie
          )
        `)
        .eq("boisson_id", id);
      if (varErr) throw varErr;
      setVariantes(varData || []);

      // Charger les commandes avec cette boisson
      const { data: cmdData, error: cmdErr } = await supabase
        .from("commandes")
        .select("id, boisson_id, degustateur_secret_token, date_commande, note, statut, commentaire")
        .eq("boisson_id", id)
        .order("date_commande", { ascending: false });
      if (cmdErr) throw cmdErr;

      const cmds = cmdData || [];
      // Si des commandes existent, récupérer les pseudonymes des dégustateurs
      let guestMap = {};
      const tokens = Array.from(new Set(cmds.map(c => c.degustateur_secret_token).filter(Boolean)));
      if (tokens.length > 0) {
        const { data: guests, error: guestsErr } = await supabase
          .from("degustateur")
          .select("pseudo, secret_token")
          .in("secret_token", tokens);
        if (!guestsErr && guests) {
          guests.forEach(g => (guestMap[g.secret_token] = g.pseudo));
        }
      }

      setCommandes(cmds.map(c => ({
        ...c,
        guest_pseudo: guestMap[c.degustateur_secret_token] || "Inconnu",
        boisson_nom: boissonName
      })));

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

  async function loadAllBoissons() {
    try {
      const { data, error } = await supabase
        .from("boissons")
        .select("id, nom, categorie, profil")
        .order("nom", { ascending: true });
      if (error) throw error;
      setAllBoissons(data || []);
      
      // Extraire catégories uniques
      const cats = [...new Set(data.map(b => b.categorie).filter(Boolean))];
      setUniqueCategories(cats.sort());
      
      // Extraire profils uniques (flatten les arrays)
      const profils = new Set();
      data.forEach(b => {
        if (b.profil && Array.isArray(b.profil)) {
          b.profil.forEach(p => {
            if (p && p.trim()) profils.add(p);
          });
        }
      });
      setUniqueProfils([...profils].sort());
    } catch (err) {
      console.error(err);
    }
  }

  async function refreshBoissonData() {
    await Promise.all([loadBoissonData(), loadInventaire(), loadAllBoissons()]);
  }

  useEffect(() => {
    loadBoissonData();
    loadInventaire();
    loadAllBoissons();
  }, [id, adminId]);

  async function handleCommander() {
    if (!adminId) {
      setError("Vous devez être connecté pour commander");
      return;
    }

    console.log("Admin ID:", adminId);
    console.log("Boisson ID:", id);

    setCommandLoading(true);
    setCommandSuccess(null);
    setError(null);

    try {
      const { error } = await supabase.from("commandes").insert({
        boisson_id: id,
        degustateur_secret_token: adminId,
        statut: "Commandé",
        date_commande: toLocalTimestamp(),
      });

      if (error) throw error;

      setCommandSuccess("Commande envoyée !");
      setTimeout(() => setCommandSuccess(null), 4000);

    } catch (err) {
      console.error("Erreur:", err);
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    } finally {
      setCommandLoading(false);
    }
  }

  async function handleSave() {
    setError(null);
    setLoading(true);

    // Validation
    if (!nom || !nom.trim()) {
      setError('Le champ "Nom" est requis.');
      setLoading(false);
      return;
    }

    try {
      if (id === "new") {
        const { error } = await supabase.from("boissons").insert([
          { nom, categorie, commentaire, lien_recette: lienRecette, recette: nomSiteRecette, profil, actif }
        ]).select().maybeSingle();
        if (error) throw error;
        // Return to previous page after creation
        navigate(-1);
      } else {
        const { data, error } = await supabase
          .from("boissons")
          .update({ nom, categorie, commentaire, lien_recette: lienRecette, recette: nomSiteRecette, profil, actif })
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          // Rafraîchit l'état local pour refléter la valeur DB
          setNom(data.nom || "");
          setCategorie(data.categorie || "");
          setCommentaire(data.commentaire || "");
          setLienRecette(data.lien_recette || "");
          setNomSiteRecette(data.recette || "");
          setProfil(data.profil || []);
          setActif(data.actif ?? true);
          
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
      setUploadError("Renseigne d'abord le nom de la boisson");
      return;
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    // Utiliser la convention PascalCase
    const pascalName = toPascalCase(nom.trim());
    const fileName = `${pascalName}.${ext}`;

    try {
      setUploadLoading(true);
      const { error: upErr } = await supabase.storage
        .from("boissons")
        .upload(fileName, file, { upsert: true, contentType: file.type || `image/${ext}` });

      if (upErr) throw upErr;

      // Pas besoin de sauvegarder l'URL en base - le système automatique la trouvera
      alert(`Image uploadée avec succès : ${fileName}`);
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "Erreur lors de l'upload");
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette boisson ?")) return;
    try {
      const { error } = await supabase.from("boissons").delete().eq("id", id);
      if (error) throw error;
      navigate("/admin/boissons");
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur suppression");
    }
  }

  // Gestion des ingrédients
  async function addIngredient() {
    if (!newIngredient.ingredient_id) {
      alert("Sélectionne un ingrédient");
      return;
    }
    if (id === "new") {
      alert("Enregistre d'abord la boisson avant d'ajouter des ingrédients");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("boissons_ingredients")
        .insert([{ boisson_id: id, ingredient_id: newIngredient.ingredient_id, quantite: newIngredient.quantite, unite: newIngredient.unite, alternatives: newIngredient.alternatives ? [newIngredient.alternatives] : [] }])
        .select()
        .maybeSingle();
      if (error) throw error;
      setIngredients([...ingredients, { ...data, alternatives: normalizeAlternatives(data.alternatives)[0] || "" }]);
      setNewIngredient({ ingredient_id: "", quantite: "", unite: "", alternatives: "" });
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout : " + err.message);
    }
  }

  async function updateIngredient(ingId) {
    if (!editingIngredient) return;
    if (!editingIngredient.ingredient_id) {
      alert("Sélectionne un ingrédient");
      return;
    }
    try {
      const { error } = await supabase
        .from("boissons_ingredients")
        .update({ 
          ingredient_id: editingIngredient.ingredient_id,
          quantite: editingIngredient.quantite, 
          unite: editingIngredient.unite,
          alternatives: editingIngredient.alternatives ? [editingIngredient.alternatives] : []
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
      const { error } = await supabase.from("boissons_ingredients").delete().eq("id", ingId);
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
      alert("Enregistre d'abord la boisson avant d'ajouter des étapes");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("boissons_preparation")
        .insert([{ boisson_id: id, ...newPreparation }])
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
        .from("boissons_preparation")
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
      const { error } = await supabase.from("boissons_preparation").delete().eq("id", prepId);
      if (error) throw error;
      setPreparations(preparations.filter(p => p.id !== prepId));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression : " + err.message);
    }
  }

  async function addVariante() {
    if (!selectedVariante || !id) return;
    try {
      const { error } = await supabase
        .from("boissons_variantes")
        .insert([{ boisson_id: id, variante_id: selectedVariante }]);
      if (error) throw error;

      // Recharger les variantes
      const { data: varData } = await supabase
        .from("boissons_variantes")
        .select(`
          id,
          variante:variante_id(
            id,
            nom,
            categorie
          )
        `)
        .eq("boisson_id", id);
      setVariantes(varData || []);
      setSelectedVariante("");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout : " + err.message);
    }
  }

  async function removeVariante(varianteId) {
    if (!confirm("Supprimer cette variante ?")) return;
    try {
      const { error } = await supabase.from("boissons_variantes").delete().eq("id", varianteId);
      if (error) throw error;
      setVariantes(variantes.filter(v => v.id !== varianteId));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression : " + err.message);
    }
  }

  const normalizeAlternatives = (alternatives) => {
    if (Array.isArray(alternatives)) {
      return alternatives.map((value) => String(value).trim()).filter(Boolean);
    }
    if (alternatives && typeof alternatives === "object") {
      if (Array.isArray(alternatives.ids)) {
        return alternatives.ids.map((value) => String(value).trim()).filter(Boolean);
      }
      return [];
    }
    return [];
  };

  function getIngredientName(ingredientId) {
    const inv = inventaire.find(i => i.id === ingredientId);
    return inv ? inv.nom : `ID: ${ingredientId}`;
  }

  function getAlternativeNames(alternatives) {
    const ids = normalizeAlternatives(alternatives);
    if (ids.length > 0) {
      return ids
        .map((altId) => {
          const inv = inventaire.find((i) => i.id === altId);
          return inv ? inv.nom : `ID: ${altId}`;
        })
        .filter(Boolean);
    }
    if (alternatives && typeof alternatives === "object" && typeof alternatives.raw === "string") {
      return [alternatives.raw];
    }
    return [];
  }

  function renderIngredientTypeIcon(type) {
    const normalizedType = String(type || "").toLowerCase();
    if (normalizedType === "facultatif") {
      return <Flower size={16} color="#2f855a" style={{ display: 'inline-flex' }} />;
    }
    if (normalizedType === "obligatoire") {
      return <AlertTriangle size={16} color="#d53f25" style={{ display: 'inline-flex' }} />;
    }
    return null;
  }

  function getCommandeImageUrl(commande, dateCreated) {
    if (!commande.boisson_nom || !commande.guest_pseudo || !dateCreated) return null;
    
    const dateStr = toLocalDateYYYYMMDD(dateCreated);
    if (!dateStr) return null;
    
    const toPascalCaseLocal = (text) => {
      const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    };
    
    const fileName = `${dateStr}_${toPascalCaseLocal(commande.guest_pseudo)}_${toPascalCaseLocal(commande.boisson_nom)}.jpg`;
    
    const { data } = supabase.storage
      .from('boissons')
      .getPublicUrl(`boissons_commandes/${fileName}`);
    
    return data?.publicUrl;
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
            fill="var(--secondary-500)"
            color="var(--secondary-500)"
          />
        );
      } else if (i === Math.ceil(note) && note % 1 !== 0) {
        // Demi-étoile
        stars.push(
          <StarHalf
            key={i}
            size={16}
            fill="var(--secondary-500)"
            color="var(--secondary-500)"
          />
        );
      } else {
        // Étoile vide
        stars.push(
          <Star
            key={i}
            size={16}
            fill="none"
            color="var(--border-color)"
          />
        );
      }
    }
    return <div style={{ display: 'flex', gap: 2 }}>{stars}</div>;
  }

  const pageTitle = id === "new" ? "Nouvelle boisson" : nom || "Détail boisson";

  return (
    <>
      {showBobiSuccess && (
        <BobiAnimation 
          type="success" 
          message="Boisson mise à jour avec succès !" 
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
            <h1 style={{ margin: 0 }}>{id === "new" ? "Ajouter une boisson" : nom || "Boisson"}</h1>
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

      {commandSuccess && (
        <div style={{
          marginBottom: 16,
          padding: "12px 14px",
          backgroundColor: "#e8f5e9",
          color: "#2e7d32",
          borderRadius: 8,
          fontWeight: 'var(--font-weight-semibold)'
        }}>
          {commandSuccess}
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
      {error && <p style={{ color: "red" }}>{error}</p>}

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
                <label style={{ display: "block", fontWeight: 'var(--font-weight-bold)', marginBottom: 5, color: "#666", fontSize: 'var(--font-size-base)' }}>Profils / Saveurs</label>
                
                {/* Afficher les profils actuels */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 10 }}>
                  {profil && profil.length > 0 ? (
                    profil.map((item, idx) => (
                      item && (
                        <span 
                          key={idx} 
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
                            onClick={() => setProfil(profil.filter((_, i) => i !== idx))}
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
                    <span style={{ fontStyle: 'italic', color: '#999', fontSize: 'var(--font-size-base)' }}>Aucun profil</span>
                  )}
                </div>

                {/* Ajouter un profil */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {newProfil ? (
                    <>
                      <input
                        type="text"
                        value={newProfil}
                        onChange={(e) => setNewProfil(e.target.value)}
                        placeholder="Nouveau profil"
                        style={{ flex: 1, padding: 8, fontSize: 'var(--font-size-base)', borderRadius: 5, border: "1px solid #ddd" }}
                      />
                      <button
                        onClick={() => {
                          if (newProfil.trim()) {
                            setProfil([...profil, newProfil.trim()]);
                            setNewProfil("");
                          }
                        }}
                        style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 5, cursor: "pointer" }}
                      >
                        Ajouter
                      </button>
                      <button
                        onClick={() => setNewProfil("")}
                        style={{ padding: "8px 16px", backgroundColor: "#f0f0f0", border: "none", borderRadius: 5, cursor: "pointer" }}
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <select
                        value={selectedProfil}
                        onChange={(e) => {
                          if (e.target.value === "__new__") {
                            setNewProfil(" ");
                          } else if (e.target.value && !profil.includes(e.target.value)) {
                            setProfil([...profil, e.target.value]);
                            setSelectedProfil("");
                          }
                        }}
                        style={{ flex: 1, padding: 8, fontSize: 'var(--font-size-base)', borderRadius: 5, border: "1px solid #ddd" }}
                      >
                        <option value="">-- Ajouter un profil --</option>
                        {uniqueProfils.map(p => (
                          <option key={p} value={p} disabled={profil.includes(p)}>{p}</option>
                        ))}
                        <option value="__new__">+ Nouveau profil</option>
                      </select>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Boutons flottants en mode édition */}
            {isEditing && (
              <div className="floating-action-buttons">
                {id !== "new" && (
                  <button 
                    onClick={() => setShowImportModal(true)} 
                    className="floating-import-button"
                    title="Importer depuis URL"
                  >
                    <Download size={20} />
                  </button>
                )}
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
          {/* Pastilles de profil */}
          {!isEditing && profil && profil.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 12 }}>
              {profil.map((item, idx) => (
                item && (
                  <span 
                    key={idx} 
                    style={{
                      padding: '4px 12px',
                      background: '#fff3e0',
                      color: '#e65100',
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
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Qté"
                          value={editingIngredient.quantite}
                          onChange={(e) => setEditingIngredient({ ...editingIngredient, quantite: e.target.value })}
                          style={{ width: 80, padding: 6, boxSizing: "border-box" }}
                        />
                        <input
                          placeholder="Unité"
                          value={editingIngredient.unite}
                          onChange={(e) => setEditingIngredient({ ...editingIngredient, unite: e.target.value })}
                          style={{ width: 80, padding: 6, boxSizing: "border-box" }}
                        />
                        <select
                          value={editingIngredient.ingredient_id}
                          onChange={(e) => setEditingIngredient({ ...editingIngredient, ingredient_id: e.target.value })}
                          style={{ flex: 1, minWidth: 120, padding: 6, boxSizing: "border-box" }}
                        >
                          {inventaire.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.nom} {inv.categorie ? `(${inv.categorie})` : ""}</option>
                          ))}
                        </select>
                        <select
                          value={editingIngredient.alternatives}
                          onChange={(e) => setEditingIngredient({ ...editingIngredient, alternatives: e.target.value })}
                          style={{ flex: 1, minWidth: 120, padding: 6, boxSizing: "border-box" }}
                        >
                          <option value="">-- Sélectionner --</option>
                          {inventaire.map((inv) => (
                            <option key={inv.id} value={inv.id}>{inv.nom} {inv.categorie ? `(${inv.categorie})` : ""}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <span style={{ flex: 1 }}>
                          {ing.quantite && `${ing.quantite} `}
                          {ing.unite && `${ing.unite} `}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {renderIngredientTypeIcon(ing.type)}
                            {getIngredientName(ing.ingredient_id)}
                          </span>
                          {ing.alternatives && (
                            <span style={{ display: "block", fontSize: "0.9rem", color: "#777", marginTop: 2, fontStyle: "italic" }}>
                              Alternatives : {getAlternativeNames([ing.alternatives]).join(", ")}
                            </span>
                          )}
                        </span>
                        {isEditing && (
                          <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={() => setEditingIngredient({ ...ing, alternatives: normalizeAlternatives(ing.alternatives)[0] || "" })} style={{ padding: "4px 8px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Éditer">
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
                <div style={{ flex: 1, minWidth: 240 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 'var(--font-size-base)' }}>Alternatives</label>
                  <select
                    value={newIngredient.alternatives}
                    onChange={(e) => setNewIngredient({ ...newIngredient, alternatives: e.target.value })}
                    style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
                  >
                    <option value="">-- Sélectionner --</option>
                    {inventaire.map((inv) => (
                      <option key={inv.id} value={inv.id}>{inv.nom} {inv.categorie ? `(${inv.categorie})` : ""}</option>
                    ))}
                  </select>
                </div>
                <button onClick={addIngredient} style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
                  +
                </button>
              </div>
            </div>
          )}

          {/* Boutons flottants pour édition d'ingrédient */}
          {editingIngredient && (
            <div style={{ display: "flex", gap: 12, position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}>
              <button
                onClick={() => setEditingIngredient(null)}
                className="floating-cancel-button"
                title="Annuler"
              >
                <X size={24} />
              </button>
              <button
                onClick={() => updateIngredient(editingIngredient.id)}
                className="floating-save-button"
                title="Sauvegarder"
              >
                <Check size={24} />
              </button>
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
                    placeholder="Ex: Verser le rhum dans le verre"
                    style={{ width: "100%", padding: 8 }}
                  />
                </div>
                <button onClick={addPreparation} style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
                  +
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
                  placeholder="Ex: IBA World, SAQ, Difford's Guide..." 
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

      {/* Section Variantes */}
      {id !== "new" && (
        <div style={{ marginTop: 40, maxWidth: 800 }}>
          <h2>Variantes</h2>
          
          {variantes.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#888" }}>Aucune variante définie.</p>
          ) : (
            <ul style={{ marginBottom: 16, paddingLeft: 0, listStyleType: "none" }}>
              {variantes.map((v) => (
                <li key={v.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <a 
                      href={`/admin/boissons/${v.variante?.id}`}
                      style={{ 
                        color: v.variante?.actif ? "var(--secondary-500)" : "var(--text-tertiary)", 
                        textDecoration: "none",
                        fontStyle: v.variante?.actif ? "normal" : "italic"
                      }}
                      onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                      onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                    >
                      {v.variante?.nom}
                      {v.variante?.categorie && <span style={{ color: "var(--text-secondary)", fontSize: 'var(--font-size-base)' }}> ({v.variante.categorie})</span>}
                    </a>
                    {isEditing && (
                      <button onClick={() => removeVariante(v.id)} style={{ padding: "4px 8px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: 4, cursor: "pointer", flexShrink: 0, marginLeft: 8, display: "flex", alignItems: "center", justifyContent: "center" }} title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {isEditing && (
            <div style={{ padding: 15, backgroundColor: "#f9f9f9", borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>Ajouter une variante</h3>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 'var(--font-size-base)' }}>Boisson variante</label>
                  <select
                    value={selectedVariante}
                    onChange={(e) => setSelectedVariante(e.target.value)}
                    style={{ width: "100%", padding: 8 }}
                  >
                    <option value="">-- Sélectionner --</option>
                    {allBoissons
                      .filter(b => b.id !== id && !variantes.some(v => v.variante?.id === b.id))
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          {b.nom} {b.categorie ? `(${b.categorie})` : ""}
                        </option>
                      ))}
                  </select>
                </div>
                <button onClick={addVariante} style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section Commandes */}
      {id !== "new" && commandes.length > 0 && (
        <div style={{ marginTop: 40, maxWidth: 800 }}>
          <h2>Commandes ({commandes.length})</h2>
          
          <div style={{ display: "grid", gap: 16 }}>
                        {commandes.map((c) => {
              const imageUrl = getCommandeImageUrl(c, c.date_commande);
              const date = c.date_commande ? new Date(c.date_commande).toLocaleDateString('fr-FR') : '-';
              const isExpanded = expandedCommande === c.id;
              
              return (
                <div 
                  key={c.id} 
                  onClick={() => setExpandedCommande(isExpanded ? null : c.id)}
                  className="order-card order-card-stack order-card-interactive"
                >
                  <div className="order-card-main">
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
                        <Wine size={32} color="var(--text-on-light-secondary)" />
                      </div>
                    </div>

                    <div className="order-card-details">
                      <div className="order-card-title" style={{ fontSize: "var(--font-size-lg)" }}>
                        {c.guest_pseudo}
                      </div>
                      <div className="order-card-meta">
                        {date}{" \u2022 "}{c.statut}
                      </div>
                      <div className="order-card-rating">
                        {renderStars(c.note)}
                      </div>
                    </div>
                  </div>

                  {isExpanded && c.commentaire && (
                    <div className="order-card-comment">
                      <div className="order-card-comment-label">Commentaire:</div>
                      <div className="order-card-comment-text">{c.commentaire}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bouton Commander Flottant - masqué en mode édition */}
      {!isEditing && (
        <button
          onClick={handleCommander}
          disabled={commandLoading}
          className="floating-command-button"
          title="Commander"
        >
          <ShoppingCart size={24} />
        </button>
      )}

      {/* Messages de succès et erreur */}
      {commandSuccess && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            backgroundColor: "#28a745",
            color: "white",
            padding: "16px 20px",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 101,
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)',
            animation: "fadeIn 0.3s ease"
          }}
        >
          {commandSuccess}
        </div>
      )}

      <RecipeImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        entityType="boisson"
        entityId={id}
        inventory={inventaire}
        onImported={async () => {
          await refreshBoissonData();
          setShowBobiSuccess(true);
          setTimeout(() => setShowBobiSuccess(false), 2000);
        }}
      />
    </div>
    </>
  );
}









