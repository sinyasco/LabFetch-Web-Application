import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPhone,
  faEnvelope,
  faGraduationCap,
  faEllipsisVertical,
  faEdit
} from "@fortawesome/free-solid-svg-icons";
import {
  faGoogle,
  faResearchgate,
  faLinkedin,
} from "@fortawesome/free-brands-svg-icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "./ResearcherProfile.css";

export default function ResearcherProfile({ isDirector, isAssistant }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [researcher, setResearcher] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState("Aperçu");
  const [coAuthors, setCoAuthors] = useState({});
  const [collaborations, setCollaborations] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  // Fetch current user's chercheur_id
  const [currentUserChercheurId, setCurrentUserChercheurId] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.chercheur_id) {
        setCurrentUserChercheurId(user.chercheur_id);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch researcher details with fixed image handling
  useEffect(() => {
    const fetchResearcher = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/researchers/${id}`);
        const data = await response.json();
        setResearcher(data);

        // Handle image if exists
        if (data.image && data.image_mimetype) {
          try {
            // Convert base64 string to binary
            const binaryString = atob(data.image);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: data.image_mimetype });
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
          } catch (error) {
            console.error("Error processing image:", error);
            setImageUrl('/profil.jpg');
          }
        }
      } catch (error) {
        console.error("Error fetching researcher:", error);
      }
    };
    fetchResearcher();
  }, [id]);

  // Clean up Blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  // Fetch documents (publications)
  useEffect(() => {
    fetch(`http://localhost:5000/api/researcher/${id}/publications`)
      .then((response) => response.json())
      .then((data) => {
        setDocuments(data);
        data.forEach((doc) => {
          fetch(`http://localhost:5000/api/co_chercheurs/${id}/${doc.pub_id}`)
            .then((response) => response.json())
            .then((coAuthorsData) => {
              setCoAuthors((prevCoAuthors) => ({
                ...prevCoAuthors,
                [doc.pub_id]: coAuthorsData
                  .map((coAuthor) => coAuthor.nom_complet)
                  .join(", "),
              }));
            })
            .catch((error) => console.error("Error fetching co-authors:", error));
        });
      })
      .catch((error) => console.error("Error fetching documents:", error));
  }, [id]);

  // Fetch collaborations
  useEffect(() => {
    fetch(`http://localhost:5000/api/${id}/collaborations`)
      .then((response) => response.json())
      .then((data) => {
        setCollaborations(data);
      })
      .catch((error) => console.error("Error fetching collaborations:", error));
  }, [id]);

  const handleBackClick = () => navigate(-1);
  const handleDeleteClick = () => setShowConfirmModal(true);
  const handleCancelDelete = () => setShowConfirmModal(false);
  const handleDocumentClick = (doc) => {
    navigate(`/document/${doc.pub_id}`, { state: { publication: doc } });
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/deactivate-researcher', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chercheur_id: researcher.chercheur_id
        })
      });

      // Only check if request succeeded (status 200-299)
      if (!response.ok) throw new Error('Failed to deactivate');

      // Update UI
      //setResearcher(prev => ({ ...prev, statut: 0 }));
      setShowConfirmModal(false);
      alert('Researcher deactivated!');
    } catch (error) {
      console.error('Error:', error);
      alert('Deactivation failed');
    }
  };

  const handleEditProfile = () => {
    navigate(`/edit-profile/${researcher.chercheur_id}`);
  };

  // Utility function to handle null/undefined values
  const displayValue = (value) => {
    return value || "-";
  };

  if (!researcher) return <p>Loading researcher profile...</p>;

  const currentYear = new Date().getFullYear();
  const citationData = [
    { year: currentYear - 6, Publications: researcher.nb_pub6 || 0 },
    { year: currentYear - 5, Publications: researcher.nb_pub5 || 0 },
    { year: currentYear - 4, Publications: researcher.nb_pub4 || 0 },
    { year: currentYear - 3, Publications: researcher.nb_pub3 || 0 },
    { year: currentYear - 2, Publications: researcher.nb_pub2 || 0 },
    { year: currentYear - 1, Publications: researcher.nb_pub1 || 0 },
    { year: currentYear, Publications: researcher.nb_pub0 || 0 },
  ];

  return (
    <div className="researcher-profile-container">
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h3>Confirmez-vous la désactivation du chercheur ?</h3>
            <div className="modal-actions">
              <button className="confirm-button" onClick={handleConfirmDelete}>
                Oui
              </button>
              <button className="cancel-button" onClick={handleCancelDelete}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="profile-header">
        <button onClick={handleBackClick} className="back-link">
          <FontAwesomeIcon icon={faArrowLeft} /> retour
        </button>
        {isDirector && researcher.statut === 1 && (
          <button className="delete-button" onClick={handleDeleteClick}>
            Désactiver
          </button>
        )}
        <div className="profile-tabs">
          <button
            className={activeTab === "Aperçu" ? "active" : ""}
            onClick={() => setActiveTab("Aperçu")}
          >
            Aperçu
          </button>
          <button
            className={activeTab === "Documents" ? "active" : ""}
            onClick={() => setActiveTab("Documents")}
          >
            Documents
          </button>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-sidebar" style={{ position: 'relative' }}>
          {((researcher && currentUserChercheurId && researcher.chercheur_id &&
            currentUserChercheurId.toString() === researcher.chercheur_id.toString()) || isDirector || isAssistant) && (
              <button
                className="edit-profile-btn"
                onClick={handleEditProfile}
                style={{
                  position: 'absolute',  // Positions relative to profile-sidebar
                  top: '15px',           // 15px from top
                  right: '15px',         // 15px from right
                  zIndex: 10,            // Ensures it stays on top
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#2c7be5',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
            )}
          <div className="profile-image-section">
            <div className="profile-actions">
              <div className="profile-image">
                <img
                  src={imageUrl || '/profil.jpg'}
                  onError={(e) => { 
                    console.error("Error loading profile image");
                    e.target.src = "/profil.jpg"; 
                  }}
                  alt="Profile"
                />
              </div>
            </div>
            </div>

            <div className="profile-identity">
              <h2>{displayValue(researcher.nom_complet)}</h2>
              <p
                style={{
                  fontFamily: "Nunito Sans, sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: "normal",
                  color: "rgb(102, 102, 102)",
                  marginBottom:"20px"
                }}
              >
                {displayValue(researcher.qualite)}
              </p>
              <div className="profile-badges">
                <span className="badge google" onClick={() => researcher.scholar && window.open(researcher.scholar, "_blank", "noopener,noreferrer")} style={{ cursor: researcher.scholar ? "pointer" : "default" }} disabled={!researcher.scholar}>
                  <FontAwesomeIcon icon={faGoogle} />
                </span>
                <span className="badge research-gate" onClick={() => researcher.researchgate && window.open(researcher.researchgate, "_blank", "noopener,noreferrer")} style={{ cursor: researcher.researchgate ? "pointer" : "default" }} disabled={!researcher.researchgate}>
                  <FontAwesomeIcon icon={faResearchgate} />
                </span>
                <span className="badge scholar" onClick={() => researcher.dblp && window.open(researcher.dblp, "_blank", "noopener,noreferrer")} style={{ cursor: researcher.dblp ? "pointer" : "default" }} disabled={!researcher.dblp}>
                  <FontAwesomeIcon icon={faGraduationCap} />
                </span>
                <span className="badge linkedin" onClick={() => researcher.linkedin && window.open(researcher.linkedin, "_blank", "noopener,noreferrer")} style={{ cursor: researcher.linkedin ? "pointer" : "default" }} disabled={!researcher.linkedin}>
                  <FontAwesomeIcon icon={faLinkedin} />
                </span>
                <span className="badge talents" onClick={() => researcher.talent && window.open(researcher.talent, "_blank", "noopener,noreferrer")} style={{ cursor: researcher.talent ? "pointer" : "default" }} disabled={!researcher.talent}>
                  <FontAwesomeIcon icon={faGraduationCap} />
                </span>
              </div>
              <div className="profile-status">
                <span className="status-badge">{researcher.statut ? "Actif" : "Non Actif"}</span>
              </div>
            </div>

            <div className="profile-contact-info">
              <div className="contact-item">
                <FontAwesomeIcon icon={faPhone} />
                <span>Téléphone</span>
                <span className="contact-value">
                  {displayValue(researcher.telephone)}
                </span>
              </div>
              <div className="contact-item">
                <FontAwesomeIcon icon={faEnvelope} />
                <span>Email</span>
                <span className="contact-value">
                  {researcher.email ? (
                    <a href={`mailto:${researcher.email}`}>{researcher.email}</a>
                  ) : (
                    "-"
                  )}
                </span>
              </div>
              <div className="contact-item">
                <FontAwesomeIcon icon={faGraduationCap} />
                <span>Diplôme</span>
                <span className="contact-value">
                  {displayValue(researcher.diplome)}
                </span>
              </div>
            </div>

            <div className="profile-institution">
              <p>
                {researcher.etablissement || "LABORATOIRE LMCS, ESI, ALGER"}
              </p>
              <div className="matricule" style={{marginTop:"20px"}}>
                matricule : {researcher.matricule || "-"}

              </div>
            </div>
      
        </div>

        <div className="profile-details">
          {activeTab === "Aperçu" && (
            <>
              <div className="citations-section">
                <div className="citation-div">
                  <div className="citation-title">
                    <h3 style={{ fontSize: "15px", color: "black", fontFamily: "poppins" }}>productivité scientifique</h3>
                  </div>
                  <div className="citation-stats">
                    <div className="citation-stat ">
                      <span className="stat-value">
                        {displayValue(researcher.h_index)}
                      </span>
                      <span style={{ fontSize: "14px" }} className="stat-label">
                        Indice h
                      </span>
                    </div>
                    <div className="citation-stat">
                      <span className="stat-value">{displayValue(researcher.nb_pub)}</span>
                      <span style={{ fontSize: "14px" }} className="stat-label">
                        Publications
                      </span>
                    </div>
                  </div>
                </div>




                <div
                  className="citation-chartt"
                  style={{ backgroundColor: "white", borderRadius: "20px" }}
                >
                  <div className="citation-chartH">
                    <h2>Nombre de publications par année</h2>
                  </div>
                  {Number(researcher.nb_pub0) +
                    Number(researcher.nb_pub1) +
                    Number(researcher.nb_pub2) +
                    Number(researcher.nb_pub3) +
                    Number(researcher.nb_pub4) +
                    Number(researcher.nb_pub5) +
                    Number(researcher.nb_pub6) ===
                    0 ? (
                    <div
                      style={{
                        position: "relative",
                        height: "300px", // ou un pourcentage, selon le parent
                        width: "100%",
                      }}
                    >
                      <img
                        src="/noData.png"
                        alt="No data available"
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          maxWidth: "100%",
                          height: "300px",
                          objectFit: "cover",
                          paddingBottom:"40px"
                        }}
                      />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart
                        data={citationData}
                        margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient
                            id="barGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#9cafff"
                              stopOpacity={0.9}
                            />
                            <stop
                              offset="100%"
                              stopColor="#4643f7"
                              stopOpacity={0.8}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid stroke="none" />
                        <XAxis
                          dataKey="year"
                          tick={{ fill: "#667085", fontSize: 14 }}
                          axisLine={false}
                        />
                        <YAxis
                          domain={[0, "dataMax + 10"]}
                          tick={{ fill: "#667085", fontSize: 14 }}
                          axisLine={false}
                          tickFormatter={(value) => Math.round(value)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#f9f9f9",
                            borderRadius: "8px",
                            border: "none",
                          }}
                        />
                        <Bar
                          dataKey="Publications"
                          fill="url(#barGradient)"
                          radius={[10, 10, 0, 0]}
                          barSize={30}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}



                </div>

              </div>

              <div className="details-section">
                <div className="details-header">
                  <h3>Position scientifique</h3>
                </div>
                <div className="details-grid">
                  <div className="details-item">
                    <h4>Équipe</h4>
                    <p>{displayValue(researcher.equipe)}</p>
                  </div>
                  <div className="details-item">
                    <h4>Grade Recherche</h4>
                    <p>{displayValue(researcher.grade)}</p>
                  </div>
                </div>
              </div>

              <div className="collaborations-section">
                <h3>Collaborations</h3>
                <table className="collaborations-table">
                  <thead>
                    <tr>
                      <th>NOM COMPLET</th>
                      <th>ÉTAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collaborations.length > 0 ? (
                      collaborations.map((collab, index) => (
                        <tr
                          className={
                            collab.intern === 1 ? "clickable-item" : ""
                          }
                          style={{
                            cursor: collab.intern === 1 ? "pointer" : "default",
                          }}
                          key={index}
                          onClick={() => {
                            if (collab.intern == 1)
                              navigate(`/chercheurs/${collab.chercheur_id}`);
                          }}
                        >
                          <td>{displayValue(collab.nom_complet)}</td>
                          <td
                            className={`status-${collab.intern ? "intern" : "extern"
                              }`}
                          >
                            <span id="intern">
                              {collab.intern ? "Interne" : "Externe"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2">Aucune collaboration trouvée</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "Documents" && (
            <div className="documents-section">
              <h3>Documents</h3>
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Année</th>
                    <th>Pages</th>
                    <th>Conf/Journal</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <tr
                        key={doc.pub_id}
                        onClick={() => handleDocumentClick(doc)}
                      >
                        <td>{displayValue(doc.titre)}</td>
                        <td>{displayValue(doc.Annee)}</td>
                        <td>{displayValue(doc.nombre_pages)}</td>
                        <td>
                          <span className="document-type">
                            {displayValue(doc.conf_journal_name)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4">Aucun document disponible</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}