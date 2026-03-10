import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import { ArrowLeft, Calendar, CheckCircle, XCircle, Wine, Utensils, Plus, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { getBoissonImageUrl, getNourritureImageUrl } from '../../services/imageService';

export default function MenuDetailAdmin() {
  const { id } = useParams();
  const [menu, setMenu] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBobiSuccess, setShowBobiSuccess] = useState(false);

  // Pour ajouter des items
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState('boisson'); // 'boisson' ou 'nourriture'
  const [availableBoissons, setAvailableBoissons] = useState([]);
  const [availableNourritures, setAvailableNourritures] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantite, setQuantite] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Charger le menu
      const { data: menuData, error: menuErr } = await supabase
        .from("menus")
        .select("id, nom, description, date_debut, date_fin, actif")
        .eq("id", id)
        .single();

      if (menuErr) throw menuErr;
      setMenu(menuData);

      // Charger les items du menu
      const { data: itemsData, error: itemsErr } = await supabase
        .from("menus_items")
        .select(`
          id,
          quantite,
          boisson:boisson_id (id, nom, categorie),
          nourriture:nourriture_id (id, nom, categorie)
        `)
        .eq("menu_id", id);

      if (itemsErr) throw itemsErr;

      const formattedItems = (itemsData || []).map(item => ({
        ...item,
        type: item.boisson ? 'boisson' : 'nourriture',
        nom: item.boisson?.nom || item.nourriture?.nom,
        categorie: item.boisson?.categorie || item.nourriture?.categorie,
        itemId: item.boisson?.id || item.nourriture?.id
      }));

      setItems(formattedItems);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAvailableItems = useCallback(async () => {
    try {
      // Charger toutes les boissons
      const { data: boissons, error: bErr } = await supabase
        .from("boissons")
        .select("id, nom, categorie")
        .eq("actif", true)
        .order("nom");

      if (bErr) throw bErr;
      setAvailableBoissons(boissons || []);

      // Charger toutes les nourritures
      const { data: nourritures, error: nErr } = await supabase
        .from("nourritures")
        .select("id, nom, categorie")
        .order("nom");

      if (nErr) throw nErr;
      setAvailableNourritures(nourritures || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    load();
    loadAvailableItems();
  }, [load, loadAvailableItems]);

  async function handleAddItem() {
    if (!selectedItemId || !quantite) {
      alert("Sélectionne un item et une quantité");
      return;
    }

    try {
      const payload = {
        menu_id: id,
        quantite: parseInt(quantite),
        [addType === 'boisson' ? 'boisson_id' : 'nourriture_id']: selectedItemId
      };

      const { error } = await supabase
        .from("menus_items")
        .insert([payload]);

      if (error) throw error;

      setShowAddForm(false);
      setSelectedItemId('');
      setQuantite(1);
      
      // Afficher l'animation Bobi
      setShowBobiSuccess(true);
      setTimeout(() => setShowBobiSuccess(false), 4000);
      
      load();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout: " + err.message);
    }
  }

  async function handleDeleteItem(itemId) {
    if (!confirm("Retirer cet item du menu ?")) return;

    try {
      const { error } = await supabase
        .from("menus_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      setItems(items.filter(i => i.id !== itemId));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  }

  function getImageUrl(item) {
    if (item.type === 'boisson') {
      // Essayer JPG puis PNG
      return getBoissonImageUrl(item.nom);
    } else {
      return getNourritureImageUrl(item.nom);
    }
  }

  if (loading) return <BobiAnimation type="loading" message="Bobi vérifie les stocks..." duration={0} />;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;
  if (!menu) return <p style={{ padding: 20 }}>Menu introuvable</p>;

  const boissons = items.filter(i => i.type === 'boisson');
  const nourritures = items.filter(i => i.type === 'nourriture');

  return (
    <>
      {showBobiSuccess && (
        <BobiAnimation 
          type="success" 
          message="Item ajouté au menu avec succès !" 
          duration={4000}
          onComplete={() => setShowBobiSuccess(false)}
        />
      )}
      <Header title={menu.nom || "Détail menu"} showBackButton={true} />
      <div style={{ paddingBottom: 80, maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
        {/* Badge Actif */}
        <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 12,
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              backgroundColor: menu.actif ? "var(--secondary-100)" : "var(--bg-secondary)",
              color: menu.actif ? "var(--secondary-700)" : "var(--text-secondary)",
              marginBottom: 8
            }}
          >
            {menu.actif ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
            {menu.actif ? "Actif" : "Inactif"}
          </div>
        </div>

        <div style={{ padding: "16px" }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "var(--font-size-2xl)", fontWeight: 'var(--font-weight-semibold)' }}>
          {menu.nom}
        </h1>

        {menu.description && (
          <p style={{ margin: "0 0 12px 0", fontSize: 'var(--font-size-lg)', color: "var(--text-secondary)" }}>
            {menu.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 'var(--font-size-base)', color: "var(--text-secondary)" }}>
          <Calendar size={16} />
          <span>{menu.date_debut} → {menu.date_fin}</span>
        </div>
      </div>

      {/* Bouton flottant pour ajouter des items */}
      <button
        onClick={() => setShowAddForm(true)}
        className="floating-button"
        title="Ajouter un item"
      >
        <Plus size={24} />
      </button>

      {/* Liste des boissons */}
      {boissons.length > 0 && (
        <div style={{ padding: "16px" }}>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 12, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
            <Wine size={20} color="var(--text-secondary)" />
            Boissons ({boissons.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {boissons.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: 8,
                  padding: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  display: "flex",
                  gap: 12,
                  alignItems: "center"
                }}
              >
                {/* Image */}
                <img
                  src={getImageUrl(item)}
                  alt={item.nom}
                  style={{
                    width: 60,
                    height: 60,
                    objectFit: "cover",
                    borderRadius: 6,
                    flexShrink: 0
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                    {item.nom}
                  </div>
                  {item.categorie && (
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {item.categorie}
                    </div>
                  )}
                </div>

                {/* Bouton supprimer */}
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  style={{
                    width: 28,
                    height: 28,
                    padding: 0,
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                  title="Retirer"
                >
                  <Trash2 size={18} color="#6b7280" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des nourritures */}
      {nourritures.length > 0 && (
        <div style={{ padding: "16px" }}>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 12, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
            <Utensils size={20} color="var(--text-secondary)" />
            Nourritures ({nourritures.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {nourritures.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: 8,
                  padding: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  display: "flex",
                  gap: 12,
                  alignItems: "center"
                }}
              >
                {/* Image */}
                <img
                  src={getImageUrl(item)}
                  alt={item.nom}
                  style={{
                    width: 60,
                    height: 60,
                    objectFit: "cover",
                    borderRadius: 6,
                    flexShrink: 0
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                    {item.nom}
                  </div>
                  {item.categorie && (
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {item.categorie}
                    </div>
                  )}
                </div>

                {/* Bouton supprimer */}
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  style={{
                    width: 28,
                    height: 28,
                    padding: 0,
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                  title="Retirer"
                >
                  <Trash2 size={18} color="#6b7280" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: 40, padding: "0 16px" }}>
          Aucun item dans ce menu. Clique sur + pour en ajouter.
        </p>
      )}

      {/* Modal d'ajout d'item */}
      {showAddForm && (
        <>
          <div
            onClick={() => setShowAddForm(false)}
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
            maxWidth: 400
          }}>
            <h2 style={{ marginTop: 0, marginBottom: 20 }}>Ajouter un item</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setAddType('boisson'); setSelectedItemId(''); }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    backgroundColor: addType === 'boisson' ? "var(--primary-600)" : "var(--bg-secondary)",
                    color: addType === 'boisson' ? "white" : "var(--text-primary)",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 'var(--font-size-base)'
                  }}
                >
                  Boisson
                </button>
                <button
                  onClick={() => { setAddType('nourriture'); setSelectedItemId(''); }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    backgroundColor: addType === 'nourriture' ? "var(--primary-600)" : "var(--bg-secondary)",
                    color: addType === 'nourriture' ? "white" : "var(--text-primary)",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 'var(--font-size-base)'
                  }}
                >
                  Nourriture
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
                {addType === 'boisson' ? 'Boisson' : 'Nourriture'}
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 'var(--font-size-lg)'
                }}
              >
                <option value="">-- Sélectionner --</option>
                {(addType === 'boisson' ? availableBoissons : availableNourritures).map(item => (
                  <option key={item.id} value={item.id}>
                    {item.nom} {item.categorie ? `(${item.categorie})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Quantité</label>
              <input
                type="number"
                min="1"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 'var(--font-size-lg)'
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--bg-secondary)",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 15
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleAddItem}
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
                Ajouter
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </>
  );
}
