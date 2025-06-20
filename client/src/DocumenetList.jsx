{/*import { useState } from "react";

function publicationumentsContainer({ title = "Derniers publicationuments" }) {
  const truncateText = (text, maxLength) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const [publicationuments] = useState([
    { title: "Hash-processing and Optimization Techniques in Large-Scale Data Analysis", authors: "Hidouci Walid, Noussaiba Boudia, Mohamed Amine", date: "12.10.2019", pages: 23, type: "article" },
    { title: "Machine Learning in Bioinformatics: Trends and Challenges", authors: "Ali Ben, Zineb K., Yassine Tazrout", date: "05.06.2021", pages: 45, type: "conférence" },
    { title: "Neural Networks for NLP: Advances and Applications", authors: "Sami B., Amina R., Khaled Nouar", date: "22.09.2022", pages: 30, type: "thèse" }
  ]);

  return (
    <div className="publicationuments-container">
      <h3>{title}</h3>
      <table className="publicationuments-table">
        <thead>
          <tr>
            <th>Titre</th>
            <th>Auteurs</th>
            <th>Date de publication</th>
            <th>Pages</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {publicationuments.map((publication, index) => (
            <tr key={index}>
              <td>{truncateText(publication.title, 30)}</td>
              <td>{truncateText(publication.authors, 25)}</td>
              <td>{publication.date}</td>
              <td>{publication.pages}</td>
              <td><span className="publication-type">{publication.type}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default publicationumentsContainer;*/}
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from 'react';

function DocumentsContainer() {
  const [publications, setPublications] = useState([]); // State to store publications
  const [loading, setLoading] = useState(true); // State to track loading status
  const [error, setError] = useState(null); // State to handle errors
  const [authors, setAuthors] = useState({}); // State to store authors for each publication
  const navigate = useNavigate();

  // Fetch publications data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch publications
        const publicationsResponse = await fetch('http://localhost:5000/api/Last-Publications');
        if (!publicationsResponse.ok) {
          throw new Error('Network response was not ok');
        }
        const publicationsData = await publicationsResponse.json();
        setPublications(publicationsData);

        // Fetch authors for each publication
        const authorsData = {};
        for (const pub of publicationsData) {
          const authorsResponse = await fetch(`http://localhost:5000/api/Authors/${pub.pub_id}`);
          if (!authorsResponse.ok) {
            throw new Error(`Failed to fetch authors for publication ${pub.pub_id}`);
          }
          const authorsList = await authorsResponse.json();
          authorsData[pub.pub_id] = authorsList.map((author) => author.nom_complet).join(", ");
        }

        setAuthors(authorsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Display loading state
  if (loading) {
    return <p>Loading publications...</p>;
  }

  // Display error state
  if (error) {
    return <p>Error: {error}</p>;
  }

  const truncateText = (text, maxLength) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="documents-container">
      
      <table className="documents-table" >
        
        <tbody>
          {publications.map((pub, index) => (
            <tr
              key={index}
              onClick={() => navigate(`/document/${pub.pub_id}`, { state: { publication: pub } })}
            >
              <td>{truncateText(pub.titre, 60)}</td>
              
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DocumentsContainer;