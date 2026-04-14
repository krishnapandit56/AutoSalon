import Inventory from '../models/Inventory.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getInventory = catchAsync(async (req, res) => {
    const inventory = await Inventory.find();
    res.status(200).json(inventory);
});

export const addInventoryItem = catchAsync(async (req, res) => {
    const { name, quantity } = req.body;
    const item = new Inventory({ name, quantity });
    await item.save();
    res.status(201).json(item);
});

export const updateInventoryItem = catchAsync(async (req, res) => {
    const { quantity } = req.body;
    const item = await Inventory.findByIdAndUpdate(
        req.params.id, 
        { quantity }, 
        { new: true, runValidators: true }
    );
    res.status(200).json(item);
});

export const deleteInventoryItem = catchAsync(async (req, res) => {
    await Inventory.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Item deleted' });
});
