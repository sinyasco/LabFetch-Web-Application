import mysql from 'mysql2';

// ✅ Création d'une seule connexion (réutilisée partout)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'isaac',
    database: 'lmcs'
});

db.connect(err => {
    if (err) {
        console.error('❌ Erreur de connexion à la BDD:', err);
        process.exit(1); // Arrête le serveur en cas d'échec
    }
    console.log('✅ Connecté à MySQL');
});

// Add promise support to your existing db connection
db.promiseQuery = (sql, params) => {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  };

export default db; // ✅ On exporte la connexion pour la réutiliser
