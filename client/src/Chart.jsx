import {React, useEffect, useState} from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const DocumentsChart = () => {
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
    { year: currentYear - 13, documents: stats.nb_pub13 },
    { year: currentYear - 12, documents: stats.nb_pub12 },
    { year: currentYear - 11, documents: stats.nb_pub11 },
    { year: currentYear - 10, documents: stats.nb_pub10 },
    { year: currentYear - 9, documents: stats.nb_pub9 },
    { year: currentYear - 8, documents: stats.nb_pub8 },
    { year: currentYear - 7, documents: stats.nb_pub7 },
    { year: currentYear - 6, documents: stats.nb_pub6 },
    { year: currentYear - 5, documents: stats.nb_pub5 },
    { year: currentYear - 4, documents: stats.nb_pub4 },
    { year: currentYear - 3, documents: stats.nb_pub3 },
    { year: currentYear -2, documents: stats.nb_pub2 },
    { year: currentYear - 1, documents: stats.nb_pub1 },
    { year: currentYear, documents: stats.nb_pub0 },
  ];

  return (
    <div className="chart-container">
      <h3>Documents ajoutés par année</h3>
      <ResponsiveContainer width="100%" height={300}>
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

export default DocumentsChart;
