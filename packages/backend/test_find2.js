import TuyaDiscovery from 'tuyapi/lib/find.js';

const discovery = new TuyaDiscovery();

console.log('Empezando a escanear con TS puro...');
discovery.start();

discovery.on('discover', device => {
  console.log('Dispositivo encontrado nativamente:', device);
});

setTimeout(() => {
  discovery.stop();
  console.log('Fin');
  process.exit(0);
}, 3000);
