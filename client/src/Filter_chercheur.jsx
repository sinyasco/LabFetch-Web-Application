import { useState } from "react";
import "./Filter_chercheur.css";

function Filter_chercheur({ 
  Scimago, setScimago, 
  Qualis, setQualis, 
  CORE, setCORE, 
  DGRSDT, setDGRSDT 
}) {
  // Define available classifications
  const classifications = {
    Scimago: ["Q1", "Q2", "Q3", "Q4"],
    Qualis: ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C"],
    CORE: ["A+", "A", "B", "C"],
    DGRSDT: ["Revue A", "Revue B"]
  };

  const toggleFilter = (value, current, setter) => {
    setter(current.includes(value) 
      ? current.filter(v => v !== value)
      : [...current, value]
    );
  };

  const renderFilterList = (items, current, setter) => (
    <ul>
      {items.map(item => (
        <li
          key={item}
          onClick={() => toggleFilter(item, current, setter)}
          className={current.includes(item) ? "selected" : ""}
        >
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="Filter_chercheur">
      <div className="list">
        <h4>Scimago</h4>
        {renderFilterList(classifications.Scimago, Scimago, setScimago)}
        
        <h4>Qualis</h4>
        {renderFilterList(classifications.Qualis, Qualis, setQualis)}
        
        <h4>CORE</h4>
        {renderFilterList(classifications.CORE, CORE, setCORE)}
        
        <h4>DGRSDT</h4>
        {renderFilterList(classifications.DGRSDT, DGRSDT, setDGRSDT)}
      </div>

      <button 
        onClick={() => {
          setScimago([]);
          setQualis([]);
          setCORE([]);
          setDGRSDT([]);
        }}
        className="aplq"
      >
        Réinitialiser
      </button>
    </div>
  );
}

export default Filter_chercheur;