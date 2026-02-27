import React, { useState } from "react";
import { loginGuest } from "../services/guestService";
import { loginAdmin } from "../services/adminService";
import Header from "../components/Header";

export default function UnifiedLogin({ onGuestLogin, onAdminLogin }) {
  const [input, setInput] = useState(""); // pseudo ou email
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEmail = input.includes("@");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!input.trim()) {
      setError("Veuillez entrer un pseudo ou email");
      return;
    }

    if (isEmail && !password.trim()) {
      setError("Veuillez entrer votre mot de passe");
      return;
    }

    try {
      setLoading(true);

      if (isEmail) {
        // Admin login
        const admin = await loginAdmin(input.trim(), password.trim());
        localStorage.setItem(
          "bobi_admin",
          JSON.stringify({
            id: admin.id,
            email: admin.email,
          })
        );
        if (onAdminLogin) {
          onAdminLogin(admin);
        }
      } else {
        // Guest login
        const guest = await loginGuest(input.trim());
        localStorage.setItem(
          "bobi_guest",
          JSON.stringify({
            id: guest.id,
            pseudo: guest.pseudo,
            secret_token: guest.secret_token,
          })
        );
        if (onGuestLogin) {
          onGuestLogin(guest);
        }
      }
    } catch (err) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header title="Connexion" showBackButton={false} />
      <div style={{ maxWidth: 400, margin: "0 auto", marginTop: "100px" }}>
      <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>
        {isEmail ? "Connectez-vous en tant qu'admin" : "Entrez votre pseudo"}
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Pseudo"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 10,
            boxSizing: "border-box",
            fontSize: 'var(--font-size-lg)',
          }}
        />

        {isEmail && (
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 10,
              boxSizing: "border-box",
              fontSize: 'var(--font-size-lg)',
            }}
          />
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 'var(--font-size-lg)',
            backgroundColor: "var(--secondary-500)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Connexion..." : "Continuer"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: 15, textAlign: "center" }}>
          {error}
        </p>
      )}
      </div>
    </>
  );
}
