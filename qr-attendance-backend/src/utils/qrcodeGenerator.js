const QRCode = require('qrcode');

/**
 * Verilen metinden Base64 formatında QR kodu Data URL'si oluşturur.
 * @param {string} text QR kodun içereceği metin (Bu bizim tam URL'imiz olacak).
 * @returns {Promise<string>} Base64 Data URL
 */
exports.genDataUrl = async (text) => {
    try {
        // KRİTİK: text'in tam HTTP/HTTPS URL'si olması gerekir.
        // qrcode kütüphanesi, tam URL gördüğünde otomatik olarak link formatında QR üretir.
        return await QRCode.toDataURL(text, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            margin: 1, 
        });
    } catch (err) {
        console.error('QR code generation failed:', err);
        throw new Error('QR kodu oluşturulamadı.');
    }
};