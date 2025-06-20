import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import StatCard from "./StatCard";
import "./Stat.css";
import DonutProgress from "./Donut";
import QualiteChercheur from "./Qualite";
import ResearcherStatusChart from "./statut";
import DocumentsChart from "./Chart";
import TopResearcherTable from "./TopResearcherTable";
import HIndexChart from "./HIndexChart";
import StatFilter from "./StatFilter";

const data = [
    { name: "Esi", value: 40 },
    { name: "USTHB", value: 30 },
    { name: "UMBB", value: 20 },
    { name: "Autres", value: 10 }
];

const COLORS = ["#60F2CA", "#D27FFF", "#95A4FC", "#4880FF"];

function Stat() {
    const [showGeneral, setShowGeneral] = useState(true);

    const [stats, setStats] = useState(null);
    
    useEffect(() => {
        fetch("http://localhost:5000/api/General-Stats")
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            setStats(data);
            console.log("Top researchers:", data.top_chercheurs);
          })
          .catch(error => console.error("Error fetching stats:", error));
      }, []);      

    // Fonction qui sera passée au StatFilter pour basculer l'affichage
    const handleShowGeneral = (show = true) => {
        setShowGeneral(show);
    };

     // ✅ Prevent rendering before data is loaded
  if (!stats) {
    return <p>Loading...</p>;
  }

  const conf_percentage = parseFloat((stats.conference / stats.total_conf * 100).toFixed(1));
  const journal_percentage = parseFloat((stats.journal / stats.total_conf * 100).toFixed(1));

    return (
        <div style={{ marginTop: "40px", display: "flex", flexDirection: "column", gap: "50px" }}>
      {/* Nouveau composant de filtre en haut */}
      <StatFilter onShowGeneral={handleShowGeneral} />
            
            {/* Contenu existant - maintenant conditionnel */}
            {showGeneral && (
                <>
                    <div className="first" style={{display:"flex"}}>
                        <div className="card"  >
                            <div className="cardLigne" >
                                <StatCard
                                    title="Chercheurs"
                                    number={stats.nb_chercheurs}
                                    style={{
                                        width: "200px", height: "120px",
                                        background: "linear-gradient(to bottom, #3ABCE7, #C1F0FF)",
                                        color: "white"
                                    }}
                                    textColor="white"
                                />

                                <StatCard
                                    title="Documents"
                                    number={stats.nb_pub}
                                    growth={stats.nb_pub_cet_annee}
                                    style={{
                                        width: "200px", height: "120px",
                                        background: "linear-gradient(to bottom, #3AE7E4, #E5FFFC)",
                                        color: "white"
                                    }}
                                    textColor="white"
                                />
                                <StatCard
                                    title="Collaborations"
                                    number={stats.nb_collabs}
                                    style={{
                                        width: "200px", height: "120px",
                                        background: "linear-gradient(to bottom, #4F99FA, #D4F1F6)",
                                        color: "white"
                                    }}
                                    textColor="white"
                                />

                                <StatCard
                                    title="H-index moyen"
                                    number={stats.avg_h_index}
                                    style={{
                                        width: "200px", height: "120px",
                                        background: "linear-gradient(to bottom, #C28BFC, #C1F0FF)",
                                        color: "white"
                                    }}
                                    textColor="white"
                                />
                            </div>
                        </div>
                        {/*
                        <div className="pie" style={{boxShadow:"0 4px 12px rgba(0,0,0,0.1)",maxWidth:" 100%"}}>
                            <div className="pie-content">
                                <div className="left" style={{ display: "flex", flexDirection: "column" }}>
                                    <h3>Etablissement d'origine</h3>
                                    <div className="custom-legend">
                                        {data.map((entry, index) => (
                                            <div key={index} className="legend-item">
                                                <span className="legend-color" style={{ backgroundColor: COLORS[index] }}></span>
                                                <span className="legend-text">{entry.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <PieChart width={300} height={400} className="piechart">
                                    <Pie
                                        data={data}
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={70}
                                        outerRadius={100} 
                                        fill="#8884d8" 
                                        label 
                                        paddingAngle={5}
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </div>
                        </div>
                        */}
                    </div>

                    <div style={{display:"flex", flexDirection:"row", alignItems:"center"}}>
                        <div className="second" style={{
                            display: "flex", flexDirection: "row", gap: "40px", backgroundColor: "white",
                            borderRadius: "20px", width: "fit-content", padding: "40px", scale: "0.9",
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <DonutProgress percentage={journal_percentage} size={150} fillColor="#FE718E" title="journal" />
                            <DonutProgress percentage={conf_percentage} size={150} fillColor="#8744E1" title="conference" />
                        </div>

                        <div style={{scale:"0.8", marginRight:"40px"}}>
                            <QualiteChercheur ens_chercheur={stats.ens_chercheur} chercheur={stats.chercheur} doctorant={stats.doctorant}/>
                        </div>
                        <div style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}>
                            <ResearcherStatusChart actif={stats.chercheurs_actifs} non_actif={stats.chercheurs_non_actifs}/>
                        </div>
                    </div>

                    <div style={{marginTop:"-55px"}}>
                        <DocumentsChart/>
                    </div>

                    {/* Bottom section with tables */}
                    <div className="tablesstat" style={{display:"flex",flexDirection:"row",marginTop:"-30px"}} >
                        <TopResearcherTable topResearchers={stats.top_chercheurs || []} />
                        <HIndexChart codesign={stats.h_codesign} eiah={stats.h_EIAH} image={stats.h_Image} msi={stats.h_MSI} opt={stats.h_OPT} sures={stats.h_SURES}/>
                    </div>
                </>
            )}
           
   
                
                
                
        </div>
    );
}

export default Stat;