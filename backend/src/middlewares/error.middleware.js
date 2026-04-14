export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // In a real prod setup, you'd hide details from users, but keep logs.
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};
