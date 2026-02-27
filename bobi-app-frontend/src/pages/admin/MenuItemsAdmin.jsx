import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import Header from "../../components/Header";
import BobiAnimation from "../../components/BobiAnimation";
import { Plus } from 'lucide-react';

export default function MenuItemsAdmin() {
  const { id: menuId } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [items, setItems] = useState([]);
  const [boissons, setBoissons] = useState([]);
  const [nourritures, setNourritures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ type: "boisson", refId: "", quantite: 1, commentaire: "" });

  const refOptions = useMemo(() => {
    return form.type === "boisson" ? boissons : nourritures;
  }, [form.type, boissons, nourritures]);

  useEffect(() => {
    load();
  }, [menuId]);

  async function load() {
    if (!menuId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: m, error: mErr } = await supabase
        .from("menus")
        .select("id, nom, date_debut, date_fin, actif")
        .eq("id", menuId)
        .maybeSingle();
      if (mErr) throw mErr;
      setMenu(m);

      const { data: mi, error: miErr } = await supabase
        .from("menus_items")
        .select("id, menu_id, boisson_id, nourriture_id, quantite, commentaire")
        .eq("menu_id", menuId)
        .order("created_at", { ascending: false });
      if (miErr) throw miErr;

      const boissonIds = Array.from(new Set((mi || []).map(x => x.boisson_id).filter(Boolean)));
      const nourritureIds = Array.from(new Set((mi || []).map(x => x.nourriture_id).filter(Boolean)));

      let boissonMap = {}, nourritureMap = {};
      if (boissonIds.length) {
        const { data: b } = await supabase.from("boissons").select("id, nom").in("id", boissonIds);
        b?.forEach(x => boissonMap[x.id] = x.nom);
      }
      if (nourritureIds.length) {
        const { data: n } = await supabase.from("nourritures").select("id, nom").in("id", nourritureIds);
        n?.forEach(x => nourritureMap[x.id] = x.nom);
      }

      const enriched = (mi || []).map(x => ({
        ...x,
        ref_type: x.boisson_id ? "boisson" : "nourriture",
        ref_nom: x.boisson_id ? (boissonMap[x.boisson_id] || x.boisson_id) : (nourritureMap[x.nourriture_id] || x.nourriture_id),
      }));
      setItems(enriched);

      // options pour ajout
      const { data: allB } = await supabase.from("boissons").select("id, nom").order("nom");
      const { data: allN } = await supabase.from("nourritures").select("id, nom").order("nom");
      setBoissons(allB || []);
      setNourritures(allN || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  async function addItem(e) {
    e.preventDefault();
    if (!form.refId || !form.quantite) return;
    try {
      const payload = {
        menu_id: menuId,
        quantite: Number(form.quantite) || 1,
        commentaire: form.commentaire || null,
        boisson_id: form.type === "boisson" ? form.refId : null,
        nourriture_id: form.type === "nourriture" ? form.refId : null,
      };
      const { error } = await supabase.from("menus_items").insert([payload]);
      if (error) throw error;
      setForm({ type: form.type, refId: "", quantite: 1, commentaire: "" });
      load();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout de l'item");
    }
  }

  async function removeItem(id) {
    if (!confirm("Supprimer cet item ?")) return;
    try {
      const { error } = await supabase.from("menus_items").delete().eq("id", id);
      if (error) throw error;
      setItems(x => x.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  }
  if (loading) return <BobiAnimation type="loading" message="Bobi vérifie les stocks..." duration={0} />;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!menu) return <p>Menu introuvable.</p>;

  return (
    <>
      <Header title={`Items: ${menu.nom}`} showBackButton={true} />
      <div style={{ padding: 16 }}>

      <form onSubmit={addItem} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="boisson">Boisson</option>
          <option value="nourriture">Nourriture</option>
        </select>

        <select value={form.refId} onChange={e => setForm(f => ({ ...f, refId: e.target.value }))} style={{ minWidth: 220 }}>
          <option value="">-- Choisir --</option>
          {refOptions.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.nom}</option>
          ))}
        </select>

        <input type="number" min={1} value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} style={{ width: 90 }} />
        <input placeholder="Commentaire" value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))} style={{ minWidth: 240 }} />
        <button type="submit" style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Plus size={18} />
        </button>
      </form>

      {items.length === 0 ? (
        <p>Aucun item dans ce menu.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Nom</th>
              <th style={{ textAlign: 'center', borderBottom: '1px solid #ddd' }}>Quantité</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Commentaire</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{i.ref_type}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{i.ref_nom}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', textAlign: 'center' }}>{i.quantite}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{i.commentaire || '-'}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  <button onClick={() => removeItem(i.id)} style={{ padding: "4px 8px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </>
  );
}
