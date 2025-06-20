const mysql = require('mysql2');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Create MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'isaac',
    database: 'lmcs'
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

const nameCorrections = {
    "riad": "riyadh",
    "sitayeb": "si tayeb",
    "mohamed": "mohammed",
    "abd errahmane": "abderrahmane"
};

const rawData = fs.readFileSync('merged_authors.json');
const jsonData = JSON.parse(rawData);

function normalizeName(name) {
    return name
        .toLowerCase()
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map(word => nameCorrections[word] || word)
        .sort()
        .join(' ');
}

async function insertData() {
    let chercheurId;
    // compt admin 
    const amidpass = '123456';
    const hashadminpass = await bcrypt.hash(amidpass, 10);
    
    const [resultUse] = await db.promise().query(
        `INSERT IGNORE INTO utilisateur (chercheur_id, nom, email, mot_de_passe, role, statut, changed) VALUES (?, ?, ?, ?, ?, 1, 0)`,
        [
            null,
            'admin',
            'admin@esi.dz',
            hashadminpass,
            'admin'
        ]
    );
    // copmte directeur
    const doctorepass = '123456';
    const hashdoctorpass = await bcrypt.hash(doctorepass, 10);
    
    const [resultU] = await db.promise().query(
        `INSERT IGNORE INTO utilisateur (chercheur_id, nom, email, mot_de_passe, role, statut, changed) VALUES (?, ?, ?, ?, ?, 1, 0)`,
        [
             null,
            'directeur',
            'directeur@esi.dz',
            hashdoctorpass,
            'directeur'
        ]
    );

    const assistanpass = '123456';
    const hashassistantpass = await bcrypt.hash(assistanpass, 10);
    
    const [resu] = await db.promise().query(
        `INSERT IGNORE INTO utilisateur (chercheur_id, nom, email, mot_de_passe, role, statut, changed) VALUES (?, ?, ?, ?, ?, 1, 0)`,
        [
             null,
            'assistant',
            'assistant@esi.dz',
            hashassistantpass,
            'assistant'
        ]
    );
    for (const author of jsonData.authors) {
        try {
            const { name, details } = author;
            const nom = name.firstName.charAt(0).toUpperCase() + name.firstName.slice(1).toLowerCase() + " " + name.lastName.charAt(0).toUpperCase() + name.lastName.slice(1).toLowerCase();
            //const image_cher = `/image/${nom.replace(/\s+/g, '').replace(/-/g, '').toLowerCase()}.jpg`;
            /*const mail = name.firstName[0].toLowerCase() + "_" + name.lastName.replace(/\s+/g, '').toLowerCase();
            const email = `${mail}@esi.dz`;*/

            const [row] = await db.promise().query(
                "SELECT chercheur_id FROM chercheur WHERE normaliz = ?",
                [normalizeName(nom)]
            );
            
            if (row.length > 0) {
                chercheurId = row[0].chercheur_id;
               // console.log(`Researcher '${nom}' already exists in 'chercheur' table.`);
            } else {
                const [result] = await db.promise().query(
                    `INSERT IGNORE INTO chercheur (normaliz, nom_complet, intern) VALUES (?, ?, ?)`,
                    [normalizeName(nom) || 'Unknown', nom || 'Unknown', true]
                );
                // if (result.affectedRows > 0) {
                //     console.log(`Researcher '${nom}' inserted successfully into 'chercheur' table.`);
                // } else {
                //     console.log(`Insertion ignored for researcher '${nom}' (possibly duplicate).`);
                // }
                chercheurId = result.insertId;
            }

            const sql = `
            INSERT INTO chercheur_lmcs (
                nom_complet, chercheur_id, email, telephone, diplome, etablissement, 
                qualite, grade, h_index, matricule, equipe, talent , dblp , scholar , researchgate ,linkedin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                email = VALUES(email),
                telephone = VALUES(telephone),
                diplome = VALUES(diplome),
                etablissement = VALUES(etablissement),
                qualite = VALUES(qualite),
                grade = VALUES(grade),
                h_index = VALUES(h_index),
                matricule = VALUES(matricule),
                equipe = VALUES(equipe),
                talent = VALUES(talent),
                dblp = VALUES(dblp),
                scholar = VALUES(scholar),
                researchgate = VALUES(researchgate),
                linkedin = VALUES(linkedin)
            `;
            
            const [resultLmcs] = await db.promise().query(sql, [
                nom || 'Unknown name',
                chercheurId || null,
                details.email || 'Unknown email',
                details.tele || null ,
                details.diplom|| null ,
                details.institution || null,
                details.qualite || null  ,
                details.grade || null,
                details.h_index || null,
                details?.matricule || null,
                details.research_team_name || null,
                details.profil_talents|| null,
                details.dplb|| null,
                details.scholar|| null,
                details.serch_gate|| null,
                details?.linkedin|| null,
            ]);
            console.log(`Researcher '${nom}' inserted successfully into 'chercheur_lmcs' table.`);

             
           
            // Hashing the password
            const plainPassword = '123456';
            const hashedPassword = await bcrypt.hash(plainPassword, 10);
            
            const [resultUser] = await db.promise().query(
                `INSERT IGNORE INTO utilisateur (chercheur_id, nom, email, mot_de_passe, role, statut, changed) VALUES (?, ?, ?, ?, ?, ?, 0)`,
                [
                    chercheurId,
                    nom,
                    details.email,
                    hashedPassword,
                    'chercheur',
                    1
                ]
            );
            // if (resultUser.affectedRows > 0) {
            //     console.log(`User account for researcher '${nom}' inserted successfully into 'utilisateur' table.`);
            // } else {
            //     console.log(`User account insertion ignored for '${nom}' (possibly duplicate).`);
            // }
        } catch (error) {
            console.error(`Error inserting researcher '${author.name.firstName} ${author.name.lastName}':`, error.message);
        }
    }
    console.log('All data processed successfully!');
    db.end();
}

insertData().catch(err => console.error(err));
