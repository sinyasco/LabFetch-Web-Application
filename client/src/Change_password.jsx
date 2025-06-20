import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './EditProfile.css';
import axios from 'axios';

function Change_password() {
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
  

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-main">
        {/* Password Update Form */}
        <form onSubmit={handleSubmitPassword} className="edit-profile-form">
            <div className="form-info">
            <div className="form-section">
                <h3>Changer le mot de passe</h3>
                <div className="form-row">
                <div className="form-group">
                    <label>Mot de passe actuel</label>
                    <input type="password" name="old_password" value={passwordData.old_password} onChange={handlePasswordChange} />
                </div>
                </div>
                <div className="form-row">
                <div className="form-group">
                    <label>Nouveau mot de passe</label>
                    <input type="password" name="new_password" value={passwordData.new_password} onChange={handlePasswordChange} />
                </div>
                <div className="form-group">
                    <label>Confirmer le nouveau mot de passe</label>
                    <input type="password" name="confirm_password" value={passwordData.confirm_password} onChange={handlePasswordChange} />
                </div>
                </div>
            </div>

            <div className="form-actions">
                <button type="submit" className="btn-submit">Changer le mot de passe</button>
            </div>
            </div>
        </form>
      </div>
    </div>
  );
}

export default Change_password;