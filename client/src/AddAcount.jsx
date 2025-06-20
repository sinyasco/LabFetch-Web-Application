import React, { useState } from "react";
import "./AddAcount.css";

function AddAcount({ show, setShow, password, setPassword, Nom, matricule, email, chercheur_id }) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generatedPassword, setGeneratedPassword] = useState(""); 

    const handleCreate = async () => {
        if (!password) {
            setError("Veuillez entrer un mot de passe");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            const user = JSON.parse(localStorage.getItem("user"));

            const response = await fetch('http://localhost:5000/api/activate-researcher', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chercheur_id : chercheur_id.toString(),
                password,
                from: user.email,        // sender (admin/etc.)
                to: email                // recipient (researcher)
            })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Échec de l'activation");
            }

            setShowSuccess(true);
            setTimeout(() => {
                setShow(false);
                setShowSuccess(false);
                setPassword("");
            }, 2000);
        } catch (error) {
            console.error("Activation error:", error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const generateRandomPassword = () => {
        const length = Math.floor(Math.random() * 5) + 6;;  // You can adjust the length here
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let password = "";
        
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        
        setPassword(password);  // Set the random password to state
        setGeneratedPassword(password);
    };

    if (!show) return null;

    return (
        <div className="overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h3 style={{marginBottom:"30px"}}>Activation du compte chercheur</h3>
                    <button 
                        className="close-btn" 
                        onClick={() => {
                            setPassword("");
                            setShow(false);
                            setError(null);
                        }}
                        disabled={isLoading}
                    >
                        ✖
                    </button>
                </div>
                
                <div className="modal-content">
                    <img className="profile-icon" src="/Frame 427319292.png" alt="profile" />
                    
                    <div className="researcher-info">
                        <div className="info-row">
                            <span className="info-label">Nom complet:</span>
                            <span className="info-value">{Nom}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Matricule:</span>

                            <span className="info-value" style={{color:"Highlight"}}>{matricule}</span>
                            <span className="info-value">{matricule || "-"}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Email:</span>
                            <span className="info-value">{email}</span>
                        </div>
                    </div>

                    <div className="message">Entrez un mot de passe manuellement ou bien générez-le automatiquement :</div>

                    <div className="password-section">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Entrez le mot de passe"
                            className="password-input"
                            disabled={isLoading}
                        />
                        {error && <div className="error-message">{error}</div>}
                    </div>

                    {/* Display the generated password for testing */}
                    {generatedPassword && (
                        <div className="generated-password-display">
                            <strong>Generated Password:</strong> {generatedPassword}
                        </div>
                    )}

                    <button
                        type="button"
                        className="submit-btn"
                        onClick={generateRandomPassword}
                        disabled={isLoading}
                    >
                        Générer un mot de passe
                    </button>
                    
                    <button 
                        onClick={handleCreate} 
                        className="submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? "Activation en cours..." : "Activer le compte"}
                    </button>
                    
                    {showSuccess && (
                        <div className="success-message">
                            ✅ Compte activé avec succès !
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AddAcount;
