import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { getBoissonImageUrl } from "../../services/imageService";
import BoissonCard from "../../components/BoissonCard";
import BobiAnimation from "../../components/BobiAnimation";
import Header from "../../components/Header";
import { Search, X } from 'lucide-react';

export default function CatalogueBoissons() {
  const [boissons, setBoissons] = useState([]);
  const [filteredBoissons, setFilteredBoissons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchExpanded, setSearchExpanded] = useState(false);

  useEffect(() => {
    async function fetchBoissons() {
      const { data, error } = await supabase
        .from("boissons_disponibles")
        .select("id, nom, categorie, commentaire, profil, actif");

      if (error) {
        console.error("Erreur Supabase :", error);
        setError(error.message);
      } else {
        // Charger les ingrédients pour chaque boisson
        const boissonsWithIngredients = await Promise.all(
          data.map(async (boisson) => {
            const { data: ingredients } = await supabase
              .from("boissons_ingredients")
              .select(`
                ingredient_id,
                quantite,
                unite,
                inventaire:ingredient_id(nom)
              `)
              .eq("boisson_id", boisson.id);
            
            return {
              ...boisson,
              ingredients: ingredients || []
            };
          })
        );
        
        setBoissons(boissonsWithIngredients);
        setFilteredBoissons(boissonsWithIngredients);
        
        // Extraire les catégories uniques
        const cats = [...new Set(data.map(b => b.categorie).filter(Boolean))].sort();
        setCategories(cats);
        // Initialiser tous les filtres comme sélectionnés
        setSelectedCategories(cats);
      }

      setLoading(false);
    }

    fetchBoissons();
  }, []);

  function toggleCategory(category) {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  }

  useEffect(() => {
    let filtered = boissons;

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(b =>
        b.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.commentaire && b.commentaire.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtre par catégories (multi-select)
    // Si aucun filtre n'est sélectionné, afficher rien
    if (selectedCategories.length === 0) {
      filtered = [];
    } else {
      filtered = filtered.filter(b => selectedCategories.includes(b.categorie));
    }

    setFilteredBoissons(filtered);
  }, [searchTerm, selectedCategories, boissons]);

  if (loading) return <BobiAnimation type="loading" message="Bobi vérifie les stocks..." duration={0} />;
  if (error) return <p>{error}</p>;

  return (
    <>
      <Header title="Boissons disponibles" showBackButton={false} />
      <div style={{ padding: "1rem", paddingBottom: "80px" }}>

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
              placeholder="Rechercher une boisson..."
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
          {filteredBoissons.length} boisson{filteredBoissons.length > 1 ? "s" : ""} trouvée{filteredBoissons.length > 1 ? "s" : ""}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        {filteredBoissons.map((boisson) => (
          <Link to={`/boissons/${boisson.id}`} key={boisson.id} style={{ textDecoration: "none" }}>
            <BoissonCard boisson={boisson} />
          </Link>
        ))}
      </div>
    </div>
    </>
  );
}
