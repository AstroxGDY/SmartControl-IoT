import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const TuyaDiscovery = require('tuyapi/lib/find');

const discovery = new TuyaDiscovery();

console.log('Empezando a escanear con TS puro...');
discovery.start();

discovery.on('discover', device => {
  console.log('Viendo dispositivo:', device.ip, device.id);
});

setTimeout(() => {
  discovery.stop();
  console.log('Fin');
  process.exit(0);
}, 3000);
