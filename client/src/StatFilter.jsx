import React, { useState, useEffect } from "react";
import axios from "axios";
import "./StatFilter.css";

// Styles
const additionalStyles = `
  .input-wrapper {
    width: 100%;
  }
  
  .criteria-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #D9D9D9;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .period-wrapper {
    display: flex;
    width: 100%;
  }
  
  .date-range {
    display: flex;
    align-items: center;
    width: 100%;
  }
  
  .date-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #D9D9D9;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .date-separator {
    margin: 0 10px;
    font-weight: bold;
  }

  .loading-indicator {
    padding: 20px;
    text-align: center;
    color: #4880FF;
  }

  .error-message {
    padding: 20px;
    background: #FFEBEE;
    color: #C62828;
    border-radius: 4px;
    margin: 10px 0;
  }
`;

// Criteria data
const RESEARCHER_CRITERIA = [
  { id: 1, name: "Critère 1", description: "H-index supérieur à" },
  { id: 2, name: "Critère 2", description: "Nombre de publications" },
  { id: 3, name: "Critère 3", description: "Établissement d'origine" },
  { id: 4, name: "Critère 4", description: "Statut" },
  { id: 5, name: "Critère 5", description: "Qualité" },
  { id: 6, name: "Critère 6", description: "Équipe" }
];

const PUBLICATION_CRITERIA = [
  { id: 1, name: "Critère 1", description: "Type de publication" },
  { id: 2, name: "Critère 2", description: "Année de publication" },
  { id: 3, name: "Critère 3", description: "Thématique" },
  { id: 4, name: "Critère 4", description: "Classement QUALIS" },
  { id: 5, name: "Critère 5", description: "Classement Scimago" },
  { id: 6, name: "Critère 6", description: "Classement CORE" },
  { id: 7, name: "Critère 7", description: "Classement DGRSDT" },
  { id: 8, name: "Critère 8", description: "Période" },
  { id: 9, name: "Critère 9", description: "Périodicité" },
  { id: 10, name: "Critère 10", description: "Nombre de pages supérieur à" }
];

const CRITERIA_OPTIONS = {
  "Statut": ["actif", "non actif"],
  "Qualité": ["Enseignant-Chercheur", "Chercheur", "Doctorant"],
  "Équipe": ["CoDesign", "TIIMA", "MSI", "OPT", "EIAH", "SURES"],
  "Type de publication": ["Conference", "Journal"],
  "Périodicité": ["Annuel", "Bisannuelle", "Triannuelle", "Semestrielle"],
  "Classement QUALIS": ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C"],
  "Classement Scimago": ["Q1", "Q2", "Q3", "Q4"],
  "Classement CORE": ["A+", "A", "B", "C"],
  "Classement DGRSDT": ["Revue A", "Revue B"]
};

function StatFilter({ onShowGeneral }) {
  // Apply additional styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = additionalStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // State management
  const [view, setView] = useState("general");
  const [step, setStep] = useState(1);
  const [statType, setStatType] = useState(null);
  const [selectedCriteriaList, setSelectedCriteriaList] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState({ start: '', end: '' });

  // Handlers
  const handleViewChange = (newView) => {
    setView(newView);
    if (newView === "general") {
      onShowGeneral();
    } else {
      onShowGeneral(false);
      setStep(1);
      setStatType(null);
      setSelectedCriteriaList([]);
      setStatsData(null);
      setError(null);
      setPeriod({ start: '', end: '' });
    }
  };

  const handleStatTypeSelect = (type) => {
    setStatType(type);
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const criteria = selectedCriteriaList.map(c => {
        // Handle period value separately
        if (c.description === "Période") {
          return {
            description: c.description,
            value: `${period.start}-${period.end}`
          };
        }
        return c;
      });

      const endpoint = statType === "researchers" 
        ? "/api/researchers/stats" 
        : "/api/publications/stats";

      const response = await axios.post(`http://localhost:5000${endpoint}`, { criteria });
      setStatsData(response.data.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError(err.response?.data?.message || "Failed to fetch statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && statType) {
      setStep(2);
    } else if (step === 2 && selectedCriteriaList.length > 0) {
      const allCriteriaHaveValues = selectedCriteriaList.every(isCriteriaValueValid);
      if (allCriteriaHaveValues) {
        fetchStats();
        setStep(3);
      }
    }
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCriteriaToggle = (criteriaId) => {
    const existingIndex = selectedCriteriaList.findIndex(c => c.id === criteriaId);
    
    if (existingIndex >= 0) {
      const updatedList = [...selectedCriteriaList];
      updatedList.splice(existingIndex, 1);
      setSelectedCriteriaList(updatedList);
    } else {
      const criteria = statType === "researchers" 
        ? RESEARCHER_CRITERIA.find(c => c.id === criteriaId)
        : PUBLICATION_CRITERIA.find(c => c.id === criteriaId);
      
      setSelectedCriteriaList([...selectedCriteriaList, {
        id: criteriaId,
        description: criteria.description,
        value: ""
      }]);
    }
  };

  const handleCriteriaValueChange = (criteriaId, value) => {
    const updatedList = selectedCriteriaList.map(criteria => {
      if (criteria.id === criteriaId) {
        return { ...criteria, value };
      }
      return criteria;
    });
    
    setSelectedCriteriaList(updatedList);
  };

  const handlePeriodChange = (field, value) => {
    setPeriod(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isCriteriaValueValid = (criteria) => {
    if (!criteria.value && criteria.description !== "Période") return false;
    
    if (criteria.description === "Période") {
      return period.start && period.end;
    }
    
    if (criteria.description === "Nombre de pages supérieur à" || 
        criteria.description === "H-index supérieur à" ||
        criteria.description === "Nombre de publications" ||
        criteria.description === "Année de publication") {
      return criteria.value !== "" && !isNaN(criteria.value) && parseInt(criteria.value) >= 0;
    }
    
    return criteria.value !== "";
  };

  const isCriteriaSelected = (criteriaId) => {
    return selectedCriteriaList.some(c => c.id === criteriaId);
  };

  const calculatePercentage = () => {
    if (!statsData || statsData.total === 0) return 0;
    return Math.round((statsData.matching / statsData.total) * 100);
  };

  // Component for rendering different input types based on criteria
  const CriteriaInput = ({ criteria, onChange }) => {
    const options = CRITERIA_OPTIONS[criteria.description] || [];
    
    // Handle free input fields
    if (criteria.description === "H-index supérieur à" || 
        criteria.description === "Nombre de publications" ||
        criteria.description === "Établissement d'origine" ||
        criteria.description === "Année de publication" ||
        criteria.description === "Thématique") {
      return (
        <div className="criteria-value-item">
          <label>{criteria.description}</label>
          <div className="input-wrapper">
            <input
              type={criteria.description === "Année de publication" ? "number" : "text"}
              max={criteria.description === "Année de publication" ? new Date().getFullYear() : undefined}
              value={criteria.value || ""}
              onChange={(e) => onChange(criteria.id, e.target.value)}
              className="criteria-input"
              placeholder={`Entrez ${criteria.description.toLowerCase()}`}
            />
          </div>
        </div>
      );
    }
    
    if (criteria.description === "Nombre de pages supérieur à") {
      return (
        <div className="criteria-value-item">
          <label>{criteria.description}</label>
          <div className="input-wrapper">
            <input
              type="number"
              min="1"
              value={criteria.value || ""}
              onChange={(e) => onChange(criteria.id, e.target.value)}
              className="criteria-input"
              placeholder="Entrez un nombre"
            />
          </div>
        </div>
      );
    }
    
    if (criteria.description === "Période") {
      return (
        <div className="criteria-value-item">
          <label>{criteria.description}</label>
          <div className="period-wrapper">
            <div className="date-range">
              <input
                type="number"
                max={new Date().getFullYear()}
                value={period.start}
                onChange={(e) => handlePeriodChange('start', e.target.value)}
                className="date-input"
                placeholder="Année début"
              />
              <span className="date-separator">-</span>
              <input
                type="number"
                min={period.start || undefined}
                max={new Date().getFullYear()}
                value={period.end}
                onChange={(e) => handlePeriodChange('end', e.target.value)}
                className="date-input"
                placeholder="Année fin"
              />
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="criteria-value-item">
        <label>{criteria.description}</label>
        <div className="select-wrapper">
          <select
            value={criteria.value}
            onChange={(e) => onChange(criteria.id, e.target.value)}
            className="criteria-select"
          >
            <option value="">Sélectionnez une valeur</option>
            {options.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  // Render functions
  const renderStep1 = () => (
    <div className="stat-selection">
      <h2>Sélectionnez le type de statistiques</h2>
      <div className="stat-options">
        <div 
          className={`stat-option ${statType === "researchers" ? "selected" : ""}`}
          onClick={() => handleStatTypeSelect("researchers")}
        >
          <h3>Statistiques des chercheurs</h3>
          <p>Analysez les données des chercheurs selon différents critères</p>
        </div>
        <div 
          className={`stat-option ${statType === "publications" ? "selected" : ""}`}
          onClick={() => handleStatTypeSelect("publications")}
        >
          <h3>Statistiques des publications</h3>
          <p>Explorez les publications selon différents paramètres</p>
        </div>
      </div>
      <div className="navigation-buttons">
        <button 
          className="next-button" 
          onClick={handleNextStep} 
          disabled={!statType || loading}
        >
          {loading ? 'Chargement...' : 'Suivant'}
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const criteria = statType === "researchers" ? RESEARCHER_CRITERIA : PUBLICATION_CRITERIA;
    
    return (
      <div className="criteria-selection">
        <h2>Sélectionnez vos critères</h2>
        <p className="criteria-hint">Vous pouvez sélectionner plusieurs critères</p>
        
        <div className="criteria-list">
          {criteria.map((criterion) => (
            <div 
              key={criterion.id}
              className={`criterion-item ${isCriteriaSelected(criterion.id) ? "selected" : ""}`}
              onClick={() => handleCriteriaToggle(criterion.id)}
            >
              <h3>{criterion.name}</h3>
              <p>{criterion.description}</p>
              {isCriteriaSelected(criterion.id) && <span className="selected-mark">✓</span>}
            </div>
          ))}
        </div>
        
        {selectedCriteriaList.length > 0 && (
          <div className="criteria-values">
            <h3>Valeurs des critères sélectionnés</h3>
            {selectedCriteriaList.map((selectedCriteria) => (
              <CriteriaInput 
                key={selectedCriteria.id}
                criteria={selectedCriteria}
                onChange={handleCriteriaValueChange}
              />
            ))}
          </div>
        )}
        
        <div className="navigation-buttons">
          <button className="back-button" onClick={handleBackStep}>
            Retour
          </button>
          <button 
            className="next-button" 
            onClick={handleNextStep}
            disabled={selectedCriteriaList.length === 0 || 
                     !selectedCriteriaList.every(isCriteriaValueValid) ||
                     loading}
          >
            {loading ? 'Chargement...' : 'Suivant'}
          </button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const percentage = calculatePercentage();
    
    return (
      <div className="results-view">
        <h2>Résultats</h2>
        {loading && <div className="loading-indicator">Chargement des données...</div>}
        {error && <div className="error-message">{error}</div>}
        
        {statsData && (
          <>
            <div className="criteria-summary">
              <h3>Critères sélectionnés:</h3>
              <ul className="selected-criteria-list">
                {selectedCriteriaList.map((criteria) => {
                  // Handle period display separately
                  if (criteria.description === "Période") {
                    return (
                      <li key={criteria.id}>
                        <strong>{criteria.description}:</strong> {period.start}-{period.end}
                      </li>
                    );
                  }
                  return (
                    <li key={criteria.id}>
                      <strong>{criteria.description}:</strong> {criteria.value}
                    </li>
                  );
                })}
              </ul>
            </div>
            
            <div className="results-summary">
              <div className="total-count">
                <span className="count-label">Total {statType === "researchers" ? "chercheurs" : "publications"}</span>
                <span className="count-value">{statsData.total}</span>
              </div>
              <div className="matching-count">
                <span className="count-label">Correspondant aux critères</span>
                <span className="count-value">{statsData.matching}</span>
              </div>
            </div>
            
            <div className="percentage-circle">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="none" stroke="#F0F3FA" strokeWidth="20" />
                <circle 
                  cx="100" 
                  cy="100" 
                  r="80" 
                  fill="none" 
                  stroke="#4880FF" 
                  strokeWidth="20" 
                  strokeDasharray={`${percentage * 5.02} 502`} 
                  transform="rotate(-90 100 100)"
                />
                <text x="100" y="110" textAnchor="middle" fontSize="32" fontWeight="bold" fill="#343C6A">
                  {percentage}%
                </text>
              </svg>
            </div>
          </>
        )}
        
        <div className="navigation-buttons">
          <button className="back-button" onClick={handleBackStep}>
            Modifier les critères
          </button>
          <button className="new-search-button" onClick={() => setStep(1)}>
            Nouvelle recherche
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (view === "general") return null;
    
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  return (
    <div className="stat-filter-container">
      <div className="view-toggle">
        <button 
          className={`toggle-button ${view === "general" ? "active" : ""}`}
          onClick={() => handleViewChange("general")}
        >
          Générales
        </button>
        <button 
          className={`toggle-button ${view === "personalized" ? "active" : ""}`}
          onClick={() => handleViewChange("personalized")}
        >
          Personnalisées
        </button>
      </div>
      {renderContent()}
    </div>
  );
}

export default StatFilter;