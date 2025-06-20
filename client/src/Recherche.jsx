import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Recherche.css";
import Filter_chercheur from "./Filter_chercheur";
import Filter_publications from "./Filter_publications";
import Filter_source from "./FilterSource";
import Filter_order from "./FilterOrder";

const truncateText = (text, maxLength) => {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

function Recherche() {
  const navigate = useNavigate();

  const [pagesPerGroup] = useState(10);
  const [currentGroup, setCurrentGroup] = useState(0);

  // Filter states
  const [Scimago, setScimago] = useState([]);
  const [Qualis, setQualis] = useState([]);
  const [CORE, setCORE] = useState([]);
  const [DGRSDT, setDGRSDT] = useState([]);
  const [Type, setType] = useState([]);
  const [Pagemin, setPagemin] = useState(null);
  const [Pagemax, setPagemax] = useState(null);
  const [Volummin, setVolummin] = useState(null);
  const [Volummax, setVolummax] = useState(null);
  const [DateMin, setDateMin] = useState(null);
  const [DateMax, setDateMax] = useState(null);
  const [Periodemin, setPeriodemin] = useState("");
  const [Periodemax, setPeriodemax] = useState("");
  const [Periodicite, setPeriodicite] = useState("");
  const [Nomsrc, setNomsrc] = useState("");
  const [Car, setCar] = useState('p.pub_id');
  const [Ordre, setOrdre] = useState('DESC');
  
  const [Choice, setChoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authors, setAuthors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);

  // Check if any filter is active
  const hasFilters = () => {
    return (
      Scimago.length > 0 ||
      Qualis.length > 0 ||
      CORE.length > 0 ||
      DGRSDT.length > 0 ||
      Type.length > 0 ||
      Pagemin !== null ||
      Pagemax !== null ||
      Volummin !== null ||
      Volummax !== null ||
      DateMin !== null ||
      DateMax !== null ||
      Periodemin !== "" ||
      Periodemax !== "" ||
      Periodicite !== "" ||
      Nomsrc !== "" ||
      Car !== 'p.pub_id' || 
      Ordre !== 'DESC'
    );
  };

  // Fetch total count of publications
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const countResponse = await fetch("http://localhost:5000/api/Publications/count");
        const countData = await countResponse.json();
        setTotalPages(Math.ceil(countData.count / itemsPerPage));
        setLoading(false);
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch publications with filters and sorting
  useEffect(() => {
    const fetchData = async () => {
      setPageLoading(true);
      try {
        let url;
        const params = new URLSearchParams();
        
        // Always include sorting parameters
        params.append('Car', Car);
        params.append('Ordre', Ordre);

        // Add other filters if they exist
        Type.forEach(type => params.append('Type', type));
        Scimago.forEach(val => params.append('Scimago', val));
        Qualis.forEach(val => params.append('Qualis', val));
        CORE.forEach(val => params.append('CORE', val));
        DGRSDT.forEach(val => params.append('DGRSDT', val));
        
        if (Pagemin) params.append('Pagemin', Pagemin);
        if (Pagemax) params.append('Pagemax', Pagemax);
        if (Volummin) params.append('Volummin', Volummin);
        if (Volummax) params.append('Volummax', Volummax);
        if (DateMin) params.append('DateMin', DateMin);
        if (DateMax) params.append('DateMax', DateMax);
        if (Periodemin) params.append('Periodemin', Periodemin);
        if (Periodemax) params.append('Periodemax', Periodemax);
        if (Periodicite) params.append('Periodicite', Periodicite);
        if (Nomsrc) params.append('Nomsrc', Nomsrc);

        if (hasFilters()) {
          setIsFiltering(true);
          url = `http://localhost:5000/api/Publications/filter?${params.toString()}`;
        } else {
          setIsFiltering(false);
          url = `http://localhost:5000/api/Publications?page=${currentPage}&limit=${itemsPerPage}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        if (hasFilters()) {
          setFilteredResults(data);
        } else {
          setPublications(data);
        }

        // Fetch authors
        const authorsData = {};
        for (const pub of data) {
          const authorsResponse = await fetch(`http://localhost:5000/api/Authors/${pub.pub_id}`);
          const authorsList = await authorsResponse.json();
          authorsData[pub.pub_id] = authorsList.map((author) => author.nom_complet).join(", ");
        }

        setAuthors(authorsData);
        setPageLoading(false);
      } catch (err) {
        console.error("Error fetching page data:", err);
        setError(err.message);
        setPageLoading(false);
      }
    };

    fetchData();
  }, [
    currentPage, 
    Scimago, Qualis, CORE, DGRSDT, Type, 
    Pagemin, Pagemax, Volummin, Volummax,
    DateMin, DateMax, Periodemin, Periodemax, 
    Periodicite, Nomsrc, Car, Ordre
  ]);

  // Handle search
  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
      setSearchLoading(true);
      const fetchSearchResults = async () => {
        try {
          const response = await fetch(
            `http://localhost:5000/api/Publications/search?q=${searchTerm}`
          );
          const data = await response.json();
          setSearchResults(data);

          // Fetch authors for search results
          const authorsData = {};
          for (const pub of data) {
            const authorsResponse = await fetch(`http://localhost:5000/api/Authors/${pub.pub_id}`);
            const authorsList = await authorsResponse.json();
            authorsData[pub.pub_id] = authorsList.map((author) => author.nom_complet).join(", ");
          }

          setAuthors((prevAuthors) => ({ ...prevAuthors, ...authorsData }));
        } catch (err) {
          console.error("Error fetching search results:", err);
          setError(err.message);
        } finally {
          setSearchLoading(false);
        }
      };

      fetchSearchResults();
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  }, [searchTerm]);

  // Combine filtered publications and search results
  const getDisplayedPublications = () => {
    if (isSearching) {
      return searchResults;
    } else if (isFiltering) {
      return filteredResults;
    } else {
      return publications;
    }
  };

  const displayedPublications = getDisplayedPublications();

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) return <div>Error: {error}</div>;
  if (!publications) return <div>No data available</div>;

  return (
    <div className="recherche-page">
      <div className="head">
        <section className="fltr">
          <article>
            <img src="/filter.svg" alt="filter" />
          </article>
          <article>
            <p style={{ color: "black" }}>Filtrer par</p>
          </article>
          <article className="filtercritere">
            <button
              onClick={() => setChoice(Choice === "chercheur" ? null : "chercheur")}
            >
              Classement
            </button>
            <img src="/Path.png" alt="path" />
          </article>
          <article className="filtercritere">
            <button 
              onClick={() =>
                setChoice(Choice === "publications" ? null : "publications")
              }
            >
              Publications
            </button>
            <img src="/Path.png" alt="path" />
          </article>
          <article className="filtercritere">
            <button
              onClick={() =>
                setChoice(Choice === "Source" ? null : "Source")
              }
            >
              Source
            </button>
            <img src="/Path.png" alt="path" />
          </article>
          <article className="filtercritere">
            <button 
              onClick={() =>
                setChoice(Choice === "ordre" ? null : "ordre")
              }
            >
              Ordre
            </button>
            <img src="/Path.png" alt="path" />
          </article>
        </section>
        <section>
          <label htmlFor="search">
            <input
              className="searchBar"
              type="text"
              placeholder="Rechercher par titre ou autheur"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </section>
      </div>

      {Choice === "chercheur" && (
        <div className="floating-filter">
          <Filter_chercheur
            Scimago={Scimago}
            setScimago={setScimago}
            Qualis={Qualis}
            setQualis={setQualis}
            CORE={CORE}
            setCORE={setCORE}
            DGRSDT={DGRSDT}
            setDGRSDT={setDGRSDT}
            className="Filter_chercheur"
          />
        </div>
      )}

      {Choice === "publications" && (
        <div className="floating-filter">
          <Filter_publications
            Type={Type}
            setType={setType}
            Pagemin={Pagemin}
            setPagemin={setPagemin}
            Pagemax={Pagemax}
            setPagemax={setPagemax}
            DateMin={DateMin}
            setDateMin={setDateMin}
            DateMax={DateMax}
            setDateMax={setDateMax}
            Volummin={Volummin}
            Volummax={Volummax}
            setVolummin={setVolummin}
            setVolummax={setVolummax}
            className="Filter_publications"
          />
        </div>
      )}

      {Choice === "Source" && (
        <div className="floating-filter">
          <Filter_source
            Nomsrc={Nomsrc} 
            setNomsrc={setNomsrc}
            Periodemin={Periodemin}
            setPeriodemin={setPeriodemin}
            Periodemax={Periodemax}
            setPeriodemax={setPeriodemax}
            Periodicite={Periodicite}
            setPeriodicite={setPeriodicite}
            className="Filter_publications"
          />
        </div>
      )}

      {Choice === "ordre" && (
        <div className="floating-filter">
          <Filter_order
            Car={Car}
            setCar={setCar}
            Ordre={Ordre}
            setOrdre={setOrdre}
          />
        </div>
      )}

      {pageLoading || searchLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <div className="Grandtab">
          {displayedPublications.length === 0 ? (
            <div className="no-results">No matching publications found</div>
          ) : (
            <>
              <table className="documents-table">
                <thead className="thead">
                  <tr>
                    <th>Titre</th>
                    <th>Auteurs</th>
                    <th>Année</th>
                    <th>Pages</th>
                    <th>Conf/Journal</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPublications.map((pub, index) => (
                    <tr
                      key={index}
                      onClick={() => {
                        navigate(`/document/${pub.pub_id}`, { state: { publication: pub } });
                      }}
                    >
                      <td>{truncateText(pub.titre, 30)}</td>
                      <td>{authors[pub.pub_id] || '-'}</td>
                      <td>{pub.Annee || '-'}</td>
                      <td>{pub.nombre_pages || '-'}</td>
                      <td><span className="document-type">{pub.nom || '-'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {!isSearching && !isFiltering && (
        <div className="pagination">
          {currentGroup > 0 && (
            <button onClick={() => setCurrentGroup(currentGroup - 1)}>« Précédent</button>
          )}

          {Array.from(
            { length: Math.min(pagesPerGroup, totalPages - currentGroup * pagesPerGroup) },
            (_, i) => {
              const pageNumber = currentGroup * pagesPerGroup + i + 1;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={currentPage === pageNumber ? "active" : ""}
                >
                  {pageNumber}
                </button>
              );
            }
          )}

          {currentGroup < Math.floor(totalPages / pagesPerGroup) && (
            <button onClick={() => setCurrentGroup(currentGroup + 1)}>Suivant »</button>
          )}
        </div>
      )}
    </div>
  );
}

export default Recherche;