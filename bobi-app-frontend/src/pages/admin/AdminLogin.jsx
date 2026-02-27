import React, { useState } from "react";
import { loginAdmin } from "../../services/adminService";

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    try {
      setLoading(true);

      const admin = await loginAdmin(email, password);

      // Stocker dans localStorage
      localStorage.setItem(
        "bobi_admin",
        JSON.stringify({
          id: admin.id,
          email: admin.email,
        })
      );

      // Callback vers App.jsx
      if (onLogin) {
        onLogin(admin);
      }
    } catch (err) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Admin Login</h2>
      <p>Connectez-vous avec vos identifiants</p>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          style={{
            width: "100%",
            padding: 8,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          style={{
            width: "100%",
            padding: 8,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 10 }}
        >
          {loading ? "Connexion..." : "Se connecter"}
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
