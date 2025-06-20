import React, { useEffect, useState } from "react";
import ResearcherCard from "./ResearcherCard";

const Chercheurs = () => {
    const [researchers, setResearchers] = useState([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("Tout");

    useEffect(() => {
        fetch("http://localhost:5000/api/data")
            .then((response) => response.json())
            .then((data) => {
                setResearchers(data);
            })
            .catch((error) => console.error("Erreur lors du chargement des chercheurs :", error));
    }, []);

    const filteredResearchers = researchers.filter((researcher) => {
        return (
            (filter === "Tout" || researcher.qualite === filter) &&
            researcher.nom_complet?.toLowerCase().includes(search.toLowerCase())
        );
    });

    return (
        <div className="chercheurs-page">
            <h2>Chercheurs</h2>
            <div className="filters">
                {["Tout", "Enseignant-Chercheur", "Chercheur", "Doctorant"].map((tab) => (
                    <span
                        key={tab}
                        className={filter === tab ? "active" : ""}
                        onClick={() => setFilter(tab)}
                    >
                        {tab}
                    </span>
                ))}
                <div className="search-box">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input 
                        type="text" 
                        placeholder="Search researcher name" 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                    />
                </div>
            </div>
            
            <div className="researcher-list">
                {filteredResearchers.length > 0 ? (
                    filteredResearchers.map((researcher, index) => (
                        <ResearcherCard key={index} {...researcher} />
                    ))
                ) : (
                    <p className="no-results">Aucun chercheur trouvé.</p>
                )}
            </div>
        </div>
    );
};

export default Chercheurs;