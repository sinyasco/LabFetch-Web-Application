
import express from "express";
const router = express.Router();
import { getResearcherStats, getPublicationStats } from "./statisticsController";

router.post("/researchers", getResearcherStats);
router.post("/publications", getPublicationStats);

export default router;
