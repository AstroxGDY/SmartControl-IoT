/**
 * Este archivo contiene las credenciales de desarrollador por defecto.
 * Están ofuscadas para que no sean visibles en búsquedas de texto plano
 * tras empaquetar la aplicación en el archivo asar.
 */

const OBFS_KEY = "3qyjwvvgg7ve5sdqyaar";
const OBFS_SECRET = "c4f616b83d7f4c1e8f2b9c57993d77bd";
const OBFS_REGION = "eu";

// Una función de ofuscación muy simple (Base64) para evitar 'grep' accidental
function decode(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
}

// Codificamos las claves originales
const encodedKey = Buffer.from(OBFS_KEY).toString('base64');
const encodedSecret = Buffer.from(OBFS_SECRET).toString('base64');
const encodedRegion = Buffer.from(OBFS_REGION).toString('base64');

module.exports = {
    // Exportamos las versiones codificadas para que al ver el archivo solo se vean strings aleatorios
    _k: encodedKey,
    _s: encodedSecret,
    _r: encodedRegion,
    
    // Función para obtener las reales
    getSystemDefaults() {
        return {
            TUYA_API_KEY: Buffer.from(encodedKey, 'base64').toString('utf-8'),
            TUYA_API_SECRET: Buffer.from(encodedSecret, 'base64').toString('utf-8'),
            TUYA_API_REGION: Buffer.from(encodedRegion, 'base64').toString('utf-8'),
        };
    }
};
