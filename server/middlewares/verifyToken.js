import jwt from 'jsonwebtoken';

export default function verifyToken(req, res, next) {
    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ message: "Accès refusé. Token requis" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Stocke les infos de l'utilisateur dans `req.user`
        next();
    } catch (error) {
        res.status(401).json({ message: "Token invalide" });
    }
}



