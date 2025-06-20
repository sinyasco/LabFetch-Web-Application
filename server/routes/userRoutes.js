import express from 'express';
import db from '../config/db.js';
import verifyToken from '../middlewares/verifyToken.js';
import checkRole from '../middlewares/checkRole.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// 🔹 Ajouter un utilisateur (seulement l'admin peut ajouter un utilisateur)
router.post('/add', verifyToken, checkRole('admin'), async (req, res) => {
    const { nom, email, password, role_id } = req.body;

    if (!nom || !email || !password || !role_id) {
        return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

     const hashedPassword = await bcrypt.hash(password, 10);

    const [rolname] = await db.promise().query(
       'SELECT role_name FROM roles WHERE id = ? ',[role_id]
    );
    
    const role = rolname.length > 0 ? rolname[0].role_name : "chercheur" ;
    
    const [usrname] = await db.promise().query(
        'SELECT chercheur_id FROM chercheur WHERE nom_complet = ? ',[nom]
     );
     
     const chercheur_id = usrname.length > 0 ? usrname[0].chercheur_id : null ;

    
    
      db.query(
        'INSERT IGNORE INTO utilisateur (chercheur_id ,nom, email, pasword, role_id,role ) VALUES ( ?, ?, ?, ?, ?, ?)',
        [chercheur_id ,nom, email, hashedPassword, role_id , role],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur serveur" });
            res.status(201).json({ message: "Utilisateur ajouté avec succès" });
            
        }
    );
    
     const [utitid] = await db.promise().query(
        'SELECT id FROM utilisateur WHERE nom = ? ',[nom]
     );   
     const id = utitid.length > 0 ? utitid[0].id : null ;

     await db.promise().query(
        "INSERT INTO logs (user_id, action) VALUES (?, ?)",
        [id, "Ajout d'un utilisateur"]
    );


});

// 🔹 Modifier un utilisateur (seulement l'admin)
router.put('/update/:id', verifyToken, checkRole('admin'), (req, res) => {
    const { nom, email, role} = req.body;
    const userId = req.params.id;
     console.log(nom+" "+email+" "+role+" "+userId)
    db.query(
        'UPDATE utilisateur SET nom = ?, email = ? WHERE id = ?',
        [nom, email, userId],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Erreur serveur" });
            res.json({ message: "Utilisateur mis à jour avec succès" });
        }
    );
});

// 🔹 Supprimer un utilisateur (seulement l'admin)
router.delete('/delete/:id', verifyToken, checkRole('admin'), (req, res) => {
    const userId = req.params.id;

    db.query('DELETE FROM utilisateur WHERE id = ?', [userId], (err, result) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        res.json({ message: "Utilisateur supprimé avec succès" });
    });
});

// 🔹 Liste des utilisateurs (accessible par l'admin et le directeur)
router.get('/', verifyToken, checkRole(['admin', 'directeur']), (req, res) => {
    db.query('SELECT * FROM utilisateur', (err, results) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        res.json(results);
    });
});

export default router;
