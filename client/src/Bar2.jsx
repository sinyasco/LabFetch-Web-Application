import {React, useEffect, useState} from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const DocumentsChart2  = () => {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetch("http://localhost:5000/api/Chart") // Replace with your actual API endpoint
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => setStats(data))
      .catch(error => console.error("Error fetching stats:", error));
  }, []);

  // ✅ Prevent rendering before data is loaded
  if (!stats) {
    return <p>Loading...</p>;
  }

  const currentYear = new Date().getFullYear();

  const data = [
    
    { year: currentYear - 4, documents: stats.nb_pub4 },
    { year: currentYear - 3, documents: stats.nb_pub3 },
    { year: currentYear -2, documents: stats.nb_pub2 },
    { year: currentYear - 1, documents: stats.nb_pub1 },
    { year: currentYear, documents: stats.nb_pub0 },
  ];

  return (
    <div className="chart-container" style={{height:"245px",width:"360px",padding:"0",
        display: "flex",flexDirection: "column",
    justifyContent: "center", // ⬅️ Centre horizontalement
    alignItems: "center"   
    }} >
        
        

        <h4 style={{ margin: " 0px", fontSize: "14px", color: "black"}}>Documents ajoutée par année</h4>
      
      <ResponsiveContainer width="100%" height={150} style={{ marginTop: 2 }} >
        <BarChart data={data}>
          <XAxis 
            dataKey="year" 
            stroke="transparent" 
            tick={{ fill: "#627086" ,fontSize: 12 }} 
          />
          <YAxis
  stroke="transparent"
  tick={{ fill: "#627086", fontSize: 12 }}
  domain={[0, Math.max(...data.map(d => d.documents)) + 5]} // Adds a small buffer
  tickFormatter={(value) => `${value}`} // Keeps numbers simple
/>

          <Tooltip 
  contentStyle={{ 
    background: "rgba(255, 255, 255, 0.8)",
    border: "none", 
    borderRadius: "8px", 
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
  }} 
  cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
/>

          <Bar 
            dataKey="documents" 
            fill="url(#gradient)" 
            barSize={23} 
            radius={[12, 12, 12, 12]}
          />
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A8D8EE" />
              <stop offset="100%" stopColor="#758797" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
      
    </div>
  );
};

export default DocumentsChart2;
