import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: { origin: "*" }
    });

    io.on('connection', (socket) => {
        console.log('User connected via Socket.IO:', socket.id);
        socket.on('disconnect', () => console.log('User disconnected'));
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
