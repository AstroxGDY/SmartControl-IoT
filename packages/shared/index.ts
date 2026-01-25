export interface Device {
  id: string;
  name: string;
  status: 'online' | 'offline';
}