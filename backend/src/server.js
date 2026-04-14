import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './sockets/socket.js';
import { startCronJobs } from './jobs/cron.jobs.js';
import Slot from './models/Slot.js';

// 1. Connect to Database
await connectDB();

// Cleanup orphaned holds synchronously during startup
const oldHeldSlots = await Slot.countDocuments({ status: 'held' });
if (oldHeldSlots > 0) {
    await Slot.updateMany({ status: 'held' }, { $set: { status: 'available', heldBy: null, holdExpiry: null } });
    console.log(`🧹 Startup Cleanup: Freed frozen slots.`);
}

// Ensure mock slots exist
const generateMockSlots = async () => {
    const existingCount = await Slot.countDocuments();
    if (existingCount > 0) return;
    
    await Slot.deleteMany({});
    const formatTime = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const ampm = h >= 12 && h < 24 ? 'pm' : 'am';
        let displayH = h % 12;
        if (displayH === 0) displayH = 12;
        return m === 0 ? displayH + ampm : displayH + '.' + m + ' ' + ampm;
    };

    const slots = [];
    for (let time = 660; time <= 1320; time += 30) {
        slots.push({ time: formatTime(time) });
    }
    await Slot.insertMany(slots);
    console.log('Mock slots generated.');
};
await generateMockSlots();

// 2. Setup HTTP Server & Sockets
const httpServer = createServer(app);
initSocket(httpServer);

// 3. Start Background Jobs
startCronJobs();

// 4. Start Listening
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
