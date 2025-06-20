import React from "react";
import { Link } from "react-router-dom";
import "./Chercheurs.css";
import fallbackImage from '/profil.jpg';

function ResearcherCard({ chercheur_id, nom_complet, qualite, etablissement, image_base64, image_mimetype }) {
    return (
        <Link to={`/chercheurs/${chercheur_id}`} className="researcher-card-link">
            <div className="researcher-card">
                <img 
                    src={image_base64 || fallbackImage} 
                    onError={(e) => {
                        e.target.src = fallbackImage;
                    }}
                    alt={`Portrait of ${nom_complet}`}
                />
                <h3>{nom_complet}</h3>
                <p>{qualite || 'Chercheur'}</p>
            </div>
        </Link>
    );
}

export default ResearcherCard;