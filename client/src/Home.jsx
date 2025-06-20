import { React, useState, useEffect } from "react";
import Chart from "./Chart";
import DocumentsChart2 from "./Bar2";
import DocumentsContainer from "./DocumenetList";
import TipOfTheDay from "./Tip";
import StatCard from "./StatCard";
import Decoration from "./Decoration";
import MiseAjourList from "./MiseAjourList";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDisplay, faPhone, faEnvelope, faDirections } from '@fortawesome/free-solid-svg-icons';

// Home Page component
function Home({isDirector}) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/Stats") // Replace with your actual API endpoint
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

  return (
    /*
    <section className="dashboard-content">
      <div className="accueil"><p>Accueil</p></div>
      <div className="stats-container">
        <StatCard
          title="Chercheurs"
          icon="fa-circle-user"
          number={stats.nb_chercheurs}
        />
        
        <StatCard
          title="Documents"
          icon="fa-file"
          number={stats.nb_pub}
          growth={stats.nb_pub_cet_annee}
        />
        
        <StatCard
          title="Collaborations"
          icon="fa-handshake"
          number={stats.nb_collabs}
          className="highlight"
        />
        
        <StatCard
          title="Citations"
          icon="fa-clock"
          number="20402"
        />
      </div>
      <Chart />
      <DocumentsContainer />
    </section>*/
    <div style={{ display: "flex", marginTop: "100px" }}>
      <div className="c1" style={{ flex: "2" }}>

        <div className="welcome">

          <div>
            <h1 className="bienvenue">Bienvenue à LabFetch</h1>
            <p className="text_bienvenue">une application qui assure la collection automatique des documents</p>

            <div className="icons" >
              <div className="phone">
                <FontAwesomeIcon icon={faPhone} style={{ color: '#42b5fd' }} /> <p>023 93 91 30</p>
              </div>
              <div className="mail">
                <FontAwesomeIcon icon={faEnvelope} style={{ color: '#42b5fd' }} /> <p>lmcs@esi.dz</p>
              </div>
            </div>


          </div>

          <div className="dcr">
            <Decoration />
          </div>

        </div >

        <div style={{ display: "flex" }}>

          <div className="stats-container" style={{ flex: "1", display: "flex", flexDirection: "column" }}>
            <section style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
              <StatCard
                title="Chercheurs"
                
                style={{
                  height: "120px", width: "120px",
                  background: "linear-gradient(to bottom,rgb(190, 227, 241), #3ABCE7)",
                  color: "white"
                }}
                textColor="white"
                number={stats.nb_chercheurs}
                
              />

              <StatCard
                title="Documents"
               
                style={{

                  height: "120px", width: "120px",
                  background: "linear-gradient(to bottom, #C1F0FF, #3ABCE7)",
                  color: "white"
                }}
                textColor="white"
                number={stats.nb_pub}

              />
            </section>

            <section style={{ display: "flex", flexDirection: "row",gap:"8px" }}>
              <StatCard
                title="Collaborations"
                
                number={stats.nb_collabs}

                style={{
                  height: "120px", width: "120px",
                  background: "linear-gradient(to bottom, #C1F0FF, #3ABCE7)",
                  color: "white"
                }}
                textColor="white"
              />
              <StatCard
                title="H-index moyen"
                number={stats.avg_h_index}
                style={{
                  height: "120px", width: "120px",
                  background: "linear-gradient(to bottom, #C1F0FF, #3ABCE7)",
                  color: "white"
                }}
                textColor="white"
              />
            </section>



          </div>
          <div style={{ flex: "1" }}>
            <TipOfTheDay/>
            

          </div>


        </div>





      </div>

      <div style={{ flex: "1", paddingTop: "0%" }}>
        <div style={{ maxWidth: "400px", paddingTop: "0%" }}>
          <MiseAjourList isDirector={isDirector} />
        </div>
        <div >
          <DocumentsChart2 />
        </div>

      </div>
    </div>












  );
}

export default Home;
