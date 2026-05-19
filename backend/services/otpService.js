const crypto = require('crypto');

const otpStore = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of otpStore) {
        if (now > value.expiresAt) {
            otpStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

function generateOtp(userId) {
    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore.set(userId, {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0
    });
    console.log(`[OTP] User ${userId}: ${otp}`);
    return otp;
}

function verifyOtp(userId, otp) {
    const record = otpStore.get(userId);
    if (!record) return { valid: false, reason: 'No OTP found. Request a new one.' };
    if (Date.now() > record.expiresAt) {
        otpStore.delete(userId);
        return { valid: false, reason: 'OTP has expired. Request a new one.' };
    }
    record.attempts++;
    if (record.attempts > 5) {
        otpStore.delete(userId);
        return { valid: false, reason: 'Too many failed attempts. Request a new OTP.' };
    }
    if (record.otp !== otp) {
        return { valid: false, reason: `Invalid OTP. ${5 - record.attempts} attempts remaining.` };
    }
    otpStore.delete(userId);
    return { valid: true };
}

module.exports = { generateOtp, verifyOtp };
