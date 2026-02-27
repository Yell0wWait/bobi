import React, { useState } from "react";
import { loginGuest } from "../../services/guestService";

export default function GuestLogin({ onLogin }) {
  const [pseudo, setPseudo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!pseudo.trim()) {
      setError("Veuillez entrer un pseudo");
      return;
    }

    try {
      setLoading(true);

      const guest = await loginGuest(pseudo.trim());

      // Stockage local (clé unique par appareil)
      localStorage.setItem(
        "bobi_guest",
        JSON.stringify({
          id: guest.id,
          pseudo: guest.pseudo,
          secret_token: guest.secret_token,
        })
      );

      // Callback vers App.jsx
      if (onLogin) {
        onLogin(guest);
      }
    } catch (err) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Bienvenue 👋</h2>
      <p>Entrez votre pseudo pour continuer</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Votre pseudo"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          disabled={loading}
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 10 }}
        >
          {loading ? "Connexion..." : "Entrer"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: 10 }}>
          {error}
        </p>
      )}
    </div>
  );
}
