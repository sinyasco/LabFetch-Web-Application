import React from "react";
import "./Stat.css";

const HIndexChart = ({codesign, eiah, image, msi, opt, sures}) => {
  const data = [
    { equipe: "CoDesign", value: parseFloat(codesign) },
    { equipe: "EIAH", value: parseFloat(eiah) },
    { equipe: "Image", value: parseFloat(image) },
    { equipe: "MSI", value: parseFloat(msi) },
    { equipe: "OPT", value: parseFloat(opt) },
    { equipe: "SURES", value: parseFloat(sures) }
  ];

  // Calculate max value to create proportional bars
  const maxValue = Math.max(...data.map(item => item.value));
  const getPercentage = (value) => (value / maxValue) * 75; // Using 75% as max width

  return (
    <div className="h-index-container">
      <h3 className="h-index-title">Le H-index moyen par équipe</h3>

      <div className="h-index-chart">
        {data.map((item, index) => (
          <div key={index} className="h-index-row">
            <span className="h-index-label">{item.equipe}</span>
            <div className="h-index-bar-container">
              <div 
                className="h-index-bar" 
                style={{ width: `${getPercentage(item.value)}%` }}
              ></div>
            </div>
            <span className="h-index-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HIndexChart;