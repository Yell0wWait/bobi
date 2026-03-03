import { Routes, Route } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import BobiAnimation from "./components/BobiAnimation";
import { getCurrentAdmin } from "./services/adminService";

// Pages chargées immédiatement (login)
import UnifiedLogin from "./pages/UnifiedLogin";

// Code splitting - Pages chargées à la demande
const CatalogueBoissons = lazy(() => import("./pages/invite/CatalogueBoissons").catch(() => ({ default: () => <div>Erreur CatalogueBoissons</div> })));
const BoissonDetailInvite = lazy(() => import("./pages/invite/BoissonDetailInvite").catch(() => ({ default: () => <div>Erreur BoissonDetailInvite</div> })));
const MesCommandesInvite = lazy(() => import("./pages/invite/MesCommandesInvite").catch(() => ({ default: () => <div>Erreur MesCommandesInvite</div> })));

const BoissonsAdmin = lazy(() => import("./pages/admin/BoissonsAdmin").catch(() => ({ default: () => <div>Erreur BoissonsAdmin</div> })));
const BoissonDetailAdmin = lazy(() => import("./pages/admin/BoissonDetailAdmin").catch(() => ({ default: () => <div>Erreur BoissonDetailAdmin</div> })));
const CommandesAdmin = lazy(() => import("./pages/admin/CommandesAdmin").catch(() => ({ default: () => <div>Erreur CommandesAdmin</div> })));
const Inventaire = lazy(() => import("./pages/admin/Inventaire").catch(() => ({ default: () => <div>Erreur Inventaire</div> })));
const NourritureAdmin = lazy(() => import("./pages/admin/NourritureAdmin").catch(() => ({ default: () => <div>Erreur NourritureAdmin</div> })));
const NourritureDetailAdmin = lazy(() => import("./pages/admin/NourritureDetailAdmin").catch(() => ({ default: () => <div>Erreur NourritureDetailAdmin</div> })));
const MenuAdmin = lazy(() => import("./pages/admin/MenuAdmin").catch(() => ({ default: () => <div>Erreur MenuAdmin</div> })));
const MenuDetailAdmin = lazy(() => import("./pages/admin/MenuDetailAdmin").catch(() => ({ default: () => <div>Erreur MenuDetailAdmin</div> })));
const ListeEpicerie = lazy(() => import("./pages/admin/ListeEpicerie").catch(() => ({ default: () => <div>Erreur ListeEpicerie</div> })));
const MenuItemsAdmin = lazy(() => import("./pages/admin/MenuItemsAdmin").catch(() => ({ default: () => <div>Erreur MenuItemsAdmin</div> })));
const IngredientDetailAdmin = lazy(() => import("./pages/admin/IngredientDetailAdmin").catch(() => ({ default: () => <div>Erreur IngredientDetailAdmin</div> })));

export default function App() {
  const [guest, setGuest] = useState(
    JSON.parse(localStorage.getItem("bobi_guest") || "null")
  );
  const [admin, setAdmin] = useState(
    JSON.parse(localStorage.getItem("bobi_admin") || "null")
  );
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreAdminSession() {
      try {
        const currentAdmin = await getCurrentAdmin();
        if (!mounted) return;

        if (currentAdmin?.id) {
          const safeAdmin = { id: currentAdmin.id, email: currentAdmin.email };
          localStorage.setItem("bobi_admin", JSON.stringify(safeAdmin));
          setAdmin(safeAdmin);
        } else {
          localStorage.removeItem("bobi_admin");
          setAdmin(null);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    restoreAdminSession();
    return () => {
      mounted = false;
    };
  }, []);

  // Callback pour login invité
  function handleGuestLogin(guestObj) {
    if (!guestObj) return;
    localStorage.setItem("bobi_guest", JSON.stringify(guestObj));
    setGuest(guestObj);
  }

  // Callback pour login admin
  function handleAdminLogin(adminObj) {
    if (!adminObj) return;
    const safeAdmin = { id: adminObj.id, email: adminObj.email };
    localStorage.setItem("bobi_admin", JSON.stringify(safeAdmin));
    setAdmin(safeAdmin);
  }

  // Logout invité
  function handleGuestLogout() {
    localStorage.removeItem("bobi_guest");
    setGuest(null);
  }

  // Logout admin
  function handleAdminLogout() {
    localStorage.removeItem("bobi_admin");
    setAdmin(null);
  }

  if (authLoading) {
    return (
      <ThemeProvider>
        <BobiAnimation type="loading" />
      </ThemeProvider>
    );
  }

  // 1. Si admin est connecté → afficher routes ADMIN + INVITÉ
  if (admin && admin.id) {
    return (
      <ThemeProvider>
        <Navbar userType="admin" onLogout={handleAdminLogout} />
        <Suspense fallback={<BobiAnimation type="loading" />}>
          <Routes>
            {/* Routes Invité (accessible à l'admin aussi) */}
            <Route path="/" element={<CatalogueBoissons />} />
            <Route path="/boissons/:id" element={<BoissonDetailInvite />} />
            <Route path="/mes-commandes" element={<MesCommandesInvite secretToken={admin.id} />} />

            {/* Routes Admin */}
            <Route path="/admin/boissons" element={<BoissonsAdmin />} />
            <Route path="/admin/boissons/:id" element={<BoissonDetailAdmin />} />
            <Route path="/admin/commandes" element={<CommandesAdmin />} />
            <Route path="/admin/inventaire" element={<Inventaire />} />
            <Route path="/admin/inventaire/:id" element={<IngredientDetailAdmin />} />
            <Route path="/admin/nourriture" element={<NourritureAdmin />} />
            <Route path="/admin/nourriture/:id" element={<NourritureDetailAdmin />} />
            <Route path="/admin/menu" element={<MenuAdmin />} />
            <Route path="/admin/menus/:id" element={<MenuDetailAdmin />} />
            <Route path="/admin/menus_items/:id" element={<MenuItemsAdmin />} />
            <Route path="/admin/epicerie" element={<ListeEpicerie />} />
            {/* Rediriger vers admin/boissons par défaut */}
            <Route path="*" element={<BoissonsAdmin />} />
          </Routes>
        </Suspense>
      </ThemeProvider>
    );
  }

  // 2. Si invité est connecté → afficher routes invité
  if (guest && guest.secret_token) {
    return (
      <ThemeProvider>
        <Navbar userType="guest" onLogout={handleGuestLogout} />
        <Suspense fallback={<BobiAnimation type="loading" />}>
          <Routes>
            <Route path="/" element={<CatalogueBoissons />} />
            <Route path="/boissons/:id" element={<BoissonDetailInvite />} />
            <Route path="/mes-commandes" element={<MesCommandesInvite secretToken={guest.secret_token} />} />
            {/* Rediriger vers accueil par défaut */}
            <Route path="*" element={<CatalogueBoissons />} />
          </Routes>
        </Suspense>
      </ThemeProvider>
    );
  }

  // 3. Aucun login → afficher page login unifiée
  return (
    <ThemeProvider>
      <UnifiedLogin onGuestLogin={handleGuestLogin} onAdminLogin={handleAdminLogin} />
    </ThemeProvider>
  );
}
