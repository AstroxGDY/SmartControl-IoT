export const PRESET_ICONS = [
  { id: 'bulb', path: '/icons/bulb.svg', label: 'Luz / Bombilla' },
  { id: 'plug', path: '/icons/plug.svg', label: 'Enchufe / Toma' },
  { id: 'fan', path: '/icons/fan.svg', label: 'Ventilador' },
  { id: 'thermo', path: '/icons/thermo.svg', label: 'Termómetro / Sensor' },
  { id: 'tv', path: '/icons/tv.svg', label: 'Televisión / Entretenimiento' },
  { id: 'camera', path: '/icons/camera.svg', label: 'Cámara / Visión' },
  { id: 'shield', path: '/icons/shield.svg', label: 'Seguridad / Sensor' },
  { id: 'mobile', path: '/icons/mobile.svg', label: 'Móvil / Tablet' }
];

export const getIconPath = (iconId: string) => {
  const icon = PRESET_ICONS.find(i => i.id === iconId);
  return icon ? icon.path : iconId; // Return ID if it's already a path or URL
};
