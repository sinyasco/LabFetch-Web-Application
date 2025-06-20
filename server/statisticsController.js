const db = require("./config/db"); // ta connexion MySQL

exports.getResearcherStats = async (req, res) => {
  const { criteria } = req.body;

  try {
    let query = `SELECT COUNT(*) as total, 
                SUM(CASE WHEN `;
    const values = [];
    const whereClauses = [];

    for (const crit of criteria) {
      switch (crit.description) {
        case "H-index supérieur à":
          whereClauses.push("chercheur.h_index > ?");
          values.push(Number(crit.value));
          break;
        case "Nombre de publications":
          whereClauses.push(`(
            SELECT COUNT(*) FROM chercheur_publication cp WHERE cp.id_chercheur = chercheur.id
          ) >= ?`);
          values.push(Number(crit.value));
          break;
        case "Établissement d'origine":
          whereClauses.push("chercheur.etablissement = ?");
          values.push(crit.value);
          break;
        case "Statut":
          whereClauses.push("chercheur.statut = ?");
          values.push(crit.value);
          break;
        case "Qualité":
          whereClauses.push("chercheur.qualite = ?");
          values.push(crit.value);
          break;
        case "Équipe":
          whereClauses.push("chercheur.equipe = ?");
          values.push(crit.value);
          break;
        default:
          break;
      }
    }

    const where = whereClauses.length ? whereClauses.join(" AND ") : "1";
    query += `${where} THEN 1 ELSE 0 END) as matching FROM chercheur`;

    const [rows] = await db.query(query, values);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getPublicationStats = async (req, res) => {
    const { criteria } = req.body;
  
    try {
      let query = `SELECT COUNT(*) as total, 
                  SUM(CASE WHEN `;
      const values = [];
      const whereClauses = [];
  
      for (const crit of criteria) {
        switch (crit.description) {
          case "Type de publication":
            whereClauses.push("publication.type = ?");
            values.push(crit.value);
            break;
          case "Année de publication":
            whereClauses.push("publication.annee = ?");
            values.push(Number(crit.value));
            break;
          case "Thématique":
            whereClauses.push("publication.thematique = ?");
            values.push(crit.value);
            break;
          case "Classement QUALIS":
            whereClauses.push("pub_classement.qualis = ?");
            values.push(crit.value);
            break;
          case "Classement Scimago":
            whereClauses.push("pub_classement.scimago = ?");
            values.push(crit.value);
            break;
          case "Classement CORE":
            whereClauses.push("pub_classement.core = ?");
            values.push(crit.value);
            break;
          case "Classement DGRSDT":
            whereClauses.push("pub_classement.dgrsdt = ?");
            values.push(crit.value);
            break;
          case "périodicité":
            const [start, end] = crit.value.split("-");
            whereClauses.push("publication.annee BETWEEN ? AND ?");
            values.push(Number(start.trim()), Number(end.trim()));
            break;
          case "Nombre de pages supérieur à":
            whereClauses.push("publication.nombre_pages > ?");
            values.push(Number(crit.value));
            break;
          default:
            break;
        }
      }
  
      const where = whereClauses.length ? whereClauses.join(" AND ") : "1";
      query += `${where} THEN 1 ELSE 0 END) as matching FROM publication
                LEFT JOIN pub_classement ON publication.id = pub_classement.id_publication`;
  
      const [rows] = await db.query(query, values);
      res.json(rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  };
  