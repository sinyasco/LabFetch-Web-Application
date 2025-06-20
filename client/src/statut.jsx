import React from "react";

const ResearcherStatus = ({actif, non_actif}) => {
    return (
        <div style={{
            fontFamily: "Arial, sans-serif",
            padding: "20px",
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderRadius: "8px",
            width:"fit-content",
            backgroundColor: "white",
            scale:"1.2"
        }}>
            <div style={{marginBottom:"40px"}}>
                <h3 style={{ marginTop: 0, color: "#333" }}>Statut </h3>
                <p>des chercheurs</p>
            </div>


            <div style={{ marginBottom: "15px" }}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap:"20px"
                }}>
                    <span>Actif</span>
                    <img src="/Group 5.png" alt="" />
                    <strong>{actif}</strong>   {/*hna dir l api */}
                </div>
            </div>

            <div>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap:"20px"
                }}>
                    <span>Non Actif</span>
                    <img src="/Group 5 (1).png" alt="" />
                    <strong>{non_actif}</strong>  {/*hna dir l api */}
                </div>
            </div>
        </div>
    );
};

export default ResearcherStatus;