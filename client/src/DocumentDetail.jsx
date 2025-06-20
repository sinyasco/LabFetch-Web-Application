import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faFilePdf,
  faPenToSquare,
  faSave,
  faTimes,
  faTrash,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { faFile } from "@fortawesome/free-solid-svg-icons";
import "./DocumentDetail.css";

export default function DocumentDetail({ isDirector, isAssistant }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [publication, setPublication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authors, setAuthors] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPublication, setEditedPublication] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // State for handling the dropdown
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const [allResearchers, setAllResearchers] = useState([]);
  const [loadingResearchers, setLoadingResearchers] = useState(false);

  // NEW: Add state to track authors marked for removal
  const [authorsToRemove, setAuthorsToRemove] = useState([]);
  // NEW: Add state to track authors that have been replaced
  const [replacedAuthors, setReplacedAuthors] = useState({});

  //const [isAuthor, setIsAuthor] = useState(null);

// Add to your existing state declarations
const [showAddAuthorDropdown, setShowAddAuthorDropdown] = useState(false);
const [newAuthorId, setNewAuthorId] = useState(null);
// Add this state
const [isAddingAuthor, setIsAddingAuthor] = useState(false);

// Add these states
const [isUploading, setIsUploading] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);

// Add to your existing state
const [pendingPdf, setPendingPdf] = useState(null);
const [pendingPdfAction, setPendingPdfAction] = useState(null); // 'upload' or 'replace'

const [pendingPdfRemoval, setPendingPdfRemoval] = useState(false);

// Replace your handleAddAuthor function with this:
const handleAddAuthor = async (chercheurId) => {
  setIsAddingAuthor(true);
  try {
    const response = await fetch('http://localhost:5000/api/publication/add-author', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chercheur_id: chercheurId,
        pub_id: id
      })
    });

    if (!response.ok) {
      throw new Error("Failed to add author");
    }

    // Immediately update the UI optimistically
    const newResearcher = allResearchers.find(r => r.id === chercheurId);
    if (newResearcher) {
      setAuthors(prev => [...prev, {
        chercheur_id: newResearcher.id,
        nom_complet: newResearcher.nom_complet,
        intern: 1
      }]);
    }

    // Then verify with the server
    const updatedAuthors = await fetch(`http://localhost:5000/api/Authors/${id}`)
      .then(res => res.json());
    setAuthors(updatedAuthors);
    
  } catch (error) {
    console.error("Error adding author:", error);
    alert("Erreur lors de l'ajout de l'auteur");
    // Revert if there was an error
    const updatedAuthors = await fetch(`http://localhost:5000/api/Authors/${id}`)
      .then(res => res.json());
    setAuthors(updatedAuthors);
  } finally {
    setIsAddingAuthor(false);
    setShowAddAuthorDropdown(false);
  }
};
  /*
  useEffect(() => {
      const fetchCurrentUser = async () => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user?.chercheur_id) {
          //setCurrentUserChercheurId(user.chercheur_id);
          fetch(`http://localhost:5000/is-Author?chercheur_id=${user.chercheur_id}&pub_id=${id}`)
          .then((res) => res.json())
          .then((data) => {
            setIsAuthor(data.exists);
          })
          .catch((err) => {
            console.error("Error checking author:", err);
            setIsAuthor(false); // default to false on error
          });
        } else {console.log("Error fetching user's chercheur_id");}
      };
      fetchCurrentUser();
    }, []);
    */

    useEffect(() => {
      const fetchPublication = async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/publication/${id}`);
          if (!response.ok) throw new Error("Publication not found");
    
          const data = await response.json();
          // Parse classification fields
          ["Scimago", "CORE", "DGRSDT", "Qualis"].forEach((key) => {
            if (data[key]) {
              try {
                data[key] = typeof data[key] === 'string' ? JSON.parse(data[key]) : data[key];
              } catch (e) {
                console.error(`Error parsing ${key}:`, e);
                data[key] = { quartile: null }; // Default structure if parsing fails
              }
            } else {
              data[key] = { quartile: null }; // Ensure all systems have the same structure
            }
          });
    
          setPublication(data);
          setEditedPublication(data);
        } catch (error) {
          console.error("Error fetching document:", error);
        } finally {
          setLoading(false);
        }
      };
    
      fetchPublication();
    }, [id]);

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/Authors/${id}`);
        if (!response.ok) throw new Error("Authors not found");

        const data = await response.json();
        setAuthors(data);
      } catch (error) {
        console.error("Error fetching authors:", error);
      }
    };

    fetchAuthors();
  }, [id]);

  // Reset states when leaving edit mode
  useEffect(() => {
    if (!isEditing) {
      setActiveDropdownIndex(null);
      setAuthorsToRemove([]); // Reset removal list
      setReplacedAuthors({}); // Reset replaced authors
    }
  }, [isEditing]);

  // Function to toggle dropdown and fetch researchers when needed
  const toggleDropdown = (index) => {
    if (activeDropdownIndex === index) {
      setActiveDropdownIndex(null);
    } else {
      setActiveDropdownIndex(index);
      fetchAllResearchers();
    }
  };

  // Function to fetch all researchers for dropdown
  const fetchAllResearchers = async () => {
    if (allResearchers.length > 0) return; // Only fetch if not already loaded

    setLoadingResearchers(true);
    try {
      const response = await fetch("http://localhost:5000/api/chercheurs_lmcs");
      if (!response.ok) throw new Error("Failed to fetch researchers");

      const data = await response.json();
      setAllResearchers(data);
    } catch (error) {
      console.error("Error fetching researchers:", error);
    } finally {
      setLoadingResearchers(false);
    }
  };

  // Function to mark an author for replacement and store the new author data
  const replaceAuthor = (authorIndex, newResearcherId) => {
    const selectedResearcher = allResearchers.find(r => r.id === newResearcherId);
    if (!selectedResearcher) return;
  
    setReplacedAuthors(prev => ({
      ...prev,
      [authorIndex]: {
        chercheur_id: selectedResearcher.id,
        nom_complet: selectedResearcher.nom_complet,
        intern: 1
      }
    }));
    setActiveDropdownIndex(null);
  };

  // MODIFIED: Function to mark an author for removal instead of removing immediately
  const markAuthorForRemoval = (authorIndex) => {
    setAuthorsToRemove(
      (prev) =>
        prev.includes(authorIndex)
          ? prev.filter((idx) => idx !== authorIndex) // Toggle off if already marked
          : [...prev, authorIndex] // Add to list if not marked
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedPublication(prev => ({
      ...prev,
      [name]: value === "" ? "0" : value // Handle empty thematique as "0"
    }));
  };

  const handleClassificationChange = (system, value) => {
    setEditedPublication(prev => {
      const updatedClassement = {
        ...prev[system],
        quartile: value
      };
      
      return {
        ...prev,
        [system]: updatedClassement
      };
    });
  };

  const cancelEdit = () => {
    setEditedPublication(publication);
    setIsEditing(false);
    setAuthorsToRemove([]);
    setReplacedAuthors({});
    setPendingPdf(null); // Clear pending PDF on cancel
    setPendingPdfAction(null);
  };

  // MODIFIED: Updated save function to handle author changes
  const saveChanges = async () => {
    try {
      setSaving(true);
      
      // 1. First handle PDF upload if there's a pending one
      if (pendingPdf) {
        const formData = new FormData();
        formData.append('pdf', pendingPdf);
  
        const uploadResponse = await fetch(
          `http://localhost:5000/api/publication/${id}/upload-pdf`, 
          {
            method: 'POST',
            body: formData
          }
        );
  
        if (!uploadResponse.ok) {
          throw new Error("Échec du téléchargement du PDF");
        }
      }
  
      // 2. Update publication basic info
      const publicationResponse = await fetch(
        `http://localhost:5000/api/publication/${id}`, 
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...editedPublication,
            thematique: editedPublication.thematique || null
          })
        }
      );
  
      if (!publicationResponse.ok) {
        throw new Error("Échec de la mise à jour de la publication");
      }

      // 3. Update classements if they exist in editedPublication
      if (editedPublication.Scimago || editedPublication.CORE || 
          editedPublication.DGRSDT || editedPublication.Qualis) {
        const classementsResponse = await fetch(
          `http://localhost:5000/api/publication/${id}/classements`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Scimago: editedPublication.Scimago,
              CORE: editedPublication.CORE,
              DGRSDT: editedPublication.DGRSDT,
              Qualis: editedPublication.Qualis
            })
          }
        );

        if (!classementsResponse.ok) {
          throw new Error("Échec de la mise à jour des classements");
        }
      }
  
      // 4. Update authors if there are changes
      if (authorsToRemove.length > 0 || Object.keys(replacedAuthors).length > 0) {
        const authorsResponse = await fetch(
          `http://localhost:5000/api/publication/${id}/authors`, 
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              removedAuthors: authorsToRemove.map(index => authors[index].chercheur_id),
              replacedAuthors: Object.entries(replacedAuthors).map(([index, newAuthor]) => ({
                oldAuthorId: authors[index].chercheur_id,
                newAuthorId: newAuthor.chercheur_id
              }))
            })
          }
        );
  
        if (!authorsResponse.ok) {
          throw new Error("Échec de la mise à jour des auteurs");
        }
      }
  
      // 5. Refresh all data from server
      const [updatedPub, updatedAuthors] = await Promise.all([
        fetch(`http://localhost:5000/api/publication/${id}`)
          .then(res => res.json()),
        fetch(`http://localhost:5000/api/Authors/${id}`)
          .then(res => res.json())
      ]);
  
      // Parse classification fields
      ["Scimago", "CORE", "DGRSDT", "Qualis"].forEach((key) => {
        if (updatedPub[key] && typeof updatedPub[key] === "string") {
          try {
            updatedPub[key] = JSON.parse(updatedPub[key]);
          } catch (e) {
            console.error(`Error parsing ${key}:`, e);
          }
        }
      });
  
      // Update all states
      setPublication(updatedPub);
      setEditedPublication(updatedPub);
      setAuthors(updatedAuthors);
      
      // Reset all edit states
      setIsEditing(false);
      setAuthorsToRemove([]);
      setReplacedAuthors({});
      setPendingPdf(null);
      setPendingPdfAction(null);
      
      alert("Modifications enregistrées avec succès !");
    } catch (error) {
      console.error("Save error:", error);
      alert(`Erreur lors de la sauvegarde: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    try {
      // Here you would add the actual API call to delete the publication
      // For example:
      const response = await fetch(`http://localhost:5000/api/publications/${id}`, {
         method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Failed to delete publication with id : ${id}`);
      alert("Publication deleted successfully!");
      navigate(-1); // Navigate back after deletion
    } catch (error) {
      console.error("Error deleting publication:", error);
      alert("Failed to delete publication");
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

// PDF Upload Handler
const handlePdfUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    alert('Seuls les fichiers PDF sont acceptés');
    return;
  }

  setPendingPdf(file);
  setPendingPdfAction(publication.has_pdf ? 'replace' : 'upload');
};

  if (loading) {
    return <p>Loading document...</p>;
  }

  if (!publication) {
    return <p>Publication not found.</p>;
  }

  const classificationOptions = ["Q1", "Q2", "Q3", "Q4", "A", "B", "C"];

  const isAllowed = isDirector || isAssistant;

  return (
    <div className="document-page">
      <div className="document-container">
        <div className="document-header">
          <button onClick={() => navigate(-1)} className="back-link">
            <FontAwesomeIcon icon={faArrowLeft} /> Retour
          </button>
          {isAllowed && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="edit-button" style={{marginRight:"-600px"}}>
              <FontAwesomeIcon icon={faPenToSquare} /> Modifier
            </button>
          )}
          {isAllowed && !isEditing && (
            <button onClick={handleDeleteClick} className="delete-button">
              <FontAwesomeIcon icon={faTrash} /> Supprimer
            </button>
          )}
          {showDeleteConfirmation && (
            <div className="delete-confirmation-overlay">
              <div className="delete-confirmation-modal">
                <h3>Confirmer la suppression</h3>
                <p>Êtes-vous sûr de vouloir supprimer cette publication?</p>
                <div className="confirmation-buttons">
                  <button
                    onClick={confirmDelete}
                    className="confirm-delete-button"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirmation(false)}
                    className="cancel-delete-button"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}
          {isEditing && isAllowed && (
            <div className="edit-actions">
              <button
                onClick={saveChanges}
                className="save-button"
                disabled={saving}
              >
                <FontAwesomeIcon icon={faSave} />{" "}
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
              <button onClick={cancelEdit} className="cancel-button">
                <FontAwesomeIcon icon={faTimes} /> Annuler
              </button>
            </div>
          )}
        </div>

        <div className="document-content">
          <div className="document-left">
            <div className="info-tot">
              <div className="document-preview">
                <div className="pdf-icon">
                  <FontAwesomeIcon
                    icon={faFile}
                    style={{ width: 90, height: 105, color: "black" }}
                    className="pdf-icon-style"
                  />
                </div>
                <div className="document-info">
                  {isEditing ? (
                    <input
                      type="text"
                      name="titre"
                      value={editedPublication.titre}
                      onChange={handleInputChange}
                      className="edit-input title-input"
                    />
                  ) : (
                    <h2>{publication.titre}</h2>
                  )}

<div className="authors">
      {authors.length > 0 ? (
        authors.map((author, index) => {
          const isMarkedForRemoval = authorsToRemove.includes(index);
          const replacementData = replacedAuthors[index];

          const displayName = replacementData
            ? replacementData.nom_complet
            : author.nom_complet;

          const authorStyle = {
            color: isMarkedForRemoval
              ? "red"
              : replacementData
              ? "blue"
              : "inherit",
            textDecoration: isMarkedForRemoval ? "line-through" : "none",
            cursor:
              isEditing || isMarkedForRemoval
                ? "default"
                : author.intern === 1
                ? "pointer"
                : "default",
          };

          const isClickable =
            author.intern === 1 && !isEditing && !isMarkedForRemoval;

          return (
            <span key={index} style={{ position: "relative" }}>
              <span
                onClick={() => {
                  if (isClickable) {
                    navigate(`/chercheurs/${author.chercheur_id}`);
                  }
                }}
                className={`author-link ${isClickable ? "clickable" : ""}`}
                style={authorStyle}
              >
                {displayName}
              </span>

              {isAllowed && isEditing && (
                <>
                  <span
                    className="dropdown-icon"
                    onClick={() => toggleDropdown(index)}
                  >
                    ▼
                  </span>
                  <span
                    className="close-icon"
                    onClick={() => markAuthorForRemoval(index)}
                  >
                    ×
                  </span>
                </>
              )}

                {isAllowed &&
                  isEditing &&
                  activeDropdownIndex === index && (
                    <ul className="dropdown-list">
                      {loadingResearchers ? (
                        <li>Chargement...</li>
                      ) : allResearchers.length > 0 ? (
                        allResearchers.map((researcher) => (
                          <li
                            key={researcher.id}
                            onClick={() => replaceAuthor(index, researcher.id)}
                          >
                            {researcher.nom_complet}
                          </li>
                        ))
                      ) : (
                        <li>Aucun chercheur trouvé</li>
                      )}
                    </ul>
                )}

              {index < authors.length - 1 ? ", " : ""}
            </span>
          );
        })
      ) : (
        <span>Auteurs inconnus</span>
      )}
  

    {isEditing && isAllowed && (
  <span className="author-add-container">
    <span 
      className="add-author-icon"
      onClick={() => {
        if (isAddingAuthor) return;
        setShowAddAuthorDropdown(!showAddAuthorDropdown);
        if (allResearchers.length === 0) fetchAllResearchers();
      }}
      title="Ajouter un auteur"
    >
      {isAddingAuthor ? '...' : '+'}
    </span>

    {showAddAuthorDropdown && (
      <ul className="dropdown-list author-dropdown">
        {loadingResearchers ? (
          <li>Chargement...</li>
        ) : allResearchers.length > 0 ? (
          allResearchers
            .filter(researcher => 
              !authors.some(a => a.chercheur_id === researcher.id)
            )
            .map(researcher => (
              <li
                key={researcher.id}
                onClick={() => handleAddAuthor(researcher.id)}
                disabled={isAddingAuthor}
              >
                {researcher.nom_complet}
              </li>
            ))
        ) : (
          <li>Aucun chercheur disponible</li>
        )}
      </ul>
    )}
  </span>
)}
</div>
                  <div style={{ fontSize: 12 }} className="info">
                    Date :
                    {isEditing ? (
                      <input
                        type="text"
                        name="Annee"
                        value={editedPublication.Annee || ""}
                        onChange={handleInputChange}
                        className="edit-input small-input"
                      />
                    ) : (
                      publication.Annee || "-"
                    )}
                  </div>
                  <div style={{ fontSize: 12 }} className="info">
                    Volume :
                    {isEditing ? (
                      <input
                        type="text"
                        name="volume"
                        value={editedPublication.volume || ""}
                        onChange={handleInputChange}
                        className="edit-input small-input"
                      />
                    ) : (
                      publication.volume || "-"
                    )}
                  </div>
                  <div style={{ fontSize: 12 }} className="info sp">
                    Pages :
                    {isEditing ? (
                      <input
                        type="text"
                        name="nombre_pages"
                        value={editedPublication.nombre_pages || ""}
                        onChange={handleInputChange}
                        className="edit-input small-input"
                      />
                    ) : (
                      publication.nombre_pages || "-"
                    )}
                  </div>
                </div>
              </div>
              {publication.conf_id !== null &&(
              <div className="info_conf_jrnl">
                <div className="cote_gauche">
                  {/* For periode field - enhanced version */}
                  <div>
                    <h4>Période:</h4>
                    {isEditing ? (
                      <input
                        type="text"
                        name="periode"
                        value={editedPublication.periode || ""}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <p>{publication.periode || "-"}</p>
                    )}
                  </div>
                  <div>
                    <h4>Périodicité:</h4>
                    {isEditing ? (
                      <input
                        type="text"
                        name="periodicite"
                        value={editedPublication.periodicite || ""}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <p>{publication.periodicite || "-"}</p>
                    )}
                  </div>
                </div>
                <div className="cote_droit">
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        name="type"
                        value={editedPublication.type || "Conférence/Journal"}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <h4>{publication.type || "Conférence/Journal"}</h4>
                    )}
                  </div>
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        name="nom"
                        value={editedPublication.nom || "Conférence/Journal"}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <p>{publication.nom || "-"}</p>
                    )}
                  </div>
                  <div>
                    <h4>Lieu</h4>
                    {isEditing ? (
                      <input
                        type="text"
                        name="lieu"
                        value={editedPublication.lieu || ""}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <p>{publication.lieu || "-"}</p>
                    )}
                  </div>
                  <div>
                    <h4>Thématique</h4>
                    {isEditing ? (
                      <input
                        type="text"
                        name="thematique"
                        value={editedPublication.thematique === "0" ? "" : editedPublication.thematique || ""}
                        onChange={handleInputChange}
                        className="edit-input"
                      />
                    ) : (
                      <p>{publication.thematique === "0" ? "-" : publication.thematique || "-"}</p>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
          <div className="document-right">
          {publication.conf_id !== null &&(
            <div className="classement-section">
              <h3>Classement</h3>
              <div className="classement-list">
                {["Scimago", "CORE", "DGRSDT", "Qualis"].map((key) => (
                  <div key={key} className="classement-item">
                    <div className="classement-name">{key}</div>
                    <div className="classement-value">
                      {isEditing ? (
                        <select
                          value={editedPublication[key]?.quartile || ""}
                          onChange={(e) =>
                            handleClassificationChange(key, e.target.value)
                          }
                          className="classification-select"
                        >
                          <option value="">-</option>
                          {classificationOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : publication[key]?.quartile ? (
                        <span
                          className={`badge ${publication[
                            key
                          ].quartile.toLowerCase()}`}
                        >
                          {publication[key].quartile}
                        </span>
                      ) : (
                        <span className="badge default-rank">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
            <div className="vers-btn">
              {isEditing ? (<h4>Lien vers la publication</h4>): (<></>)}
              {isEditing ? (
                <input
                  type="text"
                  name="lien"
                  value={editedPublication.lien || ""}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="URL de la publication"
                />
              ) : (
                <button
                  onClick={() =>
                    publication.lien &&
                    window.open(
                      publication.lien,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  style={{
                    backgroundColor: publication.lien
                      ? "#1abc9c"
                      : "rgb(102, 112, 133)",
                    cursor: publication.lien ? "pointer" : "not-allowed",
                  }}
                  disabled={!publication.lien}
                >
                  Lien vers la publication
                </button>
              )}
            </div>
{/* PDF Section - Working Version */}
<div className="pdf-section">
  {isEditing ? (
    <>
      {publication.has_pdf && (
        <a
          href={`http://localhost:5000/api/publication/${id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="action-button pdf-view"
          style={{
            backgroundColor: "#1abc9c",
            cursor: "pointer",
            marginRight: "10px"
          }}
        >
          <FontAwesomeIcon icon={faFilePdf} /> Voir le PDF
        </a>
      )}
      <label className="action-button pdf-upload">
        <FontAwesomeIcon icon={faFilePdf} /> 
        {publication.has_pdf ? "Remplacer PDF" : "Insérer PDF"}
        <input
          type="file"
          accept="application/pdf"
          onChange={handlePdfUpload}
          style={{ display: 'none' }}
        />
      </label>
    </>
  ) : (
    
      <button
        onClick={() => {
          if (publication.has_pdf == true){
           window.open(
          `http://localhost:5000/api/publication/${id}/pdf`,
          '_blank',
          'noopener,noreferrer'
        )}}}
        className="action-button pdf-view"
        style={{
          backgroundColor: publication.has_pdf == true
            ? "#1abc9c"
            : "rgb(102, 112, 133)",
          cursor: publication.has_pdf == true ? "pointer" : "not-allowed",
        }}
      >
        <FontAwesomeIcon icon={faFilePdf} /> Voir le PDF
      </button>
    
  )}
  {isUploading && (
    <div style={{ marginTop: "10px" }}>
      <progress value={uploadProgress} max="100" />
      <span> {uploadProgress}%</span>
    </div>
  )}
</div>

          </div>
        </div>
        {publication.conf_id !== null &&(
        <div className="scope-section">
          <h3>Scope</h3>
          {isEditing ? (
            <textarea
              name="scope"
              value={editedPublication.scope || ""}
              onChange={handleInputChange}
              className="edit-textarea"
            />
          ) : (
            <p>
              {publication.scope ||
                "Aucune information sur le scope disponible."}
            </p>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
