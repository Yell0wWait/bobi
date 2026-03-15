import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { toLocalTimestamp } from "../services/dateService";

export default function CommandeForm({ boissonId }) {
  const [degustateur, setDegustateur] = useState("");
  const [note, setNote] = useState("");
  const [commentaire, setCommentaire] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const { data, error } = await supabase
      .from("commandes")
      .insert([{
        boisson_id: boissonId,
        Degustateur: degustateur,
        Note: note,
        Commentaire: commentaire,
        Statut: "Commandé",
        date_commande: toLocalTimestamp()
      }]);
    
    if (error) console.log("Erreur:", error);
    else console.log("Commande passée:", data);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Nom" value={degustateur} onChange={e => setDegustateur(e.target.value)} required />
      <input type="number" placeholder="Note" value={note} onChange={e => setNote(e.target.value)} required min={1} max={5} />
      <textarea placeholder="Commentaire" value={commentaire} onChange={e => setCommentaire(e.target.value)} />
      <button type="submit">Commander</button>
    </form>
  );
}

