import cron from 'node-cron';
import Slot from '../models/Slot.js';
import { getIO } from '../sockets/socket.js';

export const cleanUpHolds = async () => {
    const now = new Date();
    const expiredSlots = await Slot.find({ status: 'held', holdExpiry: { $lt: now } });
    if (expiredSlots.length > 0) {
        for (const slot of expiredSlots) {
            await Slot.updateOne({ _id: slot._id }, { $set: { status: 'available', heldBy: null, holdExpiry: null } });
            getIO().emit('slot-updated', { slotId: slot._id, status: 'available' });
        }
        console.log(`🧹 Cleanup: Released ${expiredSlots.length} expired holds.`);
    }
};

export const startCronJobs = () => {
    // Run hold cleanup every 30 seconds
    setInterval(cleanUpHolds, 30 * 1000);

    // Reset all slots (except booked) at 11PM daily
    cron.schedule('0 23 * * *', async () => {
        try {
            await Slot.updateMany({ status: { $ne: 'booked' } }, { $set: { status: 'available', heldBy: null, holdExpiry: null } });
            console.log('⏳ Daily Reset: Slots freed successfully.');
        } catch(err) {
            console.error('Error during daily slot reset:', err);
        }
    });
};
