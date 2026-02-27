import { supabase } from "./supabaseClient";

/**
 * Login admin avec email et password
 * @param {string} email
 * @param {string} password
 * @returns {object} admin user
 */
export async function loginAdmin(email, password) {
  if (!email || !password) {
    throw new Error("Email et mot de passe requis");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  });

  if (error) {
    console.error("Erreur login admin:", error);
    throw new Error(error.message || "Erreur de connexion");
  }

  return data.user;
}

/**
 * Logout admin
 */
export async function logoutAdmin() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Erreur logout:", error);
    throw new Error("Erreur lors de la déconnexion");
  }
}

/**
 * Vérifier si l'utilisateur est authentifié (admin)
 */
export async function getCurrentAdmin() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
