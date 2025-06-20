import { useState, useEffect, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBars, 
  faHouseUser, 
  faUsers, 
  faMagnifyingGlass, 
  faChartSimple, 
  faKey, 
  faUserPlus, 
  faChevronDown, 
  faUser, 
  faLock, 
  faPowerOff,
  faCircle
} from "@fortawesome/free-solid-svg-icons";

function Layout({ children, isDirector, isAdmin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    chercheurId: '',
    email: '',
    imageBlob: null,
    changed: 1 // Default to 1 (no alert)
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("Starting fetchUserData...");
        
        // Get user from localStorage
        const userString = localStorage.getItem("user");
        if (!userString) {
          console.error("No user data in localStorage");
          return;
        }
    
        const user = JSON.parse(userString);
        console.log("User from localStorage:", user);
    
        if (!user?.id) {
          console.error("User ID not found in user data");
          return;
        }
    
        // Set basic info immediately
        setUserData(prev => ({ 
          ...prev, 
          email: user.email || '',
          chercheurId: user.chercheur_id || ''
        }));
    
        // 1. Fetch changed status from API
        try {
          console.log(`Fetching status for user ID: ${user.id}`);
          const statusResponse = await fetch(`http://localhost:5000/api/${user.id}/status`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem("token")}`,
              'Content-Type': 'application/json'
            }
          });
    
          console.log("Status response received:", {
            status: statusResponse.status,
            ok: statusResponse.ok
          });
    
          if (!statusResponse.ok) {
            const errorText = await statusResponse.text();
            console.error("Status API error:", errorText);
            throw new Error(`Status API returned ${statusResponse.status}`);
          }
    
          const statusData = await statusResponse.json();
          console.log("Status data:", statusData);
          
          setUserData(prev => ({ 
            ...prev, 
            changed: statusData.changed 
          }));
        } catch (statusError) {
          console.error("Error in status fetch:", statusError);
        }
    
        // 2. Fetch profile image if available
        if (user.chercheur_id) {
          try {
            console.log(`Fetching profile image for researcher ID: ${user.chercheur_id}`);
            const imageResponse = await fetch(
              `http://localhost:5000/api/researchers/${user.id}/profile-image`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem("token")}`
                }
              }
            );
    
            console.log("Image response received:", {
              status: imageResponse.status,
              ok: imageResponse.ok
            });
    
            if (imageResponse.ok) {
              const blob = await imageResponse.blob();
              const blobUrl = URL.createObjectURL(blob);
              console.log("Created blob URL for image");
              setUserData(prev => ({ 
                ...prev, 
                imageBlob: blobUrl 
              }));
            } else {
              const errorText = await imageResponse.text();
              console.error("Image API error:", errorText);
            }
          } catch (imageError) {
            console.error("Error in image fetch:", imageError);
          }
        }
      } catch (mainError) {
        console.error("Error in fetchUserData:", mainError);
      }
    };

    fetchUserData();

    // Set up interval to check status periodically (every 5 minutes)
    const intervalId = setInterval(fetchUserData, 300000);

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      if (userData.imageBlob) {
        URL.revokeObjectURL(userData.imageBlob);
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  // Helper component for the notification indicator
  const NotificationDot = () => (
    <FontAwesomeIcon 
      icon={faCircle} 
      style={{
        color: 'red',
        fontSize: '8px',
        marginLeft: '5px',
        verticalAlign: 'middle'
      }} 
    />
  );

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo">
          <img src="/logo.png" alt="LMCS Logo" />
        </div>
        <nav>
          <ul style={{ marginTop: "-60px" }}>
            <li className={location.pathname === "/" ? "active" : ""}>
              <Link to="/" style={{ textDecoration: "none", color: "inherit", paddingLeft: "20px" }}>
                <FontAwesomeIcon icon={faHouseUser} /><span style={{ paddingLeft: "20px" }}>Accueil</span>
              </Link>
            </li>
            <li className={location.pathname === "/chercheurs" ? "active" : ""}>
              <Link to="/chercheurs" style={{ textDecoration: "none", color: "inherit", paddingLeft: "20px" }}>
                <FontAwesomeIcon icon={faUsers} /> <span style={{ paddingLeft: "20px" }}>Chercheurs</span>
              </Link>
            </li>
            <li className={location.pathname === "/Recherche" ? "active" : ""}>
              <Link to="/Recherche" style={{ textDecoration: "none", color: "inherit" }}>
                <FontAwesomeIcon icon={faMagnifyingGlass} /> Recherche
              </Link>
            </li>
            <li className={location.pathname === "/Stat" ? "active" : ""}>
              <Link to="/Stat" style={{ textDecoration: "none", color: "inherit", paddingLeft: "20px" }}>
                <FontAwesomeIcon icon={faChartSimple} /> <span style={{ paddingLeft: "20px" }}>Statistiques</span>
              </Link>
            </li>
            {(isDirector === true || isAdmin === true) && (
              <li className={location.pathname === "/New_account" ? "active" : ""}>
                <Link to="/New_account" style={{ textDecoration: "none", color: "inherit", paddingLeft: "20px" }}>
                  <FontAwesomeIcon icon={faKey} /> <span style={{ paddingLeft: "20px" }}>Comptes</span>
                </Link>
              </li>
            )}
            {isDirector === true && (
              <li className={location.pathname === "/AjouterChercheur" ? "active" : ""}>
                <Link to="/AjouterChercheur" style={{ textDecoration: "none", color: "inherit", paddingLeft: "20px" }}>
                  <FontAwesomeIcon icon={faUserPlus} /><span style={{ paddingLeft: "20px" }}> Ajouter</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
        <div className="settings">
          {/* Empty settings div maintained for layout consistency */}
        </div>
        <div className="esi">
          <img src="/esi.png" alt="ESI Logo" />
        </div>
      </aside>

      <div className="main-content">
        <header className="navbar">
          <div className="menu-icon">
            <FontAwesomeIcon icon={faBars} />
          </div>
          <div className="navbar-title" style={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}>
            <h1 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#2c3e50',
              margin: 0,
              lineHeight: '1.2',
              textTransform: 'capitalize',
              letterSpacing: '1px',
            }}>
              Laboratoire de Méthodes de Conception des Systèmes
            </h1>
          </div>
          <div 
            className="user-info" 
            ref={userMenuRef}
            onClick={toggleUserMenu}
            style={{
              marginLeft: "auto",
              paddingRight: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderRadius: "24px",
              backgroundColor: "#e9eaeb",
              position: "relative",
              cursor: "pointer",
              padding: "5px 15px"
            }}
          >
            {userData.chercheurId && (
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                overflow: "hidden",
                background: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <img 
                  src={userData.imageBlob || '/profil.jpg'} 
                  alt="Profile" 
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/profil.jpg';
                  }}
                />
              </div>
            )}
            <div style={{
              textDecoration: "none",
              color: "inherit",
            }}>
              Connecté en tant que <strong>{userData.email}</strong>
              {userData.changed === 0 && <NotificationDot />}
            </div>
            <FontAwesomeIcon icon={faChevronDown} style={{ marginLeft: "5px", fontSize: "12px" }} />
            
            {showUserMenu && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: "0",
                backgroundColor: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                borderRadius: "8px",
                minWidth: "200px",
                zIndex: 1000,
                marginTop: "5px",
                overflow: "hidden"
              }}>
                <ul style={{
                  listStyle: "none",
                  padding: "0",
                  margin: "0"
                }}>
                  {userData.chercheurId && (
                    <li>
                      <Link 
                        to={`/chercheurs/${userData.chercheurId}`}
                        style={{
                          display: "block",
                          padding: "12px 20px",
                          textDecoration: "none",
                          color: "#333",
                          borderBottom: "1px solid #f0f0f0",
                          transition: "background-color 0.2s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <FontAwesomeIcon icon={faUser} style={{ marginRight: "10px" }} />
                        Mon Profile
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link 
                      to="/change-password" 
                      style={{
                        display: "block",
                        padding: "12px 20px",
                        textDecoration: "none",
                        color: "#333",
                        borderBottom: "1px solid #f0f0f0",
                        transition: "background-color 0.2s"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <FontAwesomeIcon icon={faLock} style={{ marginRight: "10px" }} />
                      Changer le mot de passe
                      {userData.changed === 0 && <NotificationDot />}
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/login" 
                      onClick={handleLogout}
                      style={{
                        display: "block",
                        padding: "12px 20px",
                        textDecoration: "none",
                        color: "#333",
                        transition: "background-color 0.2s"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <FontAwesomeIcon icon={faPowerOff} style={{ marginRight: "10px" }} />
                      Déconnecter
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export default Layout;