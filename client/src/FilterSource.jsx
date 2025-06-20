import React from "react";
import "./Filter_publications.css";

function Filter_source({
  Nomsrc, setNomsrc,
  Periodemin, setPeriodemin,
  Periodemax, setPeriodemax,
  Periodicite, setPeriodicite
}) {
  return (
    <div className="Filter_publications">
      <div className="list">
        <h4>Nom de la source</h4>
        <input
          type="text"
          placeholder="Nom de la conférence/journal"
          value={Nomsrc || ""}
          onChange={(e) => setNomsrc(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            marginBottom: "12px",
            fontSize: "14px",
            border: "1px solid #ccc",
            borderRadius: "6px"
          }}
        />

        <h4>Période</h4>
        <section className="npage">
          <div style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
            <input 
              type="number" 
              min="1900"
              max={Periodemax || new Date().setFullYear()}
              placeholder="min"
              value={Periodemin || ""} 
              onChange={e => setPeriodemin(e.target.value)} 
            />
            <input 
              type="number" 
              min={Periodemin || "1900"}
              max={new Date().setFullYear()}
              placeholder="max"
              value={Periodemax || ""} 
              onChange={e => setPeriodemax(e.target.value)} 
            />
          </div>
        </section>

        <h4>Périodicité</h4>
        <section style={{ marginTop: "8px" }}>
          <select
            value={Periodicite || ""}
            onChange={e => setPeriodicite(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: "14px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              backgroundColor: "#fff",
              color: "#333",
              transition: "border-color 0.2s, box-shadow 0.2s",
              outline: "none",
            }}
          >
            <option value="">-- Choisir une périodicité --</option>
            <option value="mensuelle">Mensuelle</option>
            <option value="bimensuelle">Bimensuelle</option>
            <option value="trimestrielle">Trimestrielle</option>
            <option value="semestrielle">Semestrielle</option>
            <option value="annuelle">Annuelle</option>
          </select>
        </section>
      </div>

      <button
        onClick={() => {
          setNomsrc("");
          setPeriodemin("");
          setPeriodemax("");
          setPeriodicite("");
        }}
        className="aplq"
      >
        Réinitialiser
      </button>
    </div>
  );
}

export default Filter_source;