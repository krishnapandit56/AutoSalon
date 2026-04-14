import express from 'express';
import { getChurnData, predictChurn, getAdvancedAnalytics, getMongoAnalytics } from '../controllers/analytics.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/churn', getChurnData);
router.post('/churn/predict', predictChurn);
router.get('/advanced-analytics', getAdvancedAnalytics);
router.get('/mongo-analytics', getMongoAnalytics);

export default router;
