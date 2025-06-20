import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
//import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import './EditProfile.css';
import './AjouterChercheur.css'
import { 
  faArrowLeft, 
  faPlus
} from "@fortawesome/free-solid-svg-icons";
import './EditProfile.css';
import './AjouterChercheur.css';
import axios from 'axios';

function EditProfile() {
  const navigate = useNavigate();
  const { chercheur_id } = useParams();
  const [authorized, setAuthorized] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    nom_complet: '',
    email: '',
    telephone: '',
    diplome: '',
    etablissement: '',
    qualite: '',
    grade: '',
    h_index: '',
    matricule: '',
    equipe: '',
    dblp: '',
    scholar: '',
    linkedin: '',
    researchgate: '',
    talent: '',
  });

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


  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user?.id) {
          navigate('/unauthorized');
          return;
        }

        const userChercheurId = user.chercheur_id;
        const userRole = user.role;

        const isSelf = String(userChercheurId) === String(chercheur_id);
        const isDirectorOrAssistant = userRole === 'directeur' || userRole === 'assistant';

        setIsSelf(isSelf);

        if (isSelf || isDirectorOrAssistant) {
          setAuthorized(true);
        } else {
          navigate('/unauthorized');
        }
      } catch (error) {
        console.error("Authorization error:", error);
        navigate('/unauthorized');
      }
    };
    checkAuthorization();
  }, [chercheur_id, navigate]);

  useEffect(() => {
    const fetchResearcherData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/researchers/${chercheur_id}`);
        const data = response.data;
        
        setFormData(data);
        
        // If there's an image, create a preview URL
        if (data.image) {
          try {
            const binaryString = atob(data.image);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: data.image_mimetype });
            const url = URL.createObjectURL(blob);
            setImagePreview(url);
          } catch (error) {
            console.error("Error processing image:", error);
            setImagePreview('/default-profile.png');
          }
        } else {
          setImagePreview('/default-profile.png');
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        navigate('/error');
      }
    };
    fetchResearcherData();
  }, [chercheur_id, navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Basic validation
      if (!file.type.match('image.*')) {
        alert('Only image files are allowed');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview('/default-profile.png');
    setSelectedFile(null);
    setRemoveImage(true);
    setUploadStatus({
      type: 'success',
      message: 'Image supprimée'
    });
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setUploadStatus(null);
    
    try {
      const formDataToSend = new FormData();
      
      // Append all form data
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Append image file if selected
      if (selectedFile) {
        formDataToSend.append('image', selectedFile);
      } else if (removeImage) {
        formDataToSend.append('removeImage', 'true');
      }
      
      setUploadStatus({
        type: 'loading',
        message: 'Envoi en cours...'
      });
      
      const response = await axios.put(
        `http://localhost:5000/api/researchers/${chercheur_id}`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data.success) {
        setUploadStatus({
          type: 'success',
          message: 'Profil mis à jour avec succès!'
        });
        setTimeout(() => {
          navigate(`/chercheurs/${chercheur_id}`);
        }, 1500);
      } else {
        throw new Error(response.data.error || "Échec de la mise à jour");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.details || 
               error.response?.data?.error || 
               "Erreur de mise à jour"
      });
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`http://localhost:5000/api/change-password/${chercheur_id}`, passwordData);
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

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-main">
        {authorized && (
          <form onSubmit={handleSubmitProfile} className="edit-profile-form">
            <div className="btn-cancel-container">
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                <FontAwesomeIcon icon={faArrowLeft} /> Retour
              </button>
            </div>
            
            {/* Image Upload with Plus Overlay */}
            <div className="image-upload-wrapper">
              <div className="profile-image-container">
                <img 
                  src={imagePreview || '/default-profile.png'} 
                  alt="Profile" 
                  className="profile-image"
                  onError={(e) => e.target.src = '../public/profil.jpg'}
                />
                <label className="plus-button-overlay">
                  <FontAwesomeIcon icon={faPlus} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden-file-input"
                  />
                </label>
              </div>
            </div>

            <div className="form-info">
              <div className="form-section">
                <h3>Informations Personnelles</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nom complet</label>
                    <input 
                      type="text" 
                      name="nom_complet" 
                      value={formData.nom_complet || ''} 
                      onChange={handleInputChange} 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email || ''} 
                      onChange={handleInputChange} 
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input 
                      type="tel" 
                      name="telephone" 
                      value={formData.telephone || ''} 
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Matricule</label>
                    <input 
                      type="text" 
                      name="matricule" 
                      value={formData.matricule || ''} 
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Informations Académiques</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Diplôme</label>
                    <input 
                      type="text" 
                      name="diplome" 
                      value={formData.diplome || ''} 
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Établissement</label>
                    <input 
                      type="text" 
                      name="etablissement" 
                      value={formData.etablissement || ''} 
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Qualité</label>
                    <select
                      name="qualite"
                      onChange={handleChange}
                      value={formData.qualite || ''}
                    >
                      <option value="">Sélectionner une qualité</option>
                      {qualiteOptions.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Grade de recherche</label>
                    <select
                      name="grade"
                      value={formData.grade || ''}
                      onChange={handleChange}
                      disabled={formData.qualite === "Doctorant"}
                    >
                      <option value="">Sélectionner un grade</option>
                      {formData.qualite && gradeOptions[formData.qualite]?.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>H-index</label>
                    <input 
                      type="number" 
                      name="h_index" 
                      value={formData.h_index || ''} 
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-field">
                    <label>Équipe</label>
                    <select
                      name="equipe"
                      value={formData.equipe || ''}
                      onChange={handleChange}
                    >
                      <option value="">Sélectionner une équipe</option>
                      {equipeOptions.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Liens Professionnels</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>DBLP</label>
                    <input 
                      type="url" 
                      name="dblp" 
                      value={formData.dblp || ''} 
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Google Scholar</label>
                    <input 
                      type="url" 
                      name="scholar" 
                      value={formData.scholar || ''} 
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>LinkedIn</label>
                    <input 
                      type="url" 
                      name="linkedin" 
                      value={formData.linkedin || ''} 
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>ResearchGate</label>
                    <input 
                      type="url" 
                      name="researchgate" 
                      value={formData.researchgate || ''} 
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Talent</label>
                  <input 
                    type="text" 
                    name="talent" 
                    value={formData.talent || ''} 
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit">
                  Enregistrer les modifications
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EditProfile;