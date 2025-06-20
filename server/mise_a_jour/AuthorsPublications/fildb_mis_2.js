import mysql from "mysql2";
import fs from "fs";
import path from "path";

// Create MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "isaac",
  database: "lmcs",
});

// Wrap connection in a promise for easier async handling
const connectDB = () => {
  return new Promise((resolve, reject) => {
    db.connect((err) => {
      if (err) {
        console.error('Error connecting to the database:', err);
        reject(err);
      } else {
        console.log("Connected to MySQL");
        resolve();
      }
    });
  });
};

// Name corrections with improved mapping
const nameCorrections = {
  "riad": "riyadh",
  "sitayeb": "si tayeb",
  "mohamed": "mohammed",
  "abd errahmane": "abderrahmane",
  "el hachemi": "elhachemi"
};

// LMCS researchers list
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

/**
 * Normalize a name for consistent comparison
 * @param {string} name - The name to normalize
 * @returns {string} Normalized name
 */
function normalizeName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(word => nameCorrections[word] || word)
    .sort()
    .join(" ");
}

/**
 * Find or create an author in the database
 * @param {string} name - Author's full name
 * @returns {Promise<number>} Author's database ID
 */
async function findOrCreateAuthor(name) {
  // Try to find existing author
  const [existingRows] = await db
    .promise()
    .query(
      'SELECT chercheur_id FROM chercheur WHERE nom_complet = ? OR normaliz = ?', 
      [name, normalizeName(name)]
    );

  if (existingRows.length > 0) {
    // Update normalized name if needed
    await db
      .promise()
      .query(
        'UPDATE chercheur SET normaliz = ? WHERE chercheur_id = ?',
        [normalizeName(name), existingRows[0].chercheur_id]
      );
    
    return existingRows[0].chercheur_id;
  }

  // Insert new author
  try {
    const [insertResult] = await db
      .promise()
      .query(
        'INSERT INTO chercheur (normaliz, nom_complet, intern) VALUES (?, ?, ?)',
        [normalizeName(name), name, false]
      );
    
    return insertResult.insertId;
  } catch (error) {
    // If insertion fails (e.g., due to unique constraint), try finding again
    console.warn(`Could not insert author ${name}. Attempting to find existing entry.`);
    
    const [rows] = await db
      .promise()
      .query(
        'SELECT chercheur_id FROM chercheur WHERE nom_complet = ? OR normaliz = ?', 
        [name, normalizeName(name)]
      );
    
    if (rows.length > 0) {
      return rows[0].chercheur_id;
    }
    
    // If still can't find, rethrow the original error
    throw error;
  }
}

/**
 * Check if a name exists in the LMCS researchers list
 * @param {string} name - Name to check
 * @returns {Promise<string|null>} Matching LMCS researcher name or null
 */
async function checkExistNameLMCS(name) {
  const nam1 = normalizeName(name)
    .split(" ")
    .filter(word => word.length > 1);

  if (nam1.length <= 1) {
    const nomTrouve = lmcs.find(nom => nom.includes(nam1[0]));
    return nomTrouve || null;
  }

  for (let z = 0; z < nam1.length; z++) {
    const nomTrouve = lmcs.find(nom => nom.includes(nam1[z]));
    
    if (nomTrouve) {
      const n = nomTrouve.split(" ").filter(word => word.length > 2);
      const name2 = nam1.splice(z, 1);
      const meme = n.some(val => nam1.includes(val));
      
      if (meme) return nomTrouve;
      
      const nomtrouv2 = lmcs.find(nom => nom.includes(nam1.toString()));
      if (nomtrouv2) {
        const n2 = nomtrouv2.split(" ").filter(word => word.length > 2);
        const meme2 = n2.some(val => name2.includes(val));
        
        if (meme2) return nomtrouv2;
      }
    }
  }
  
  return null;
}

/**
 * Generate a unique publication or conference ID
 * @param {string} title - Title to generate ID from
 * @param {string} table - Database table to check for uniqueness
 * @param {string} idColumn - Column name for ID in the table
 * @returns {Promise<string>} Generated unique ID
 */
async function generateUniqueId(title, table, idColumn) {
  const cleanTitle = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim();

  // Handle numeric or single-word titles
  if (/^\d+$/.test(cleanTitle)) return cleanTitle;
  
  const words = cleanTitle
    .toUpperCase()
    .split(/\s+/)
    .filter(word => word.length >= 2);

  let baseId = words
    .map(word => word.charAt(0))
    .join("")
    .slice(0, 5);

  // Fallback for no valid words
  if (!baseId) baseId = table === 'publication' ? "PUB" : "CONF";

  // Check for existing IDs
  const [results] = await db
    .promise()
    .query(
      `SELECT COUNT(*) AS count FROM ${table} WHERE ${idColumn} LIKE ?`,
      [`${baseId}%`]
    );

  if (results[0].count === 0) return baseId;

  // Generate unique ID with numbering
  for (let i = 1; i <= 99; i++) {
    const testId = i <= 9 ? `${baseId}${i}` : `${baseId}${i}`;
    const [check] = await db
      .promise()
      .query(
        `SELECT COUNT(*) AS count FROM ${table} WHERE ${idColumn} = ?`,
        [testId]
      );
    
    if (check[0].count === 0) return testId;
  }

  // Fallback in extremely unlikely case of 99 duplicates
  return `${baseId}${Math.floor(Math.random() * 900 + 100)}`;
}

/**
 * Main data insertion function
 */
async function insertData() {
  try {
    // Read JSON data from the specific path
    const jsonFilePath = "dblp_lmcs.json";
    const rawData = fs.readFileSync(jsonFilePath, 'utf8');
    const jsonData = JSON.parse(rawData);

    // Process each author
    for (const author of jsonData.authors) {
      // Find or create the main author
      const mainAuthorId = await findOrCreateAuthor(author.name);

      // Process publications
      for (const pub of author.publications) {
        // Generate or find conference/journal ID
        const venueDetails = pub.venue_details?.scimago || {};
        const tit = venueDetails?.title || pub.venue;
        
        const confId = await generateUniqueId(tit, 'conf_journal', 'conf_id');

        // Insert conference/journal if not exists
        await db
          .promise()
          .query(
            `INSERT IGNORE INTO conf_journal 
            (conf_id, nom, type, thematique, scope, lieu, periodicite) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              confId,
              tit,
              venueDetails?.publication_type || "Conf/Journal",
              pub.venue_details?.scimago?.subject_area_and_category ? 
                Object.keys(pub.venue_details.scimago.subject_area_and_category).join(', ') : 
                "Unknown",
              venueDetails?.scope || null,
              venueDetails?.country || null,
              venueDetails?.coverage || null
            ]
          );

        // Insert classification data
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
            'INSERT IGNORE INTO classement (conf_id, Scimago, DGRSDT) VALUES (?, ?, ?)',
            [confId, quartilesData, dgrsdtData]
          );

        // Generate or find publication ID
        const pubId = await generateUniqueId(pub.title, 'publication', 'pub_id');

        // Insert publication
        await db
          .promise()
          .query(
            `INSERT IGNORE INTO publication 
            (pub_id, conf_id, titre, lien, nombre_pages, volume, Annee) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              pubId,
              confId,
              pub.title || "Unknown title",
              pub.url || null,
              pub.pages || null,
              pub.volume || null,
              pub.year || null
            ]
          );

        // Link main author to publication
        await db
          .promise()
          .query(
            'INSERT IGNORE INTO chercheur_publication (chercheur_id, pub_id) VALUES (?, ?)',
            [mainAuthorId, pubId]
          );

        // Process co-authors
        for (const coAuthor of pub.authors) {
          // Skip if co-author is the main author
          if (normalizeName(coAuthor) === normalizeName(author.name)) continue;

          let coAuthorId;
          const lmcsAuthor = await checkExistNameLMCS(coAuthor);

          // Find or create co-author
          coAuthorId = await findOrCreateAuthor(coAuthor);

          // Link co-author to publication
          if (coAuthorId) {
            await db
              .promise()
              .query(
                'INSERT IGNORE INTO chercheur_publication (chercheur_id, pub_id) VALUES (?, ?)',
                [coAuthorId, pubId]
              );
          }
        }
      }
    }

    console.log("Data inserted successfully!");
  } catch (error) {
    console.error("Error during data insertion:", error);
    throw error; // Re-throw to ensure the process exits with an error code
  } finally {
    // Close the connection
    db.end();
  }
}

// First connect to the database, then insert data
async function main() {
  try {
    await connectDB();
    await insertData();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Execute the main function
main();