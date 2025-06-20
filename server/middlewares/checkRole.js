import db from '../config/db.js';

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const userId = req.user.id;

        db.query('SELECT role FROM utilisateur  WHERE utilisateur.id = ?', 
        [userId], 
        (err, results) => {
            if (err) return res.status(500).json({ message: "Erreur serveur" });

            if (results.length === 0) {
                return res.status(403).json({ message: "Utilisateur non trouvé" });
            }

            const userRole = results[0].role;

            if (Array.isArray(allowedRoles)) {
                if (!allowedRoles.includes(userRole)) {
                    return res.status(403).json({ message: "Accès interdit" });
                }
            } else {
                if (userRole !== allowedRoles) {
                    return res.status(403).json({ message: "Accès interdit" });
                }
            }

            next();
        });
    };
};

export default checkRole;

