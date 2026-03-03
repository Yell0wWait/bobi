import { Link } from "react-router-dom";
import { LogOut, Home, ShoppingCart, Wine, UtensilsCrossed, ShoppingBag, Calendar, List, ChevronDown } from "lucide-react";
import { logoutAdmin } from "../services/adminService";
import { useState } from "react";

export default function Navbar({ userType = "guest", onLogout }) {
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  async function handleLogout() {
    if (userType === "admin") {
      try {
        await logoutAdmin();
      } catch (err) {
        console.error("Erreur logout:", err);
      }
    }
    if (onLogout) {
      onLogout();
    }
  }

  if (userType === "admin") {
    const menuStructure = {
      boissons: {
        icon: Wine,
        label: "Boissons",
        subItems: [
          { to: "/", icon: Wine, label: "Boissons dispo" },
          { to: "/mes-commandes", icon: ShoppingCart, label: "Mes commandes" },
          { to: "/admin/boissons", icon: Wine, label: "Catalogue Boissons" },
          { to: "/admin/commandes", icon: ShoppingCart, label: "Commandes Admin" }
        ]
      },
      nourritures: {
        icon: UtensilsCrossed,
        label: "Nourritures",
        to: "/admin/nourriture"
      },
      planification: {
        icon: Calendar,
        label: "Planification",
        subItems: [
          { to: "/admin/inventaire", icon: ShoppingBag, label: "Inventaire" },
          { to: "/admin/menu", icon: Calendar, label: "Menu" },
          { to: "/admin/epicerie", icon: List, label: "Liste d'épicerie" }
        ]
      }
    };

    return (
      <>
        <style>{`
          @media (max-width: 768px) {
            .navbar-desktop { display: none !important; }
            .navbar-mobile { display: flex !important; }
            nav {
              position: fixed !important;
              bottom: 0 !important;
              top: auto !important;
              left: 0;
              right: 0;
              border-bottom: none !important;
              border-top: 1px solid var(--border-color) !important;
              padding: 0.5rem 0.5rem !important;
            }
            body {
              padding-bottom: 80px;
            }
          }
          @media (min-width: 769px) {
            .navbar-desktop { display: flex !important; }
            .navbar-mobile { display: none !important; }
          }
        `}</style>

        <nav style={{ 
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          padding: "1rem", 
          backgroundColor: 'var(--bg-primary)',
          borderBottom: "1px solid var(--border-color)", 
          display: "flex", 
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: 'var(--shadow-sm)',
          gap: '1rem'
        }}>
          {/* Desktop navigation */}
          <div className="navbar-desktop" style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {Object.entries(menuStructure).map(([key, menu]) => {
              const hasSubItems = menu.subItems && Array.isArray(menu.subItems) && menu.subItems.length > 0;
              return (
              <div key={key} style={{ position: 'relative' }}>
                {hasSubItems ? (
                  <>
                    <button
                      onMouseEnter={() => setExpandedMenu(key)}
                      onMouseLeave={() => setExpandedMenu(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-100)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <menu.icon size={18} />
                      {menu.label}
                      <ChevronDown size={16} />
                    </button>

                    {expandedMenu === key && (
                      <div
                        onMouseEnter={() => setExpandedMenu(key)}
                        onMouseLeave={() => setExpandedMenu(null)}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: '4px',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          minWidth: '200px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          zIndex: 1001
                        }}
                      >
                        {menu.subItems.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '10px 12px',
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                              borderRadius: '6px',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-100)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <item.icon size={16} />
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={menu.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-100)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <menu.icon size={18} />
                    {menu.label}
                  </Link>
                )}
              </div>
            );
            })}
          </div>

          <div className="navbar-desktop" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleLogout}
              className="btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px', fontSize: 'var(--font-size-base)' }}
            >
              <LogOut size={18} /> Déconnexion
            </button>
          </div>

          {/* Mobile navigation - icons with labels */}
          <div className="navbar-mobile" style={{ display: 'none', justifyContent: 'space-around', alignItems: 'center', width: '100%', position: 'relative' }}>
            {Object.entries(menuStructure).map(([key, menu]) => {
              const hasSubItems = menu.subItems && Array.isArray(menu.subItems) && menu.subItems.length > 0;
              return hasSubItems ? (
                <button
                  key={key}
                  onClick={() => setExpandedMenu(expandedMenu === key ? null : key)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    color: 'var(--text-primary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    fontSize: 'var(--font-size-xs)',
                    gap: '2px'
                  }}
                >
                  <menu.icon size={22} />
                  <span style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>{menu.label}</span>
                </button>
              ) : (
                <Link
                  key={key}
                  to={menu.to}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    padding: '4px 8px',
                    fontSize: 'var(--font-size-xs)',
                    gap: '2px'
                  }}
                >
                  <menu.icon size={22} />
                  <span style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>{menu.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="btn-danger"
              style={{
                padding: '4px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontSize: 'var(--font-size-xs)',
                gap: '2px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)'
              }}
              title="Déconnexion"
            >
              <LogOut size={22} />
              <span style={{ fontSize: 'var(--font-size-xs)' }}>Quitter</span>
            </button>

            {/* Submenu popup for mobile */}
            {expandedMenu && menuStructure[expandedMenu] && menuStructure[expandedMenu].subItems && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 998
                  }}
                  onClick={() => setExpandedMenu(null)}
                />
                <div
                  style={{
                    position: 'fixed',
                    bottom: '70px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    zIndex: 999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minWidth: '250px',
                    maxWidth: '90vw'
                  }}
                >
                  {menuStructure[expandedMenu] && menuStructure[expandedMenu].subItems && menuStructure[expandedMenu].subItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setExpandedMenu(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        color: '#0f172a',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        backgroundColor: 'var(--primary-50)',
                        transition: 'background 0.2s'
                      }}
                    >
                      <item.icon size={20} />
                      <span style={{ fontSize: 'var(--font-size-lg)' }}>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* More menu popup */}
            {moreMenuOpen && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 998
                  }}
                  onClick={() => setMoreMenuOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '60px',
                    right: '10px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minWidth: '150px'
                  }}
                >
                  <button
                    onClick={() => {
                      handleLogout();
                      setMoreMenuOpen(false);
                    }}
                    className="btn-danger"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', width: '100%', justifyContent: 'flex-start' }}
                  >
                    <LogOut size={18} />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>
      </>
    );
  }

  // Guest navbar
  const guestLinks = [
    { to: "/", icon: Home, label: "Accueil" },
    { to: "/mes-commandes", icon: ShoppingCart, label: "Mes Commandes" }
  ];

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .navbar-desktop { display: none !important; }
          .navbar-mobile { display: flex !important; }
          nav {
            position: fixed !important;
            bottom: 0 !important;
            top: auto !important;
            left: 0;
            right: 0;
            border-bottom: none !important;
            border-top: 1px solid var(--border-color) !important;
            padding: 0.5rem 1rem !important;
          }
          body {
            padding-bottom: 70px;
          }
        }
        @media (min-width: 769px) {
          .navbar-desktop { display: flex !important; }
          .navbar-mobile { display: none !important; }
        }
      `}</style>

      <nav style={{ 
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        padding: "1rem", 
        backgroundColor: 'var(--bg-primary)',
        borderBottom: "1px solid var(--border-color)", 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: 'var(--shadow-sm)',
        gap: '1rem'
      }}>
        {/* Desktop navigation */}
        <div className="navbar-desktop" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {guestLinks.map((item) => (
            <Link key={item.to} to={item.to} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)', textDecoration: 'none' }}>
              <item.icon size={18} /> {item.label}
            </Link>
          ))}
        </div>

        <div className="navbar-desktop" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={handleLogout}
            className="btn-danger"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 12px', fontSize: 'var(--font-size-base)' }}
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </div>

        {/* Mobile navigation - icons with labels */}
        <div className="navbar-mobile" style={{ display: 'none', justifyContent: 'space-around', alignItems: 'center', width: '100%', position: 'relative' }}>
          {guestLinks.map((item) => (
            <Link 
              key={item.to} 
              to={item.to} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                color: 'var(--text-primary)', 
                textDecoration: 'none',
                padding: '8px',
                gap: '2px'
              }}
            >
              <item.icon size={22} />
              <span style={{ fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap' }}>{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="btn-ghost"
            style={{
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              gap: '2px'
            }}
            title="Déconnexion"
          >
            <LogOut size={22} />
            <span style={{ fontSize: 'var(--font-size-xs)' }}>Déconnexion</span>
          </button>
        </div>
      </nav>
    </>
  );
}
