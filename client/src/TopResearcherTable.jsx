import React from "react";
import "./Stat.css";

const TopResearcherTable = ({topResearchers}) => {
  const researchers = [
    { name: "Mouloud Koudil", publications: 16, H_index: 50 },
    { name: "Fatima Si-Tayeb", publications: 14, H_index: 40 },
    { name: "Amar Balla", publications: 12, H_index: 70 },
    { name: "Karima Bentachba", publications: 9, H_index: 35 },
    { name: "Boualem Khelouat", publications: 8, H_index: 48 }
  ];

  return (
    <div className="top-researcher-container">
      <h3 className="top-researcher-title">TOP 5 chercheur</h3>
      <p className="top-researcher-subtitle">par le H-Index</p>

      <table className="researcher-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>H_index</th>
            <th>Publications</th>
          </tr>
        </thead>
        <tbody>
          {topResearchers.map((researcher, index) => (
            <tr key={researcher.chercheur_id}>
              <td>{researcher.nom_complet}</td>
              <td>{researcher.h_index}</td>
              <td>{researcher.nb_pubs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TopResearcherTable;