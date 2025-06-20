import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function ChangePassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  const user = JSON.parse(localStorage.getItem("user"));
  const user_id = user?.id;

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`http://localhost:5000/api/change-password/${user_id}`, passwordData);
      if (response.data.success) {
        alert("Mot de passe changé avec succès !");
        navigate(`/login`);
      } else {
        throw new Error(response.data.error || "Échec du changement de mot de passe");
      }
    } catch (error) {
      console.error("Password update error:", error);
      alert(error.response?.data?.details || error.response?.data?.error || "Erreur de changement de mot de passe");
    }
  };

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <div style={{ textAlign: "center", marginTop: "100px" }}>Chargement...</div>;

  return (
    <div className="change-password-container" style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      marginTop: "50px",
      minHeight: "calc(100vh - 80px)"
    }}>
      <div className="password-card" style={{
        width: "100%",
        maxWidth: "500px",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        padding: "32px",
        overflow: "hidden"
      }}>
        <h2 style={{
          fontSize: "24px",
          fontWeight: "700",
          color: "#2c3e50",
          marginBottom: "24px",
          textAlign: "center"
        }}>
          Changer le mot de passe
        </h2>

        <form onSubmit={handleSubmitPassword}>
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="old_password" style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#4a5568"
            }}>
              Ancien mot de passe
            </label>
            <input
              type="password"
              id="old_password"
              name="old_password"
              value={passwordData.old_password}
              onChange={handlePasswordChange}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "16px",
                transition: "border-color 0.2s",
                outline: "none"
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="new_password" style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#4a5568"
            }}>
              Nouveau mot de passe
            </label>
            <input
              type="password"
              id="new_password"
              name="new_password"
              value={passwordData.new_password}
              onChange={handlePasswordChange}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "16px",
                transition: "border-color 0.2s",
                outline: "none"
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="confirm_password" style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#4a5568"
            }}>
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              id="confirm_password"
              name="confirm_password"
              value={passwordData.confirm_password}
              onChange={handlePasswordChange}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "16px",
                transition: "border-color 0.2s",
                outline: "none"
              }}
              required
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: "#3498db",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.2s",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            Modifier
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;