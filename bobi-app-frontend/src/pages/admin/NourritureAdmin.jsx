import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import NourritureCard from "../../components/NourritureCard";
import Header from "../../components/Header";
import { Plus, Search, X } from 'lucide-react';import BobiAnimation from "../../components/BobiAnimation";
export default function NourritureAdmin() {
  const [nourritures, setNourritures] = useState([]);
  const [filteredNourritures, setFilteredNourritures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchNourritures() {
      const { data, error } = await supabase
        .from("nourritures")
        .select("id, nom, categorie, commentaire, profil, actif")
        .order("nom", { ascending: true });

      if (error) {
        console.error("Erreur Supabase :", error);
        setError(error.message);
      } else {
        setNourritures(data);
        setFilteredNourritures(data);
        
        // Extraire les catégories uniques
        const cats = [...new Set(data.map(n => n.categorie).filter(Boolean))].sort();
        setCategories(cats);
        // Initialiser tous les filtres comme sélectionnés
        setSelectedCategories(cats);
      }

      setLoading(false);
    }

    fetchNourritures();
  }, []);

  function toggleCategory(category) {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  }

  useEffect(() => {
    let filtered = nourritures;

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.commentaire && n.commentaire.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtre par catégories (multi-select)
    // Si aucun filtre n'est sélectionné, afficher rien
    if (selectedCategories.length === 0) {
      filtered = [];
    } else {
      filtered = filtered.filter(n => selectedCategories.includes(n.categorie));
    }

    // Trier par statut actif (actives en premier), puis par ordre alphabétique
    filtered = [...filtered].sort((a, b) => {
      // D'abord par statut
      if (a.actif !== b.actif) {
        return a.actif ? -1 : 1;
      }
      // Puis par ordre alphabétique
      return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
    });

    setFilteredNourritures(filtered);
  }, [searchTerm, selectedCategories, nourritures]);

  if (loading) return <BobiAnimation type="loading" message="Bobi vérifie les stocks..." duration={0} />;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <>
      <Header title="Catalogue des nourritures" />
      <div style={{ padding: "1rem", paddingBottom: "80px" }}>

      {/* Floating Action Button */}
      <button 
        onClick={() => navigate("/admin/nourriture/new")} 
        className="floating-button"
        title="Ajouter une nourriture"
      >
        <Plus size={24} />
      </button>

      {/* Barre de recherche extensible */}
      <div className="search-container">
        {!searchExpanded ? (
          <button
            onClick={() => setSearchExpanded(true)}
            className="search-button"
          >
            <Search size={16} /> Rechercher
          </button>
        ) : (
          <div className="search-expanded">
            <input
              type="text"
              placeholder="Rechercher une nourriture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="search-input"
            />
            <button
              onClick={() => {
                setSearchExpanded(false);
                setSearchTerm("");
              }}
              className="search-close-button"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Filtres par catégories */}
      <div className="filter-container">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`filter-button ${selectedCategories.includes(cat) ? "active" : ""}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Compteur de résultats */}
      {(searchTerm || selectedCategories.length > 0) && (
        <div style={{ marginBottom: 12, fontSize: 'var(--font-size-base)', color: "var(--text-secondary)" }}>
          {filteredNourritures.length} nourriture{filteredNourritures.length > 1 ? "s" : ""} trouvée{filteredNourritures.length > 1 ? "s" : ""}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        {filteredNourritures.map((nourriture) => (
          <div 
            key={nourriture.id} 
            onClick={() => navigate(`/admin/nourriture/${nourriture.id}`)}
            style={{ cursor: "pointer" }}
          >
            <NourritureCard nourriture={nourriture} />
          </div>
        ))}
      </div>
      </div>
    </>
  );
}
