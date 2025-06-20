import "./Filter_publications.css";
import { useEffect } from "react";

function Filter_publications({ 
  Type = [], setType, 
  Pagemin, setPagemin, 
  Pagemax, setPagemax, 
  DateMin, setDateMin, 
  DateMax, setDateMax,
  Volummin, Volummax,
  setVolummin, setVolummax
}) {
  const typeOptions = [
    { label: "Conférence", searchTerm: "conf" },
    { label: "Journal", searchTerm: "journal" }
  ];

  const handleSelection = (searchTerm) => {
    const newType = Type.includes(searchTerm)
      ? Type.filter(item => item !== searchTerm)
      : [...Type, searchTerm];
    setType(newType);
  };

  // Debug effect
  useEffect(() => {
    console.log("Current Type filter (array):", Type);
  }, [Type]);

  return (
    <div className="Filter_publications">
      <div className="list">
        <h4>Type</h4>
        <ul>
          {typeOptions.map(option => (
            <li 
              key={option.searchTerm}
              onClick={() => handleSelection(option.searchTerm)}
              className={Type.includes(option.searchTerm) ? "selected" : ""}
            >
              {option.label}
            </li>
          ))}
        </ul>

        {/* Rest of your filters remain exactly the same */}
        <h4>Nombre de pages</h4>
        <section className="npage">
          <div style={{display:"flex", flexDirection:"row", gap:"8px"}}>
            <input 
              type="number" 
              min="0" 
              placeholder="min"
              value={Pagemin || ""} 
              onChange={e => setPagemin(e.target.value ? parseInt(e.target.value) : null)} 
            />
            <input 
              type="number" 
              min={Pagemin || undefined}
              placeholder="max"
              value={Pagemax || ""} 
              onChange={e => setPagemax(e.target.value ? parseInt(e.target.value) : null)} 
            />
          </div>
        </section>

        <h4>Volume</h4>
        <section className="npage">
          <div style={{display:"flex", flexDirection:"row", gap:"8px"}}>
            <input 
              type="number" 
              min="0" 
              placeholder="min"
              value={Volummin || ""} 
              onChange={e => setVolummin(e.target.value ? parseInt(e.target.value) : null)} 
            />
            <input 
              type="number" 
              min={Volummin || undefined}
              placeholder="max"
              value={Volummax || ""} 
              onChange={e => setVolummax(e.target.value ? parseInt(e.target.value) : null)} 
            />
          </div>
        </section>

        <h4>Année de publication</h4>
        <section className="sDate">
          <div style={{display:"flex", flexDirection:"row", gap:"8px"}}>
            <input 
              type="number"
              placeholder="Année min"
              min="1900"
              max={new Date().getFullYear()}
              value={DateMin || ""}
              onChange={e => setDateMin(e.target.value ? parseInt(e.target.value) : null)}
            />
            <input 
              type="number"
              placeholder="Année max"
              min={DateMin || "1900"}
              max={new Date().getFullYear()}
              value={DateMax || ""}
              onChange={e => setDateMax(e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
        </section>
      </div>

      <button
        onClick={() => {
          setType([]);
          setPagemin(null);
          setPagemax(null);
          setDateMin(null);
          setDateMax(null);
          setVolummin(null);
          setVolummax(null);
        }}
        className="aplq"
      >
        Réinitialiser
      </button>
    </div>
  );
}

export default Filter_publications;