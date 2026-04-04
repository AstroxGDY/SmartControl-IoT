const TuyaDiscovery = require('tuyapi/lib/find.js');
const discovery = new TuyaDiscovery();

console.log('Empezando a escanear...');
discovery.start();

discovery.on('discover', device => {
  console.log('Aparece dispositivo:', device);
});

setTimeout(() => {
  discovery.stop();
  console.log('Fin');
}, 3000);
