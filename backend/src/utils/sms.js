import twilio from 'twilio';

let twilioClient;

export const getTwilioClient = () => {
    if (!twilioClient) {
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            console.warn('⚠️ Twilio config missing! SMS will be disabled.');
            return null;
        }
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
    return twilioClient;
};

export const sendBookingConfirmation = async (phone, customerName, service, time) => {
    const client = getTwilioClient();
    if (!client) return false;

    try {
        const formattedPhone = phone.startsWith('+') ? phone : '+91' + phone;
        const msg = `Hi ${customerName}! Your AutoSalon appointment for ${service} is confirmed for ${time}.`;
        
        await client.messages.create({
            body: msg,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
        });
        return true;
    } catch (error) {
        console.error('Failed to send SMS:', error.message);
        return false;
    }
};
