import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Profile.css";

const Profile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const researcher = location.state?.researcher || {
    name: "Unknown",
    role: "N/A",
    email: "N/A",
    image: "/profil.jpg"
  };

  return (
    <div className="profile-container">
      <div className="profile-main">
        <section className="profile-section">
          <div className="profile-card">
            <img src= "/profil.jpg" alt={researcher.name} className="profile-image" />
            <div className="profile-title">
            <p><strong>Statut:</strong> {researcher.role}</p>
            <h2>{researcher.name}</h2>
            </div>
          </div>

          <div className="profile-info">
            <h3>Informations du profil</h3>
            <ul>
              <li><strong>Email:</strong> {researcher.email}</li>
              <li><strong>Matricule:</strong> 000001</li>
              <li><strong>Téléphone:</strong> 0543418799</li>
              <li><strong>Date de naissance:</strong> 07/10/1963</li>
              <li><strong>Date de recrutement:</strong> 12/01/2010</li>
              <li><strong>H_indice:</strong> 4</li>
            </ul>
          </div>
        </section>
      </div>

      {/* Right Sidebar for Documents */}
      <div className="documents-sidebar">
        <h3>Documents Récents</h3>
        <ul className="document-list">
          {[...Array(6)].map((_, index) => (
            <li key={index} className="document-item">
              <i className="fa-solid fa-file-pdf"></i> Automatic text summarization
            </li>
          ))}
        </ul>
        
       
      </div>
    </div>
  );
};

export default Profile;