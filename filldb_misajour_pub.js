const mysql = require("mysql2");
const fs = require("fs");
// Create MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "02112005",
  database: "lmcs",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL");
});

const rawData = fs.readFileSync("merged_output.json");
const jsonData = JSON.parse(rawData);

//-------------------------------------------------------------------------------------------------

const nameCorrections = {
  riad: "riyadh",
  sitayeb: "si tayeb",
  mohamed: "mohammed",
  "abd errahmane": "abderrahmane",
  "el hachemi": "elhachemi", // Éviter les différence
};

const lmcs = [
  "abdmeziem mohammed riyadh",
  "abdellaoui sabrina",
  "amrouche hakim",
  "artabaz saliha",
  "benatchba karima",
  "bessedik malika",
  "abdelrahmane bellahreche",
  "boukhedimi sohila",
  "adel boukhadra",
  "bousbia nabila",
  "boussaha ryma",
  "chalal rachid",
  "cherid nacera",
  "dahamni foudil",
  "dakiche narimene",
  "dellys hachemi nabil",
  "faisal touka",
  "abdessamed ghomari reda",
  "elhachemi guerrout",
  "hamani nacer",
  "haroun hayat",
  "bouzidi hassini sabrina",
  "amine kechid",
  "boualem khelouat",
  "khelifati larabi si",
  "adel kermi",
  "koudil mouloud",
  "mahiou ramdane",
  "fahima nader",
  "benbouzid fatima si tayeb",
];
// j'ai fait cett liste qui contient les noms des chercheurs de lmcs pur filrer le nom

function normalizeName(name) {
  return name
    .toLowerCase() // Convertir en minuscules
    .replace(/-/g, " ") // Remplacer les tirets par des espaces
    .replace(/\s+/g, " ") // Supprimer les espaces en trop
    .trim() // Supprimer les espaces au début et à la fin
    .split(" ") // Séparer les mots
    .map((word) => nameCorrections[word] || word) // Remplacer les variantes
    .sort() // Trier les mots pour éviter les inversions
    .join(" "); // Reformer la chaîne normalisée
}

async function checkexistname_lmcs(name) {
  const nam1 = normalizeName(name)
    .split(" ")
    .filter((word) => word.length > 1); // Normaliser et filtrer les mots
  if (nam1.length > 1) {
    for (let z = 0; z < nam1.length; z++) {
      const nomTrouve = lmcs.find((nom) => nom.includes(nam1[z])); // Trouver un nom correspondant dans lmcs
      if (nomTrouve) {
        // Vérifier si nomTrouve est défini
        const n = nomTrouve.split(" ").filter((word) => word.length > 2);
        const name2 = nam1.splice(z, 1);
        const meme = n.some((val) => nam1.includes(val)); // Vérifier si un mot correspond
        if (meme) {
          return nomTrouve; // Retourner le nom trouvé
        } else {
          const nomtrouv2 = lmcs.find((nom) => nom.includes(nam1));
          if (nomtrouv2) {
            const n2 = nomtrouv2.split(" ").filter((word) => word.length > 2);
            const meme2 = n2.some((val) => name2.includes(val));
            if (meme2) {
              return nomtrouv2;
            } else {
              return null;
            }
          } else {
            return null;
          }
        }
      }
    }
    return null; // Retourner null si aucun nom n'est trouvé
  } else {
    const nomTrouve = lmcs.find((nom) => nom.includes(nam1[0]));
    if (nomTrouve) {
      return nomTrouve;
    } else {
      return null;
    }
  }
}

//-------------------------------------------------------------------------------------------------

async function insertData() {
  let chercheurId;
  for (const author of jsonData.authors) {
    
      const element = normalizeName(author.name)
      let cherid;
    
      const [row11] = await db
        .promise()
        .query("SELECT chercheur_id FROM chercheur WHERE normaliz = ?", [
          normalizeName(author.name),
        ]);

      if (row11.length > 0) {
        chercheurId = row11[0].chercheur_id;
      } else {
        const [result1] = await db
          .promise()
          .query(
            `INSERT IGNORE INTO chercheur (normaliz,nom_complet, intern) VALUES ( ?,?, ?)`,
            [element, author.name || "Unknown", true]
          );
        chercheurId = result1.insertId;
      }
     

      for (const pub of author.publications) {
        const venueDetails = pub.venue_details?.scimago || {};
        let confId;
        let pubid;
        let tit =pub.venue_details?.scimago?.title || pub.venue;
        
        const [confRow] = await db
          .promise()
          .query(`SELECT conf_id FROM conf_journal WHERE nom = ?`, [tit]);
         //console.log(confRow)
        if (confRow.length > 0) {
          confId = confRow[0].id;
        } else {
          // Skip acronym generation if 'tit' is purely numeric (e.g., "2023" → keep as-is)
          if (/^\d+$/.test(tit.trim())) {
            confId = tit.trim();
          } else {
            // Normalize and clean the title
            const cleanTitle = tit
              .normalize("NFD") // Convert accents to separate characters
              .replace(/[\u0300-\u036f]/g, "") // Remove accent characters
              .replace(/[^a-zA-Z\s]/g, "") // Remove ALL non-letters (keeps spaces)
              .trim();

            // Handle numeric-only titles
            if (/^\d+$/.test(cleanTitle)) {
              confId = cleanTitle;
            }
            // Use full word if single valid word (≥2 letters)
            else if (!cleanTitle.includes(" ") && cleanTitle.length >= 2) {
              confId = cleanTitle.toUpperCase();
            }
            // Generate acronym for multi-word titles
            else {
              const words = cleanTitle
                .toUpperCase()
                .split(/\s+/)
                .filter((word) => word.length >= 2);

              confId = words
                .map((word) => word.charAt(0))
                .join("")
                .slice(0, 5);

              // Fallback if no valid words
              if (!confId) confId = "CONF";
            }

            // Duplicate check (skip for numeric/single-word IDs)
            if (confId !== cleanTitle && confId !== tit.trim()) {
              const [res] = await db
                .promise()
                .query(
                  "SELECT COUNT(*) AS count FROM conf_journal WHERE conf_id LIKE ?",
                  [`${confId}%`]
                );
              if (res[0].count > 0) {
                confId = `${confId}${res[0].count + 1}`;
              }
            }
          }
          let subjectAreas = pub.venue_details?.scimago?.subject_area_and_category || ["unknown"];
          const subjectAreaString =  Object.keys(subjectAreas).join(', ');
 
          const [resC] = await db
          .promise()
          .query(
            `INSERT IGNORE INTO conf_journal (conf_id, nom, type, thematique, scope, lieu, periodicite) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              confId,
              tit,
              venueDetails?.publication_type || "Conf/Journal",
              subjectAreaString,
              venueDetails?.scope || null,
              venueDetails?.country || null,
              venueDetails?.coverage || null,
            ]
          );
        
        }
        //console.log(`le conf ${confId} est inseré`);
        
        const quartilesData = JSON.stringify({
          year: pub.venue_details?.scimago?.quartiles?.year || null,
          quartile: pub.venue_details?.scimago?.quartiles?.quartile || null,
          lien: pub.venue_details?.scimago?.url || null,
        });
         
          
          
            const dgrsdtData = JSON.stringify({
              quartile: pub.venue_details?.dgrsdt?.Category || null,
            });
         

          await db
            .promise()
            .query(
              `INSERT IGNORE INTO classement (conf_id, Scimago , DGRSDT ) VALUES (?, ? , ?)`,
              [confId, quartilesData, dgrsdtData]
            );
       

        const [pubRow] = await db
          .promise()
          .query(`SELECT pub_id , titre FROM publication WHERE titre = ?`, [
            pub.title ,
          ]);
         
        if (pubRow.length > 0) {
          pubid = pubRow[0].pub_id;
        } else {
          // Normalize and clean the publication title
          const cleanTitle = pub.title
            .normalize("NFD") // Convert accents to separate characters
            .replace(/[\u0300-\u036f]/g, "") // Remove accent characters
            .replace(/[^a-zA-Z\s]/g, "") // Remove ALL non-letters (keeps spaces)
            .trim();

          // Handle numeric-only titles
          if (/^\d+$/.test(cleanTitle)) {
            pubid = cleanTitle;
          }
          // Use full word if single valid word (≥3 letters for publications)
          else if (
            !cleanTitle.includes(" ") &&
            cleanTitle.length >= 3 // More lenient than conferences
          ) {
            pubid = cleanTitle.toUpperCase().slice(0, 12); // Longer max for publications
          }
          // Generate acronym for multi-word titles
          else {
            const words = cleanTitle
              .toUpperCase()
              .split(/\s+/)
              .filter((word) => word.length >= 3); // Longer words for publications

            pubid = words
              .map((word) => word.charAt(0))
              .join("")
              .slice(0, 6); // 6-letter max for publications

            // Fallback if no valid words
            if (!pubid) pubid = "PUB" + Math.floor(Math.random() * 90 + 10); // PUB+random 2 digits
          }

          // Duplicate check (skip for numeric/single-word IDs)
          if (pubid !== cleanTitle && pubid !== pub.title.trim()) {
            const [results] = await db.promise().query(
              `SELECT COUNT(*) AS count FROM publication 
                    WHERE pub_id LIKE ? OR pub_id = ?`,
              [`${pubid}%`, pubid] // More thorough duplicate check
            );

            if (results[0].count > 0) {
              // Smarter numbering: try 1-9 first, then 10-99 if needed
              for (let i = 1; i <= 99; i++) {
                const testId = i <= 9 ? `${pubid}${i}` : `${pubid}${i}`;
                const [check] = await db
                  .promise()
                  .query(
                    `SELECT COUNT(*) AS count FROM publication WHERE pub_id = ?`,
                    [testId]
                  );
                if (check[0].count === 0) {
                  pubid = testId;
                  break;
                }
              }
            }
          }
         

          const [resP] = await db
            .promise()
            .query(
              `INSERT IGNORE INTO publication (pub_id, conf_id, titre, lien, nombre_pages, volume, Annee) VALUES (?,?, ?, ?, ?, ?, ?)`,
              [
                pubid,
                confId,
                pub.title || "Unknown title",
                pub.url || null,
                pub.pages || null,
                pub.volume || null,
                pub.year || null,
              ]
            );
        }
         
        await db
              .promise()
              .query(
                `INSERT IGNORE INTO chercheur_publication (chercheur_id, pub_id) VALUES (?, ?)`,
                [chercheurId, pubid]
              );
        for (const cher of pub.authors) {
          const elem = await checkexistname_lmcs(cher);
          if (elem === null) {
            const [row2] = await db
              .promise()
              .query("SELECT chercheur_id FROM chercheur WHERE normaliz  = ?", [
                normalizeName(cher),
              ]);
            if (row2.length > 0) {
              cherid = row2[0].chercheur_id;
            } else {
              const [result2] = await db
                .promise()
                .query(
                  `INSERT IGNORE INTO chercheur (normaliz,nom_complet, intern) VALUES ( ?,?, ?)`,
                  [normalizeName(cher), cher || "Unknown name", false]
                );
              cherid = result2.insertId;
            }
          } else {
            const [row] = await db
              .promise()
              .query("SELECT chercheur_id FROM chercheur WHERE normaliz = ?", [
                normalizeName(cher),
              ]);
            if (row.length > 0) {
              cherid = row[0].chercheur_id;
            }
          }
          //
           //console.log(`le cher ${elem} est inseré a la position ${cherid}`)
          if (cherid && pubid) {
            await db
              .promise()
              .query(
                `INSERT IGNORE INTO chercheur_publication (chercheur_id, pub_id) VALUES (?, ?)`,
                [cherid, pubid]
              );
          }
        }
      }
    
  }
  console.log("Data inserted successfully!");
  db.end();
}
insertData().catch((err) => console.error(err));












