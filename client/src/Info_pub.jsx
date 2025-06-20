import React, { useState } from 'react';
import { useNavigate,useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDownload, 
  faShare, 
  faEllipsisVertical,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { faFilePdf } from '@fortawesome/free-solid-svg-icons';

import './DocumentDetail.css';

export default function Info_pub({ goBack }) {
  // Document data from your screenshot

  const location=useLocation();
  console.log("Données reçues :", location.state);
  const navigate=useNavigate();
  
  const publication=location.state?.publication || {};
  const documentData = {
    title: "A novel active learning method using SVM for text classification",
    authors: "M Koudil, M Annane, Z Guessoum",
    date: "02/05/2018",
    pages: "230-240",
    type: "Nom",
    Nom: "LMCS Nom",
    doi: "10.1234/5678",
    status: "Actuel"
  };

  // Classification data from your screenshot
  const classifications = [
    { name: "Scimago", value: "A", score: "8.5" },
    { name: "CORE", value: "A", score: "" },
    { name: "DBLPJRT", value: "B", score: "REJECT" }
  ];

  // Scope data
  const scope = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

  return (
    <div className="document-container">
      <div className="document-header">
      <button onClick={() => navigate(-1)} className="back-link">
  <FontAwesomeIcon icon={faArrowLeft} /> retour
</button>
      </div>

      <div className="document-content">
        <div className="document-left-panel">
          <div className="document-preview">
            <div className="pdf-icon">
              {/* <img src="/document-icon.svg" alt="PDF" /> */}
              <FontAwesomeIcon icon={faFilePdf} className="pdf-icon-style" />
            </div>

            <div className="document-info">
              <h2>{publication.titre}</h2>
              <div className="authors">
                <span>{publication.auteur}</span>
              </div>
              <div className="document-meta">
                <div className="meta-item">
                  <span className="label">Date:</span>
                  <span>{publication.datePublication ? new Date(publication.datePublication).toLocaleDateString() : "Date non disponible"}</span>

                </div>
                <div className="meta-item">
                  <span className="label">pages:</span>
                  <span>{publication.nombrePages}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="document-details">
            <div className="details-section">
              <div className="detail-row">
                <span className="detail-label">Type</span>
                <span className="detail-value">{publication.type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Nom</span>
                <span className="detail-value">{documentData.Nom}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">DOI</span>
                <span className="detail-value">{documentData.doi}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value status-active">{documentData.status}</span>
              </div>
            </div>
          </div>

          <div className="document-actions">
            <button className="download-btn">
              <FontAwesomeIcon icon={faDownload} /> Télécharger
            </button>
            <button className="share-btn">
              <FontAwesomeIcon icon={faShare} /> Partager
            </button>
            <button className="more-btn">
              <FontAwesomeIcon icon={faEllipsisVertical} />
            </button>
          </div>
        </div>

        <div className="document-right-panel">
          <div className="ranking-section">
            <h3>Classement</h3>
            <div className="rankings">
              {classifications.map((classification, index) => (
                <div className="ranking-item" key={index}>
                  <div className="ranking-label">
                    <span className="bullet"></span>
                    <span>{classification.name}</span>
                  </div>
                  <div className="ranking-value">
                    <span className={`value-badge ${classification.value.toLowerCase()}`}>
                      {classification.value}
                    </span>
                  </div>
                  <div className="ranking-score">
                    {classification.score && (
                      <span className={`score ${classification.score === "REJECT" ? "reject" : ""}`}>
                        {classification.score}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="scope-section">
            <h3>Scope</h3>
            <p>{scope}</p>
          </div>
        </div>
      </div>
    </div>
  );
}