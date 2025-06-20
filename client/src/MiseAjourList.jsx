import React, { useEffect, useState } from "react";
import { toast } from "react-toastify"; // Added missing import
import 'react-toastify/dist/ReactToastify.css';
function MiseAjourList({ isDirector, onUpdateComplete }) {
  const [miseData, setMiseData] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false); // Added missing state
  const [lastUpdate, setLastUpdate] = useState(null); // Added missing state

  // Fetch data from API and adjust timestamp to GMT+1
  useEffect(() => {
    fetch("http://localhost:5000/api/mises-a-jour")
      .then((res) => res.json())
      .then((data) => {
        const adjusted = data.map(({ role, timestamp }) => {
          const date = new Date(timestamp);
          const formatted = date.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          return { role, timestamp: formatted };
        });
        setMiseData(adjusted);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  // Handle the "Mettre à jour" button click
  const handleUpdate = async () => {
    // Set loading state
    setIsUpdating(true);
    
    try {
      // Get auth data from localStorage
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      // Check auth status
      if (!user || !token) {
        toast.error("Vous devez être connecté pour effectuer une mise à jour!");
        setIsUpdating(false); // Reset loading state
        return;
      }

      if (!user.role) {
        toast.error("Aucun rôle trouvé pour l'utilisateur.");
        setIsUpdating(false); // Reset loading state
        return;
      }

      // Show update confirmation dialog
      const confirmUpdate = window.confirm(
        "Voulez-vous lancer la mise à jour de la base de données? Cette opération peut prendre plusieurs minutes."
      );
      
      if (!confirmUpdate) {
        setIsUpdating(false);
        return;
      }

      // Show progress notification
      const toastId = toast.loading("Mise à jour en cours. Veuillez patienter...");
      
      // Make API request
      const response = await fetch("http://localhost:5000/api/mise-a-jour", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ role: user.role }),
      });

      // Parse response data
      const result = await response.json();
      
      if (response.ok) {
        // Update success
        toast.update(toastId, { 
          render: "Mise à jour réussie !", 
          type: "success", 
          isLoading: false,
          autoClose: 5000
        });
        
        // Add entry to update history
        const newUpdate = {
          role: user.role,
          timestamp: new Date().toLocaleString("fr-FR"),
          status: "success",
          details: result.stats
        };
        
        setMiseData(prevData => [newUpdate, ...prevData]);
        
        // Optionally refresh data
        if (onUpdateComplete && typeof onUpdateComplete === 'function') {
          onUpdateComplete(result);
        }
        
        // Update last update timestamp
        setLastUpdate(new Date().toLocaleString("fr-FR"));
        
      } else {
        // Handle API error
        console.error("Update API error:", result);
        toast.update(toastId, { 
          render: `Erreur: ${result.error || "Problème serveur"}`, 
          type: "error", 
          isLoading: false,
          autoClose: 5000
        });
        
        // Still record the failed attempt
        setMiseData(prevData => [{
          role: user.role,
          timestamp: new Date().toLocaleString("fr-FR"),
          status: "failed",
          error: result.error || "Unknown error"
        }, ...prevData]);
      }
    } catch (error) {
      // Handle network/connection errors
      console.error("Error during update:", error);
      toast.error("Erreur réseau, veuillez réessayer.");
    } finally {
      // Always reset loading state
      setIsUpdating(false);
    }
  };

  return (
    <div className="update-container">
      {/* Header with optional button */}
      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <h3 style={{ margin: 0 }}>Mises à jour</h3>
        {isDirector && (
          <button
            className="mise_a_jour"
            onClick={handleUpdate} // Trigger the update on click
            disabled={isUpdating} // Disable button while updating
            style={{
              backgroundColor: "#3beaB1",
              color: "white",
              borderRadius: "10px",
              border: "none",
              padding: "5px 10px",
              fontSize: "12px",
              cursor: isUpdating ? "not-allowed" : "pointer",
              marginTop: "5px",
              opacity: isUpdating ? 0.7 : 1,
            }}
          >
            {isUpdating ? "Mise à jour en cours..." : "Mettre à jour"}
          </button>
        )}
      </section>

      {/* Table or "No recent updates" message */}
      {miseData.length === 0 ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1, // Ensure the div takes up the full space
            minHeight: "150px", // Set a minimum height for the empty state
          }}
        >
          <p>Aucune mise à jour récente</p>
        </div>
      ) : (
        <table
          className="documents-table"
          style={{
            fontSize: "12px",
            borderCollapse: "collapse",
            width: "100%",
            tableLayout: "fixed",
          }}
        >
          <tbody>
            {miseData.map(({ role, timestamp, status }, index) => (
              <tr key={index} style={{ cursor: "default" }}>
                <td
                  style={{
                    width: "30px",
                    padding: "4px",
                    cursor: "default",
                  }}
                >
                  <img src="/updated.png" alt="update" height="15" width="15" />
                </td>
                <td
                  style={{
                    padding: "4px",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    cursor: "default",
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{role}</div>
                  <div style={{ fontSize: "10px", color: "gray" }}>
                    {timestamp}
                    {status && status !== "success" && (
                      <span style={{ color: "red", marginLeft: "5px" }}>(échec)</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MiseAjourList;