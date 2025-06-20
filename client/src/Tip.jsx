import React, { useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./Tip.css";

const tips = [
  {
    title: "Gagnez du temps avec les filtres",
    description: "Utilisez les filtres avancés pour trouver rapidement vos documents ou collaborateurs.",
  },
  {
    title: "accedez aux profils",
    description: "Accédez aux profils des chercheurs pour en savoir plus sur leur parcours, leurs collaborations et leurs publications",
  },
  {
    title: "Visualisez les statistiques",
    description: "Visualisez les statistiques des publications  pour suivre l’évolution scientifique au sein de votre institution.",
  },
];

const TipOfTheDay = () => {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const switchTip = (newIndex) => {
    setFade(false);
    setTimeout(() => {
      setIndex(newIndex);
      setFade(true);
    }, 200);
  };

  const handleNext = () => {
    switchTip((index + 1) % tips.length);
  };

  const handlePrev = () => {
    switchTip((index - 1 + tips.length) % tips.length);
  };

  return (
    <div className="tip-container">
      <button className="tip-arrow left" onClick={handlePrev}>
        <FaChevronLeft />
      </button>

      <div className={`tip-content ${fade ? "fade-in" : "fade-out"}`}>
        <div className="tip-icon">💡</div>
        <h2 className="tip-title">Explorez LabFetch</h2>
        
        <p className="tip-description">{tips[index].description}</p>
      </div>

      <button className="tip-arrow right" onClick={handleNext}>
        <FaChevronRight />
      </button>
    </div>
  );
};

export default TipOfTheDay;
