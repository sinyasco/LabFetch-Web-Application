import React, { useState } from "react";
import "./AjouterChercheur.css";

const AjouterChercheur = ({ userRole }) => {
  const [formData, setFormData] = useState({
    nomComplet: "",
    matricule: "",
    email: "",
    qualite: "",
    telephone: "",
    etablissement: "",
    grade: "",
    equipe: "",
    lienDblp: "",
    lienGoogleScholar: "",
    lienLinkedin: "",
    lienResearchGate: "",
    H_index: ""
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState({});

  const qualiteOptions = ["Enseignant-Chercheur", "Chercheur", "Doctorant"];
  const equipeOptions = ["Co Design", "EIAH", "Image", "MSI", "OPT", "SURES"];
  const gradeOptions = {
    "Enseignant-Chercheur": ["Attaché de recherche", "Chargé de recherche", "Directeur de recherche"],
    "Chercheur": ["Attaché de recherche", "Chargé de recherche", "Directeur de recherche"],
    "Doctorant": ["Null"]
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "qualite" && { grade: value === "Doctorant" ? "Null" : "" })
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Only name and email are required
    if (!formData.nomComplet.trim()) newErrors.nomComplet = "Le nom complet est requis";
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format d'email invalide";
    }

    // URL validations (optional fields)
    const urlFields = ["lienDblp", "lienGoogleScholar", "lienLinkedin", "lienResearchGate"];
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w.-]*)*\/?$/;

    urlFields.forEach(field => {
      if (formData[field] && !urlRegex.test(formData[field])) {
        newErrors[field] = "URL invalide";
      }
    });

    // Phone validation (optional)
    if (formData.telephone && !/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/.test(formData.telephone)) {
      newErrors.telephone = "Format de téléphone invalide";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  const confirmSubmit = async () => {
    try {
      // Insert into chercheur table
      const chercheurResponse = await fetch('http://localhost:5000/api/add-chercheur', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom_complet: formData.nomComplet
        })
      });
  
      if (!chercheurResponse.ok) throw new Error('Failed to add chercheur');
  
      const chercheurData = await chercheurResponse.json();
      const chercheurId = chercheurData.chercheur_id;
  
      // Insert into chercheur_lmcs with statut='non actif'
      const chercheurLmcsResponse = await fetch('http://localhost:5000/api/add-chercheur-lmcs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chercheur_id: chercheurId,
          nom_complet: formData.nomComplet,
          email: formData.email,
          telephone: formData.telephone || null,
          etablissement: formData.etablissement || null,
          qualite: formData.qualite || null,
          grade: formData.grade || null,
          h_index: formData.H_index || null,
          matricule: formData.matricule || null,
          equipe: formData.equipe || null,
          dblp: formData.lienDblp || null,
          scholar: formData.lienGoogleScholar || null,
          linkedin: formData.lienLinkedin || null,
          researchgate: formData.lienResearchGate || null,
          statut: 'non actif' // Set initial status
        })
      });
  
      if (!chercheurLmcsResponse.ok) throw new Error('Failed to add chercheur details');
  
      // Insert into utilisateur with empty password
      const utilisateurResponse = await fetch('http://localhost:5000/api/add-utilisateur', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chercheur_id: chercheurId,
          nom: formData.nomComplet,
          email: formData.email,
          role: 'chercheur'
        })
      });
  
      if (!utilisateurResponse.ok) throw new Error('Failed to add user account');

  // Now, fetch author publications from our Python API
      
  try {
    const authorResponse = await fetch('http://localhost:5000/api/author', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nomComplet: formData.nomComplet
      })
    });
    
    if (authorResponse.ok) {
      const authorData = await authorResponse.json();
      console.log('Fetched author publications:', authorData);
      // Here you could store the publications data if needed
    } else {
      console.warn('Warning: Could not fetch publications, but user was created');
      // Non-critical error, don't prevent user creation
    }
  } catch (pubError) {
    console.warn('Warning: Error fetching publications:', pubError);
    // Continue without throwing an error as this is not critical
  }


  
      // Reset form on success
      setFormData({
        nomComplet: "",
        matricule: "",
        email: "",
        qualite: "",
        telephone: "",
        etablissement: "",
        grade: "",
        equipe: "",
        lienDblp: "",
        lienGoogleScholar: "",
        lienLinkedin: "",
        lienResearchGate: "",
        H_index: ""
      });
  
      alert('Chercheur ajouté avec succès! Un administrateur doit activer le compte.');
    } catch (error) {
      console.error('Error adding researcher:', error);
      alert('Une erreur est survenue: ' + error.message);
    } finally {
      setShowConfirmation(false);
    }
  };

  const cancelSubmit = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="nouveau-chercheur-container">
      <h2>Nouveau chercheur</h2>
      <form onSubmit={handleSubmit} className="chercheur-form">
        <div className="form-row">
          <div className="form-field">
            <label>Nom complet*</label>
            <input
              type="text"
              name="nomComplet"
              placeholder="nom complet"
              value={formData.nomComplet}
              onChange={handleChange}
              className={errors.nomComplet ? "input-error" : ""}
              required
            />
            {errors.nomComplet && <span className="error-message">{errors.nomComplet}</span>}
          </div>
          <div className="form-field">
            <label>Matricule</label>
            <input
              type="text"
              name="matricule"
              placeholder="matricule"
              value={formData.matricule}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Email*</label>
            <input
              type="email"
              name="email"
              placeholder="nom@esi.dz"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "input-error" : ""}
              required
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          <div className="form-field">
            <label>Qualité</label>
            <select
              name="qualite"
              value={formData.qualite}
              onChange={handleChange}
            >
              <option value="">Sélectionner une qualité</option>
              {qualiteOptions.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Téléphone</label>
            <input
              type="text"
              name="telephone"
              placeholder="telephone"
              value={formData.telephone}
              onChange={handleChange}
              className={errors.telephone ? "input-error" : ""}
            />
            {errors.telephone && <span className="error-message">{errors.telephone}</span>}
          </div>
          <div className="form-field">
            <label>Établissement d'origine</label>
            <input
              type="text"
              name="etablissement"
              placeholder="etablissement d'origine"
              value={formData.etablissement}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Grade de recherche</label>
            <select
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              disabled={formData.qualite === "Doctorant"}
            >
              <option value="">Sélectionner un grade</option>
              {formData.qualite && gradeOptions[formData.qualite]?.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Équipe</label>
            <select
              name="equipe"
              value={formData.equipe}
              onChange={handleChange}
            >
              <option value="">Sélectionner une équipe</option>
              {equipeOptions.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>H_index</label>
            <input
              type="number"
              name="H_index"
              placeholder="h_index"
              value={formData.H_index}
              onChange={handleChange}
            />
          </div>
          <div className="form-field">
            <label>Lien DBLP</label>
            <input
              type="text"
              name="lienDblp"
              placeholder="lien DBLP"
              value={formData.lienDblp}
              onChange={handleChange}
              className={errors.lienDblp ? "input-error" : ""}
            />
            {errors.lienDblp && <span className="error-message">{errors.lienDblp}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Lien Google Scholar</label>
            <input
              type="text"
              name="lienGoogleScholar"
              placeholder="lien Google Scholar"
              value={formData.lienGoogleScholar}
              onChange={handleChange}
              className={errors.lienGoogleScholar ? "input-error" : ""}
            />
            {errors.lienGoogleScholar && <span className="error-message">{errors.lienGoogleScholar}</span>}
          </div>
          <div className="form-field">
            <label>Lien LinkedIn</label>
            <input
              type="text"
              name="lienLinkedin"
              placeholder="lien Linkedin"
              value={formData.lienLinkedin}
              onChange={handleChange}
              className={errors.lienLinkedin ? "input-error" : ""}
            />
            {errors.lienLinkedin && <span className="error-message">{errors.lienLinkedin}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Lien ResearchGate</label>
            <input
              type="text"
              name="lienResearchGate"
              placeholder="lien ResearchGate"
              value={formData.lienResearchGate}
              onChange={handleChange}
              className={errors.lienResearchGate ? "input-error" : ""}
            />
            {errors.lienResearchGate && <span className="error-message">{errors.lienResearchGate}</span>}
          </div>
        </div>

        <div className="button-container">
          <button type="submit" className="ajouter-btn">Ajouter</button>
        </div>
      </form>

      {showConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <h3>Vérification des informations</h3>
            <div className="confirmation-content">
              <div className="confirmation-item">
                <span className="confirmation-label">Nom complet:</span>
                <span className="confirmation-value">{formData.nomComplet}</span>
              </div>
              <div className="confirmation-item">
                <span className="confirmation-label">Email:</span>
                <span className="confirmation-value">{formData.email}</span>
              </div>
              {formData.matricule && (
                <div className="confirmation-item">
                  <span className="confirmation-label">Matricule:</span>
                  <span className="confirmation-value">{formData.matricule}</span>
                </div>
              )}
              {formData.qualite && (
                <div className="confirmation-item">
                  <span className="confirmation-label">Qualité:</span>
                  <span className="confirmation-value">{formData.qualite}</span>
                </div>
              )}
              {formData.telephone && (
                <div className="confirmation-item">
                  <span className="confirmation-label">Téléphone:</span>
                  <span className="confirmation-value">{formData.telephone}</span>
                </div>
              )}
              {formData.etablissement && (
                <div className="confirmation-item">
                  <span className="confirmation-label">Établissement:</span>
                  <span className="confirmation-value">{formData.etablissement}</span>
                </div>
              )}
              {formData.grade && (
                <div className="confirmation-item">
                  <span className="confirmation-label">Grade:</span>
                  <span className="confirmation-value">{formData.grade}</span>
                </div>
              )}
              {formData.equipe && (
                <div className="confirmation-item">
                  <span className="confirmation-label">Équipe:</span>
                  <span className="confirmation-value">{formData.equipe}</span>
                </div>
              )}
              {formData.H_index && (
                <div className="confirmation-item">
                  <span className="confirmation-label">H_index:</span>
                  <span className="confirmation-value">{formData.H_index}</span>
                </div>
              )}
              {formData.lienDblp && (
                <div className="confirmation-item">
                  <span className="confirmation-label">Lien DBLP:</span>
                  <span className="confirmation-value">{formData.lienDblp}</span>
                </div>
              )}
              {formData.lienGoogleScholar && (
                <div className="confirmation-item">
                  <span className="confirmation-label">Lien Google Scholar:</span>
                  <span className="confirmation-value">{formData.lienGoogleScholar}</span>
                </div>
              )}
              {formData.lienLinkedin && (
                <div className="confirmation-item">
                  <span className="confirmation-label">Lien LinkedIn:</span>
                  <span className="confirmation-value">{formData.lienLinkedin}</span>
                </div>
              )}
              {formData.lienResearchGate && (
                <div className="confirmation-item">
                  <span className="confirmation-label">Lien ResearchGate:</span>
                  <span className="confirmation-value">{formData.lienResearchGate}</span>
                </div>
              )}
            </div>
            <div className="confirmation-message">
              <p>Veuillez vérifier les informations ci-dessus. Vous pouvez confirmer l'ajout ou retourner au formulaire pour effectuer des modifications.</p>
            </div>
            <div className="confirmation-buttons">
              <button className="confirm-btn" onClick={confirmSubmit}>Confirmer</button>
              <button className="cancel-btn" onClick={cancelSubmit}>Modifier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AjouterChercheur;