import React from "react";
import { PieChart, Pie, Cell } from "recharts";

function DonutProgress({
  percentage,
  size = 150,
  strokeWidth = 20,
  fillColor = "#60F2CA",
  bgColor = "#e0e0e0",
  title = ""
}) {
  const data = [
    { name: "progress", value: percentage },
    { name: "rest", value: 100 - percentage }
  ];

  const radius = size / 2;
  const innerRadius = radius - strokeWidth;
  const outerRadius = radius;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Titre (s’il y a) */}
      {title && (
        <div style={{
          marginBottom: "10px",
          fontWeight: "bold",
          fontSize: "16px",
          color: "#343C6A",
          fontFamily: "Inter, sans-serif"
        }}>
          {title}
        </div>
      )}

      {/* Donut avec texte au centre */}
      <div style={{ position: "relative", width: size, height: size }}>
        <PieChart width={size} height={size}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? fillColor : bgColor}
              />
            ))}
          </Pie>
        </PieChart>

        {/* % au centre */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontWeight: "bold",
          color: fillColor,
          fontSize: size / 5
        }}>
          {percentage}%
        </div>
      </div>
    </div>
  );
}

export default DonutProgress;
