import React from "react";
import "./Filter_publications.css";

function Filter_order({ Car = 'p.pub_id', setCar, Ordre = 'DESC', setOrdre }) {
  return (
    <div className="Filter_publications">
      <div className="list">
        <h4>Caractéristique</h4>
        <select
          value={Car}
          onChange={(e) => setCar(e.target.value)}
          aria-label="Select sort column"
        >
        <option value="p.pub_id">ID de la pub</option>
          <option value="p.Annee">Année</option>
          <option value="p.titre">Titre</option>
          <option value="p.nombre_pages">Nombre de pages</option>
          <option value="cj.nom">Nom de Conf/Journal</option>
        </select>

        <h4>Ordre</h4>
        <select
          value={Ordre}
          onChange={(e) => setOrdre(e.target.value)}
          aria-label="Select sort order"
        >
          <option value="DESC">Descendant</option>
          <option value="ASC">Ascendant</option>
        </select>
      </div>

      <button
        onClick={() => {
          setCar('p.pub_id');
          setOrdre('DESC');
        }}
        className="aplq"
        aria-label="Reset sorting"
      >
        Réinitialiser
      </button>
    </div>
  );
}

export default Filter_order;