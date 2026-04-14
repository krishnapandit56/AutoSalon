import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
    getInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem
} from '../controllers/inventory.controller.js';

const router = express.Router();

router.use(authMiddleware); // Protect all inventory routes

router.route('/')
    .get(getInventory)
    .post(addInventoryItem);

router.route('/:id')
    .put(updateInventoryItem)
    .delete(deleteInventoryItem);

export default router;
