import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "./helpers/AuthContext";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { isAuthenticated, setIsAuthenticated, setRole } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Clear token and user data when arriving at login page
  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role"); // Also remove the role
    setIsAuthenticated(false);
    setRole(null); // Reset role in context
  }, [setIsAuthenticated, setRole]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
  
    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("role", data.user.role);

        // Update both authentication and role in the context
        setIsAuthenticated(true);
        setRole(data.user.role); // This is the key addition to update role in context
        
        navigate("/"); // Redirect to home page
      } else {
        setError(data.message || "Identifiants incorrects.");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la connexion au serveur.");
    }
  };

  return (
    <div className="login-container">
      <div className="left-section">
        <img src="/labfetch.png" alt="LabFetch Logo" className="logo" />
        <h1 className="loginh1">Bienvenue</h1>
        <p className="loginp">
          LabFetch est une plateforme qui permet de créer, gérer et diffuser
          des contenus pédagogiques en ligne, tout en assurant le suivi des
          apprenants.
        </p>
      </div>
      <div className="right-section">
        <h3 className="loginh3">Veuillez vous connecter à votre compte</h3>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Connexion</button>
        </form>
      </div>
    </div>
  );
}