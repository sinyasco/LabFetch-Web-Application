import React from 'react';

function StatCard({ title, icon, number, growth,className,style,textColor,numberStyle,titleStyle}) {
  return (
    <div className={`stat-card ${className} `} style={style}>
      <div className="stat-header">
        <p className="stat-title" style={{color:textColor,...titleStyle}}>{title}</p>
        <i className={`fa-solid ${icon} icon`}></i>
      </div>
      <h3 className="statnumber" style={{...numberStyle}}>{number}</h3>
      {growth && (
        <p className="stat-growth">
          <i className="fa-solid fa-chart-line"></i> ­ {growth} ­ Cet année
        </p>
      )}
    </div>
  );
}

export default StatCard;