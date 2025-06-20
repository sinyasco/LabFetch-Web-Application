import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./app.css";
import Chercheurs from "./Chercheurs";
import Login from "./Login";
import Home from "./Home";
import Layout from "./Layout";
import ResearcherProfile from "./ResearcherProfile";
import Recherche from "./Recherche";
import Info_pub from "./Info_pub";
import DocumentDetail from "./DocumentDetail";
import New_account from "./New_account";
import AjouterChercheur from "./AjouterChercheur";
import EditProfile from "./EditProfile";
//import MyProfile from "./MYProfile";
import Stat from "./Stat";
import Unauthorized from "./Unauthorized";
import ProtectedRoute from "./ProtectedRoute";
import AuthContext from "./helpers/AuthContext";
import ChangePassword from "./ChangePassword";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("token"));
  const [role, setRole] = useState(() => localStorage.getItem("role"));
  const [isLoading, setIsLoading] = useState(true);

  // Effect to update authentication and role when localStorage changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    
    if (token) {
      setIsAuthenticated(true);
      setRole(storedRole); // Update role whenever token changes
    } else {
      setIsAuthenticated(false);
      setRole(null);
    }
    
    setIsLoading(false);
    
    // Optional: Add localStorage change listener (for cross-tab synchronization)
    const handleStorageChange = (e) => {
      if (e.key === "token" || e.key === "role") {
        setIsAuthenticated(!!localStorage.getItem("token"));
        setRole(localStorage.getItem("role"));
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const isDirector = role === "directeur";
  const isAdmin = role === "admin";
  const isAssistant = role === "assistant"

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      setIsAuthenticated,
      role,
      setRole  // Add role to context so Login.jsx can update it
    }}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/"
            element={
              <ProtectedRoute
                allowedRoles={["directeur", "admin", "chercheur", "assistant"]}
                element={<Layout isDirector={isDirector} isAdmin={isAdmin}><Home isDirector={isDirector} /></Layout>}
              />
            }
          />
          <Route
            path="/chercheurs"
            element={
              <ProtectedRoute
                allowedRoles={["directeur", "admin", "chercheur", "assistant"]}
                element={<Layout isDirector={isDirector} isAdmin={isAdmin}><Chercheurs /></Layout>}
              />
            }
          />
          <Route
            path="/edit-profile/:chercheur_id"
            element={
              <ProtectedRoute
                allowedRoles={["directeur", "admin", "chercheur", "assistant"]}
                element={<Layout isDirector={isDirector} isAdmin={isAdmin}><EditProfile /></Layout>}
              />
            }
          />
          <Route
            path="/chercheurs/:id"
            element={
              <ProtectedRoute
                allowedRoles={["directeur", "admin", "chercheur", "assistant"]}
                element={<Layout isDirector={isDirector} isAdmin={isAdmin} isAssistant={isAssistant}><ResearcherProfile isDirector={isDirector} isAssistant={isAssistant}/></Layout>}
              />
            }
          />
          <Route
            path="/Recherche"
            element={
              <ProtectedRoute
                allowedRoles={["directeur", "admin", "chercheur", "assistant"]}
                element={<Layout isDirector={isDirector} isAdmin={isAdmin}><Recherche /></Layout>}
              />
            }
          />
          {/*
          <Route
            path="/info_pub"
            element={
              <ProtectedRoute
                allowedRoles={["directeur", "admin", "chercheur", "assistant"]}
                element={<Layout isDirector={isDirector} isAdmin={isAdmin}><Info_pub /></Layout>}
              />
            }
          />
           */}
          <Route
            path="/document/:id"
            element={
              <ProtectedRoute
                allowedRoles={["directeur", "admin", "chercheur", "assistant"]}
                element={<Layout isDirector={isDirector} isAdmin={isAdmin} isAssistant={isAssistant}><DocumentDetail isDirector={isDirector} isAssistant={isAssistant} /></Layout>}
              />
            }
          />
          <Route
            path="/stat"
            element={
              <ProtectedRoute
                allowedRoles={["directeur", "admin", "chercheur", "assistant"]}
                element={<Layout isDirector={isDirector} isAdmin={isAdmin}><Stat/></Layout>}
              />
            }
          />
          <Route
            path="/New_account"
            element={
              <ProtectedRoute
                allowedRoles={["directeur", "admin", "assistant"]}
                element={<Layout isDirector={isDirector} isAdmin={isAdmin}><New_account /></Layout>}
              />
            }
          />
          <Route
            path="/AjouterChercheur"
            element={
              <ProtectedRoute
                allowedRoles={["directeur"]}
                element={<Layout isDirector={isDirector} isAdmin={isAdmin}><AjouterChercheur /></Layout>}
              />
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute
                allowedRoles={["directeur", "admin", "chercheur", "assistant"]}
                element={<Layout isDirector={isDirector} isAdmin={isAdmin}><ChangePassword /></Layout>}
              />
            }
          />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;