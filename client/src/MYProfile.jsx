import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEdit,
  faArrowLeft, 
  faPhone, 
  faEnvelope, 
  faGraduationCap 
} from '@fortawesome/free-solid-svg-icons';
import { 
  faGoogle,
  faResearchgate,
  faLinkedin
} from '@fortawesome/free-brands-svg-icons';
import './MyProfile.css';

export default function MYProfile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Aperçu');
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  // Find researcher by ID, default to first researcher if not found
  const researcher = {
    id: 1,
    name: "Koudil Mouloud",
    role: "Chercheur, Enseignant",
    email: "nom_ens@esi.dz",
    image: "/profil.jpg"
  };
  
  // Handle back button click
  const handleBackClick = () => {
    navigate(-1);
  };
  
  // Handle edit profile navigation
  const handleEditProfile = () => {
    navigate('/edit-profile');
  };
  
  // publications data for chart
  const citationData = [
    { year: '2018', citations: 70 },
    { year: '2019', citations: 110 },
    { year: '2020', citations: 195 },
    { year: '2021', citations: 150 },
    { year: '2022', citations: 80 },
    { year: '2023', citations: 60 },
    { year: '2024', citations: 110 }
  ];
  
  // Collaboration data
  const collaborations = [
    { name: 'Abderezzak Henni', email: 'nom_ens@esi.dz', status: 'interne' },
    { name: 'Anane Mohammed', email: 'nom_ens@esi.dz', status: 'interne' },
    { name: 'Fahima Nader', email: 'nom_ens@esi.dz', status: 'interne' },
    { name: 'Michel Occello', email: 'nom@gmail.com', status: 'externe' },
    { name: 'Jean-Paul Jamont', email: 'nom@gmail.com', status: 'externe' }
  ];
  
  // Documents data
  const documents = [
    { 
      id: 1,
      title: "A novel active learning method using SVM for text classification",
      authors: "M Koudil, M Guessoum, Z Guessoum",
      date: "24.11.2018",
      pages: 32,
      type: "article"
    },
    { 
      id: 2,
      title: "A novel active learning approach for multi-label classification",
      authors: "M Koudil, M Guessoum, Z Guessoum",
      date: "12.05.2019",
      pages: 28,
      type: "article"
    },
    { 
      id: 3,
      title: "Text classification using machine learning techniques",
      authors: "M Koudil, M Guessoum, Z Guessoum",
      date: "30.06.2020",
      pages: 45,
      type: "article"
    }
  ];

  const handleDocumentClick = (docId) => {
    setSelectedDocument(docId);
  };

  return (
    <div className="researcher-profile-container">
      <div className="profile-header">
        <button onClick={handleBackClick} className="back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> retour
        </button>
        
        <div className="profile-tabs">
          <button 
            className={activeTab === 'Aperçu' ? 'active' : ''} 
            onClick={() => setActiveTab('Aperçu')}
          >
            Aperçu
          </button>
          <button 
            className={activeTab === 'Documents' ? 'active' : ''} 
            onClick={() => setActiveTab('Documents')}
          >
            Documents
          </button>
        </div>
      </div>
      
      <div className="profile-content">
        <div className="profile-sidebar">
          <div className="profile-img-section">
            <div className="profile-actions">
              <div className="profile-image">
                <img src={researcher.image} alt={researcher.name} />
                <span className="status-indicator"></span>
              </div>
              <button 
                className="edit-btn" 
                onClick={handleEditProfile}
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
            </div>
            
            <div className="profile-identity">
              <h2>{researcher.name}</h2>
              <p className="profile-role">{researcher.role}</p>
              
              <div className="profile-badges">
                <span className="badge google">
                  <FontAwesomeIcon icon={faGoogle} /> 
                </span>
                <span className="badge research-gate">
                  <FontAwesomeIcon icon={faResearchgate} /> 
                </span>
                <span className="badge scholar">
                  <FontAwesomeIcon icon={faGraduationCap} /> 
                </span>
                <span className="badge linkedin">
                  <FontAwesomeIcon icon={faLinkedin} /> 
                </span>
              </div>
              
              <div className="profile-status">
                <span className="status-badge">Actif</span>
              </div>
            </div>
            
            <div className="profile-contact-info">
              <div className="contact-item">
                <FontAwesomeIcon icon={faPhone} />
                <span>Téléphone</span>
                <span className="contact-value">0537224511</span>
              </div>
              
              <div className="contact-item">
                <FontAwesomeIcon icon={faEnvelope} />
                <span>Email</span>
                <span className="contact-value">{researcher.email}</span>
              </div>
              
              <div className="contact-item">
                <FontAwesomeIcon icon={faGraduationCap} />
                <span>Diplôme</span>
                <span className="contact-value">ingenieur en informatique</span>
              </div>
            </div>
            
            <div className="profile-institution">
              <p>LABORATOIRE LMCS, ÉCOLE NATIONALE SUPÉRIEURE D'INFORMATIQUE, ESI, ALGER, ALGÉRIE</p>
            </div>
          </div>
        </div>
        
        <div className="profile-details">
          {activeTab === 'Aperçu' && (
            <>
              <div className="citations-section">
                <div className="citation-div">
                  <div className="citation-title">
                    <h3>Citations</h3>
                  </div>
                  <div className="citation-stats">
                    <div className="citation-stat sp">
                      <span className="stat-value">19</span>
                      <span className="stat-label">indice h</span>
                    </div>
                    <div className="citation-stat">
                      <span className="stat-value">1250</span>
                      <span className="stat-label">fois</span>
                    </div>
                  </div>
                </div>
                
                <div className="citation-chart">
                  {citationData.map((data, index) => (
                    <div className="chart-bar" key={index}>
                      <div 
                        className="bar" 
                        style={{ height: `${data.citations / 2}px` }}
                      ></div>
                      <div className="year">{data.year}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="details-section">
                <div className="details-header">
                  <h3>Détails</h3>
                  <div className="matricule">matricule : 08/0004</div>
                </div>
                
                <div className="details-grid">
                  <div className="details-item">
                    <h4>équipe</h4>
                    <p>CoDesign</p>
                  </div>
                  <div className="details-item">
                    <h4>Grade_Recherche</h4>
                    <p>Chargé de recherche</p>
                  </div>
                </div>
              </div>
              
              <div className="collaborations-section">
                <h3>Collaborations</h3>
                <table className="collaborations-table">
                  <thead>
                    <tr>
                      <th>NOM COMPLET</th>
                      <th>E-MAIL</th>
                      <th>ÉTAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collaborations.map((collab, index) => (
                      <tr key={index}>
                        <td>{collab.name}</td>
                        <td>{collab.email}</td>
                        <td className={`status-${collab.status}`}>{collab.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          
          {activeTab === 'Documents' && (
            <div className="documents-section">
              <h3>Documents</h3>
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Auteurs</th>
                    <th>Date de publication</th>
                    <th>Pages</th>
                    <th>Type</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, index) => (
                    <tr key={index} onClick={() => handleDocumentClick(doc.id)}>
                      <td>{doc.title}</td>
                      <td>{doc.authors}</td>
                      <td>{doc.date}</td>
                      <td>{doc.pages}</td>
                      <td>
                        <span className="document-type">{doc.type}</span>
                      </td>
                      <td className="action-cell">
                        <button className="action-button">...</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}