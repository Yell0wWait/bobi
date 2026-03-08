import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { useBoissonImage } from "../../hooks/useImage";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import { ShoppingCart, Star, StarHalf, Wine, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function BoissonDetailInvite() {
  const { id } = useParams();
  const [boisson, setBoisson] = useState(null);
  const imageUrl = useBoissonImage(boisson?.nom);
  const [commandes, setCommandes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [commandLoading, setCommandLoading] = useState(false);
  const [showBobiSuccess, setShowBobiSuccess] = useState(false);

  const guestData = JSON.parse(localStorage.getItem("bobi_guest") || "null");
  const adminData = JSON.parse(localStorage.getItem("bobi_admin") || "null");
  const secretToken = guestData?.secret_token || adminData?.id || null;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: b, error: be } = await supabase
          .from("boissons")
          .select("id, nom, categorie, commentaire, profil, actif, lien_recette, recette")
          .eq("id", id)
          .maybeSingle();

        if (be) throw be;
        if (!b) {
          setError("Boisson introuvable");
          return;
        }
        setBoisson(b);

        // Charger les ingrédients
        const { data: ingData, error: ingErr } = await supabase
          .from("boissons_ingredients")
          .select(`
            id,
            ingredient_id,
            quantite,
            unite,
            inventaire:ingredient_id(id, nom, categorie)
          `)
          .eq("boisson_id", id)
          .order("id", { ascending: true });
        if (ingErr) throw ingErr;
        setIngredients(ingData || []);

        // Charger les variantes
        const { data: varData, error: varErr } = await supabase
          .from("boissons_variantes")
          .select(`
            id,
            variante:variante_id(
              id,
              nom,
              categorie,
              actif
            )
          `)
          .eq("boisson_id", id);
        if (varErr) throw varErr;
        setVariantes(varData || []);

        // Charger les commandes si guest
        if (secretToken) {
          const { data: cmdData, error: cmdErr } = await supabase
            .from("commandes")
            .select("id, boisson_id, degustateur_secret_token, note, commentaire, statut, date_commande")
            .eq("boisson_id", id)
            .eq("degustateur_secret_token", secretToken)
            .order("date_commande", { ascending: false });
          if (cmdErr) throw cmdErr;
          setCommandes(cmdData || []);
        }
      } catch (err) {
        console.error("Erreur lors du chargement:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, secretToken]);

  const renderStars = (note) => {
    if (note === null || note === undefined) return null;
    const fullStars = Math.floor(note);
    const hasHalf = note % 1 !== 0;
    const emptyStars = hasHalf ? Math.floor(5 - note) : 5 - fullStars;

    return (
      <div style={{ display: "flex", gap: 4 }}>
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} size={16} fill="var(--secondary-500)" color="var(--secondary-500)" />
        ))}
        {hasHalf && <StarHalf key="half" size={16} fill="var(--secondary-500)" color="var(--secondary-500)" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} size={16} color="var(--border-color)" />
        ))}
      </div>
    );
  };

  const handleCommander = async () => {
    if (!secretToken) return;
    setCommandLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const { error } = await supabase.from("commandes").insert({
        boisson_id: id,
        degustateur_secret_token: secretToken,
        statut: "Commandé",
      });

      if (error) throw error;

      setShowBobiSuccess(true);
      setSuccess("✓ Commande envoyée !");
      setTimeout(() => {
        setSuccess(null);
        setShowBobiSuccess(false);
      }, 4000);

      // Recharger les commandes
      const { data: updatedCommandes } = await supabase
        .from("commandes")
        .select("id, boisson_id, degustateur_secret_token, note, commentaire, statut, date_commande")
        .eq("boisson_id", id)
        .eq("degustateur_secret_token", secretToken)
        .order("date_commande", { ascending: false });
      setCommandes(updatedCommandes || []);
    } catch (err) {
      console.error("Erreur:", err);
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    } finally {
      setCommandLoading(false);
    }
  };

  if (loading) return <BobiAnimation type="loading" message="Bobi vérifie les stocks..." duration={0} />;
  if (!boisson) return <p style={{ padding: 16 }}>Boisson introuvable.</p>;

  return (
    <>
      {showBobiSuccess && (
        <BobiAnimation 
          type="success" 
          message="Excellent choix ! Bobi prépare votre cocktail..." 
          duration={4000}
          onComplete={() => setShowBobiSuccess(false)}
        />
      )}
      <Header title={boisson.nom} showBackButton={true} />
      <div style={{ padding: 16, paddingBottom: 100 }}>
        {error && <p style={{ color: "red", marginBottom: 16 }}>{error}</p>}
        {success && <p style={{ color: "green", marginBottom: 16 }}>{success}</p>}

        <div style={{ maxWidth: 800 }}>
          {/* Image centrée */}
          <div style={{ marginBottom: 30, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ maxWidth: 400, width: "100%" }}>
              {imageUrl ? (
                <img src={imageUrl} alt={boisson.nom} style={{ width: "100%", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
              ) : (
                <div style={{ width: "100%", height: 300, backgroundColor: "var(--bg-secondary)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
                  Aucune image
                </div>
              )}
            </div>
          </div>

          {/* Catégorie et statut */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 10 }}>
              {boisson.categorie && (
                <div style={{ fontSize: 'var(--font-size-lg)', padding: "6px 12px", backgroundColor: "var(--primary-100)", color: "var(--primary-700)", borderRadius: 5, display: "inline-block" }}>
                  {boisson.categorie}
                </div>
              )}
              <div style={{ fontSize: 'var(--font-size-base)', padding: "4px 10px", backgroundColor: boisson.actif ? "var(--primary-50)" : "var(--secondary-50)", color: boisson.actif ? "var(--success)" : "var(--error)", borderRadius: 5, fontWeight: 'var(--font-weight-medium)', display: "flex", alignItems: "center", justifyContent: "center" }}>
                {boisson.actif ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
              </div>
            </div>
          </div>

          {/* Pastilles de profil */}
          {boisson.profil && boisson.profil.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 20 }}>
              {boisson.profil.map((item, idx) => (
                item && (
                  <span 
                    key={idx} 
                    style={{
                      padding: '4px 12px',
                      background: 'var(--primary-50)',
                      color: 'var(--primary-700)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: 'var(--font-size-base)',
                      fontWeight: 'var(--font-weight-medium)'
                    }}
                  >
                    {item}
                  </span>
                )
              ))}
            </div>
          )}

          {/* Section Ingrédients */}
          {ingredients.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h2>Ingrédients</h2>
              <ul style={{ listStyle: "none", padding: 0, marginBottom: 20 }}>
                {ingredients.map(ing => (
                  <li key={ing.id} style={{ marginBottom: 8, padding: "6px 0" }}>
                    <span>
                      {ing.quantite && `${ing.quantite} `}
                      {ing.unite && `${ing.unite} `}
                      <strong>{ing.inventaire?.nom || 'Ingrédient'}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section Recette */}
          {boisson.lien_recette && boisson.recette && (
            <div style={{ marginTop: 40, marginBottom: 40 }}>
              <h2>Recette en ligne</h2>
              <a 
                href={boisson.lien_recette} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: "var(--secondary-500)", textDecoration: "none", fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)' }}
                onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                onMouseLeave={(e) => e.target.style.textDecoration = "none"}
              >
                {boisson.recette}
              </a>
            </div>
          )}

          {/* Section Variantes */}
          {variantes.length > 0 && (
            <div style={{ marginTop: 40, marginBottom: 40 }}>
              <h2>Variantes disponibles</h2>
              <ul style={{ marginBottom: 16, paddingLeft: 0, listStyleType: "none" }}>
                {variantes.map((v) => (
                  <li key={v.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <a 
                        href={`/invite/boisson/${v.variante?.id}`}
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
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section Commandes */}
          {secretToken && commandes.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h2>Vos commandes ({commandes.length})</h2>
              <div style={{ display: "grid", gap: 16 }}>
                {commandes.map((c) => {
                  const date = c.date_commande ? new Date(c.date_commande).toLocaleDateString('fr-FR') : '-';
                  
                  return (
                    <div 
                      key={c.id} 
                      style={{
                        display: "flex",
                        gap: 16,
                        padding: 16,
                        backgroundColor: "white",
                        borderRadius: 8,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        border: "1px solid var(--border-color)"
                      }}
                    >
                      {/* Détails */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--font-size-base)', color: "var(--text-on-light-secondary)", marginBottom: 8 }}>
                          {date} • {c.statut}
                        </div>
                        {c.note !== null && c.note !== undefined && (
                          <div style={{ marginBottom: 8 }}>
                            {renderStars(c.note)}
                          </div>
                        )}
                        {c.commentaire && (
                          <div style={{ fontSize: 'var(--font-size-base)', color: "var(--text-on-light-primary)" }}>
                            {c.commentaire}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bouton Commander Flottant */}
      {secretToken && (
        <button
          onClick={handleCommander}
          disabled={commandLoading}
          className="floating-command-button"
          style={{ bottom: 90 }}
          title="Commander cette boisson"
        >
          <ShoppingCart size={24} />
        </button>
      )}
    </>
  );
}


