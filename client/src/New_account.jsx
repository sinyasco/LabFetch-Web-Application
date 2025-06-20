import React, { useState, useEffect } from "react";
import "./New_account_page.css";
import AddAcount from "./AddAcount";

function New_account() {
    const [data, setData] = useState([]);
    const [selectedResearcher, setSelectedResearcher] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPendingResearchers = async () => {
            try {
                setLoading(true);
                const response = await fetch('http://localhost:5000/api/pending-researchers', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const text = await response.text();
                const researchers = text ? JSON.parse(text) : [];
                
                console.log("API Response:", researchers);
                
                if (!Array.isArray(researchers)) {
                    throw new Error("API response is not an array");
                }
                
                setData(researchers);
                setError(null);
            } catch (error) {
                console.error("Error fetching researchers:", error);
                setError(error.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };
        
        fetchPendingResearchers();
    }, []);

    if (loading) {
        return <div className="loading-message">Chargement en cours...</div>;
    }

    if (error) {
        return <div className="error-message">Erreur: {error}</div>;
    }

    return (
        <div className="new_account_page">
            <h1 className="page-title">Gestion des Comptes Chercheurs</h1>
            
            {data.length > 0 ? (
                <>
                    <h2 className="table-title">Chercheurs en attente d'activation</h2>
                    <table className="documents-table">
                        <thead>
                            <tr>
                                <th>Nom complet</th>
                                <th>Matricule</th>
                                <th>Email</th>
                                <th>Téléphone</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((researcher, index) => (
                                <tr key={index}>
                                    <td>{researcher.nom_complet}</td>
                                    <td>{researcher.matricule || "-"}</td>
                                    <td>{researcher.email}</td>
                                    <td>{researcher.telephone || "-"}</td>
                                    <td>
                                        <img 
                                            src="/Vector.png" 
                                            alt="Activate" 
                                            height="20" 
                                            width="20"
                                            onClick={() => {
                                                setSelectedResearcher(researcher);
                                                setShowModal(true);
                                            }}
                                            style={{ cursor: "pointer" }}
                                            className="activate-icon"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {showModal && selectedResearcher && (
                        <div className="overlay">
                            <AddAcount 
                                show={showModal}
                                setShow={setShowModal}
                                password={password}
                                setPassword={setPassword}
                                Nom={selectedResearcher.nom_complet}
                                matricule={selectedResearcher.matricule}
                                email={selectedResearcher.email}
                                chercheur_id={selectedResearcher.chercheur_id} // THIS MUST EXIST
                            />
                        </div>
                    )}
                </>
            ) : (
                <div className="no-results-message">
                    Aucun chercheur en attente d'activation
                </div>
            )}
        </div>
    );
}

export default New_account;