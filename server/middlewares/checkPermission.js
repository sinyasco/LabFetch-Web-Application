import db from '../config/db.js'; // ✅ Récupère la connexion existante

const checkPermission = (role) => {
    return (req, res, next) => {
        const userRole = req.user.role;

        db.query('SELECT * FROM permissions WHERE role = ? AND route = ?', [userRole, req.path], (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Erreur serveur" });
            }
            if (results.length === 0) {
                return res.status(403).json({ message: "Accès refusé" });
            }
            next();
        });
    };
};

export default checkPermission;
