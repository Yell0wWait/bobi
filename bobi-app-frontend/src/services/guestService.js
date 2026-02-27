// src/services/guestService.js
import { supabase } from "./supabaseClient";

/**
 * Connexion ou création d'un invité
 * @param {string} pseudo
 * @returns {object} degustateur
 */
export async function loginGuest(pseudo) {
  if (!pseudo || pseudo.trim() === "") {
    throw new Error("Pseudo requis");
  }

  // 1. Vérifier si le pseudo existe déjà
  const { data: existingGuest, error: selectError } = await supabase
    .from("degustateur")
    .select("*")
    .eq("pseudo", pseudo)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error(selectError);
    throw new Error("Erreur lors de la recherche du dégustateur");
  }

  if (existingGuest) return existingGuest;

  // 3. Sinon, créer un nouvel invité
  const { data: newGuest, error: insertError } = await supabase
    .from("degustateur")
    .insert([
      {
        pseudo: pseudo,
        // secret_token généré automatiquement par la DB (uuid)
      },
    ])
    .select()
    .maybeSingle();

  if (insertError) {
    console.error(insertError);
    throw new Error("Erreur lors de la création du dégustateur");
  }

  return newGuest;
}
