import { useEffect, useMemo, useState } from "react";
import { X, Check, Download } from "lucide-react";

const TYPE_OPTIONS = ["principal", "garniture", "optionnel"];

export default function RecipeImportModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  inventory,
  onImported,
}) {
  const [sourceMode, setSourceMode] = useState("url");
  const [sourceValue, setSourceValue] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [commitError, setCommitError] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [extraction, setExtraction] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [steps, setSteps] = useState([]);

  const agentBaseUrl = import.meta.env.VITE_AGENT_BASE_URL || "";

  const inventoryOptions = useMemo(() => {
    return [...(inventory || [])].sort((a, b) => a.nom.localeCompare(b.nom));
  }, [inventory]);

  useEffect(() => {
    if (!isOpen) return;
    setSourceMode("url");
    setSourceValue("");
    setExtractError(null);
    setCommitError(null);
    setExtraction(null);
    setIngredients([]);
    setSteps([]);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExtract = async () => {
    setExtractError(null);
    setCommitError(null);

    if (!sourceValue.trim()) {
      setExtractError("Ajoute une URL ou un texte de recette.");
      return;
    }
    if (!agentBaseUrl) {
      setExtractError("VITE_AGENT_BASE_URL manquante.");
      return;
    }

    setExtracting(true);
    try {
      const payload = {
        entity_type: entityType,
        url: sourceMode === "url" ? sourceValue.trim() : undefined,
        text: sourceMode === "text" ? sourceValue.trim() : undefined,
      };

      const res = await fetch(`${agentBaseUrl}/api/recipe/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Erreur lors de l'extraction");
      }

      const extractionData = data.extraction || data;
      setExtraction(extractionData);

      const mappedIngredients = (extractionData.ingredients || []).map((ing) => ({
        ...ing,
        quantity: ing.quantity ?? "",
        unit: ing.unit ?? "",
        type: entityType === "boisson" ? (ing.type || "principal") : (ing.type || ""),
        selectedInventoryId: ing.match?.selected_inventory_id || "",
        createNewName: "",
      }));
      setIngredients(mappedIngredients);
      setSteps((extractionData.steps || []).map((s) => ({ ...s })));
    } catch (err) {
      setExtractError(err.message || "Erreur lors de l'extraction");
    } finally {
      setExtracting(false);
    }
  };

  const updateIngredient = (index, patch) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing))
    );
  };

  const updateStep = (index, patch) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  };

  const handleCommit = async () => {
    setCommitError(null);

    if (!agentBaseUrl) {
      setCommitError("VITE_AGENT_BASE_URL manquante.");
      return;
    }

    const invalid = ingredients.some(
      (ing) => !ing.selectedInventoryId && !ing.createNewName?.trim()
    );
    if (invalid) {
      setCommitError("Assigne chaque ingrédient à l'inventaire ou crée un nouvel ingrédient.");
      return;
    }

    setCommitting(true);
    try {
      const payload = {
        entity_type: entityType,
        entity_id: entityId,
        replace_mode: true,
        source: extraction?.source || { url: null, name: null },
        title: extraction?.title || null,
        ingredients: ingredients.map((ing) => ({
          ingredient_id: ing.selectedInventoryId || null,
          create_new_name: ing.createNewName?.trim() || null,
          quantity: ing.quantity === "" ? null : Number(ing.quantity),
          unit: ing.unit || null,
          type: entityType === "boisson" ? ing.type || "principal" : ing.type || null,
          name_raw: ing.name_raw || null,
          alternatives: {
            raw: ing.name_raw || null,
            notes: ing.notes || null,
            group: ing.group || null,
            quantity_text: ing.quantity_text || null,
          },
        })),
        steps: steps.map((s, idx) => ({
          order: idx + 1,
          text: s.text,
        })),
      };

      const res = await fetch(`${agentBaseUrl}/api/recipe/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Erreur lors de l'import");
      }

      onImported?.(data);
      onClose();
    } catch (err) {
      setCommitError(err.message || "Erreur lors de l'import");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
          zIndex: 2000,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "var(--bg-secondary)",
          color: "var(--text-primary)",
          borderRadius: 16,
          padding: 24,
          width: "92%",
          maxWidth: 900,
          maxHeight: "90vh",
          overflowY: "auto",
          zIndex: 2001,
          border: "1px solid var(--border-color)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Importer une recette</h2>
          <button
            onClick={onClose}
            className="order-card-icon-button"
            title="Fermer"
            style={{ width: 36, height: 36 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setSourceMode("url")}
            className={`filter-button ${sourceMode === "url" ? "active" : ""}`}
          >
            URL
          </button>
          <button
            onClick={() => setSourceMode("text")}
            className={`filter-button ${sourceMode === "text" ? "active" : ""}`}
          >
            Texte
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <textarea
            rows={sourceMode === "url" ? 2 : 6}
            placeholder={sourceMode === "url" ? "Coller une URL..." : "Coller la recette..."}
            value={sourceValue}
            onChange={(e) => setSourceValue(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "var(--font-size-base)",
              resize: "vertical",
            }}
          />
        </div>

        {extractError && (
          <p style={{ marginTop: 12, color: "var(--error)" }}>{extractError}</p>
        )}

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={handleExtract}
            disabled={extracting}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "var(--secondary-500)",
              color: "white",
              fontWeight: "var(--font-weight-semibold)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Download size={16} />
            {extracting ? "Extraction..." : "Extraire"}
          </button>
        </div>

        {extraction && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12 }}>Ingrédients</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {ingredients.map((ing, idx) => (
                <div
                  key={`${ing.name_raw}-${idx}`}
                  style={{
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                    padding: 12,
                    backgroundColor: "var(--bg-primary)",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <div style={{ flex: "1 1 220px", fontWeight: "var(--font-weight-semibold)" }}>
                      {ing.name_raw}
                    </div>
                    <div style={{ minWidth: 120, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      {ing.match?.status || "non évalué"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                    <input
                      type="number"
                      step="0.01"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(idx, { quantity: e.target.value })}
                      placeholder="Quantité"
                      style={{
                        width: 120,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--border-color)",
                        backgroundColor: "white",
                        color: "var(--text-on-light-primary)",
                      }}
                    />
                    <input
                      value={ing.unit}
                      onChange={(e) => updateIngredient(idx, { unit: e.target.value })}
                      placeholder="Unité"
                      style={{
                        width: 120,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--border-color)",
                        backgroundColor: "white",
                        color: "var(--text-on-light-primary)",
                      }}
                    />

                    {entityType === "boisson" && (
                      <select
                        value={ing.type}
                        onChange={(e) => updateIngredient(idx, { type: e.target.value })}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border-color)",
                          backgroundColor: "white",
                          color: "var(--text-on-light-primary)",
                        }}
                      >
                        {TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    <select
                      value={ing.selectedInventoryId || (ing.createNewName ? "__new__" : "")}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "__new__") {
                          updateIngredient(idx, { selectedInventoryId: "", createNewName: ing.createNewName || ing.name_raw });
                        } else {
                          updateIngredient(idx, { selectedInventoryId: value, createNewName: "" });
                        }
                      }}
                      style={{
                        flex: "1 1 260px",
                        minWidth: 220,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--border-color)",
                        backgroundColor: "white",
                        color: "var(--text-on-light-primary)",
                      }}
                    >
                      <option value="">-- Sélectionner un ingrédient --</option>
                      <option value="__new__">+ Ajouter à l'inventaire</option>
                      {inventoryOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {ing.createNewName && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        value={ing.createNewName}
                        onChange={(e) => updateIngredient(idx, { createNewName: e.target.value })}
                        placeholder="Nom du nouvel ingrédient"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border-color)",
                          backgroundColor: "white",
                          color: "var(--text-on-light-primary)",
                        }}
                      />
                    </div>
                  )}

                  {ing.quantity_text && (
                    <div style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Quantité texte: {ing.quantity_text}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <h3 style={{ margin: "24px 0 12px" }}>Étapes</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {steps.map((step, idx) => (
                <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 28, marginTop: 8, color: "var(--text-secondary)" }}>{idx + 1}.</div>
                  <textarea
                    rows={2}
                    value={step.text}
                    onChange={(e) => updateStep(idx, { text: e.target.value })}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "var(--font-size-base)",
                    }}
                  />
                </div>
              ))}
            </div>

            {commitError && (
              <p style={{ marginTop: 12, color: "var(--error)" }}>{commitError}</p>
            )}

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={handleCommit}
                disabled={committing}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: "var(--primary-600)",
                  color: "white",
                  fontWeight: "var(--font-weight-semibold)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Check size={16} />
                {committing ? "Import..." : "Importer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
