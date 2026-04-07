import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { useBoissonImage } from "../../hooks/useImage";
import { toPascalCase } from "../../services/imageService";
import { toLocalDateYYYYMMDD, toLocalTimestamp } from "../../services/dateService";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import { ShoppingCart, Star, StarHalf, Wine, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function BoissonDetailInvite() {
  const { id } = useParams();
  const [boisson, setBoisson] = useState(null);
  const imageUrl = useBoissonImage(boisson?.nom);
  const [commandes, setCommandes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [expandedCommande, setExpandedCommande] = useState(null);
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
            alternatives,
            inventaire:ingredient_id(id, nom, categorie)
          `)
          .eq("boisson_id", id)
          .order("id", { ascending: true });
        if (ingErr) throw ingErr;
        setIngredients((ingData || []).map((ing) => ({
          ...ing,
          alternatives: normalizeAlternatives(ing.alternatives),
        })));

        // Charger l'inventaire pour résoudre les alternatives
        const { data: invData, error: invErr } = await supabase
          .from("inventaire")
          .select("id, nom")
          .order("nom", { ascending: true });
        if (invErr) throw invErr;
        setInventory(invData || []);

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

          let guestPseudo = guestData?.pseudo || adminData?.pseudo || null;
          const { data: guest } = await supabase
            .from("degustateur")
            .select("pseudo")
            .eq("secret_token", secretToken)
            .single();
          if (guest?.pseudo) guestPseudo = guest.pseudo;

          setCommandes((cmdData || []).map((c) => ({
            ...c,
            guest_pseudo: guestPseudo || c.degustateur_secret_token || "-",
          })));
        }
      } catch (err) {
        console.error("Erreur lors du chargement:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, secretToken, guestData?.pseudo, adminData?.pseudo]);

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

  function getCommandeImageUrl(commande, dateCreated) {
    if (!commande?.guest_pseudo || !boisson?.nom || !dateCreated) return null;

    const pseudo = commande.guest_pseudo;
    const dateStr = toLocalDateYYYYMMDD(dateCreated);
    if (!dateStr) return null;

    const fileName = `${dateStr}_${toPascalCase(pseudo)}_${toPascalCase(boisson.nom)}.jpg`;
    const { data } = supabase.storage
      .from("boissons")
      .getPublicUrl(`boissons_commandes/${fileName}`);

    return data?.publicUrl || null;
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

  const getAlternativeNames = (alternatives) => {
    const ids = normalizeAlternatives(alternatives);
    if (ids.length > 0) {
      return ids
        .map((altId) => {
          const inv = inventory.find((item) => item.id === altId);
          return inv ? inv.nom : `ID: ${altId}`;
        })
        .filter(Boolean);
    }
    if (alternatives && typeof alternatives === "object" && typeof alternatives.raw === "string") {
      return [alternatives.raw];
    }
    return [];
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
        date_commande: toLocalTimestamp(),
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
      const fallbackPseudo = commandes[0]?.guest_pseudo || guestData?.pseudo || adminData?.pseudo || null;
      setCommandes((updatedCommandes || []).map((c) => ({
        ...c,
        guest_pseudo: fallbackPseudo || c.degustateur_secret_token || "-",
      })));
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
                <div className="type-indicator type-indicator-standard">
                  {boisson.categorie}
                </div>
              )}
              <div
                className={`availability-indicator ${boisson.actif ? "availability-indicator-active" : "availability-indicator-inactive"}`}
                title={boisson.actif ? "Disponible" : "Indisponible"}
                aria-label={boisson.actif ? "Disponible" : "Indisponible"}
              >
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
                    {ing.alternatives && ing.alternatives.length > 0 && (
                      <div style={{ marginTop: 4, fontSize: 'inherit', color: 'inherit' }}>
                        <strong>Alternatives:</strong> {getAlternativeNames(ing.alternatives).join(', ')}
                      </div>
                    )}
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
                  const commandeImageUrl = getCommandeImageUrl(c, c.date_commande);
                  const isExpanded = expandedCommande === c.id;
                  
                  return (
                    <div 
                      key={c.id} 
                      onClick={() => setExpandedCommande(isExpanded ? null : c.id)}
                      className="order-card order-card-stack order-card-interactive"
                    >
                      <div className="order-card-main">
                        <div className="order-card-media">
                          {commandeImageUrl ? (
                            <img
                              src={commandeImageUrl}
                              alt={boisson.nom}
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextElementSibling.style.display = "flex";
                              }}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover"
                              }}
                            />
                          ) : null}
                          <div className="order-card-media-fallback" style={{ display: commandeImageUrl ? "none" : "flex" }}>
                            <Wine size={32} color="var(--primary-400)" />
                          </div>
                        </div>

                        <div className="order-card-details">
                          <div className="order-card-title">
                            {boisson.nom}
                          </div>
                          <div className="order-card-meta" style={{ marginBottom: 8 }}>
                            {date} • {c.statut}
                          </div>
                          {c.note !== null && c.note !== undefined && (
                            <div className="order-card-rating" style={{ marginBottom: 8 }}>
                              {renderStars(c.note)}
                            </div>
                          )}
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




