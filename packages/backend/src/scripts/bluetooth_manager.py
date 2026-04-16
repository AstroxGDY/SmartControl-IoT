# -*- coding: utf-8 -*-
import sys
import asyncio
import math
import json
import os
import warnings

# Reconfigurar stdout para UTF-8 (Crítico para Windows)
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    # Fallback para Python < 3.7
    pass

# REQUIREMENTS: pip install winsdk pycaw comtypes
try:
    import winsdk.windows.media.control as media_control
    from pycaw.pycaw import AudioUtilities
    import comtypes
except ImportError as e:
    print(json.dumps({"error": f"Faltan dependencias: {str(e)}. Ejecuta 'pip install winsdk pycaw comtypes'"}))
    sys.exit(1)

# Silenciar advertencias de dispositivos fantasma de Windows
warnings.filterwarnings("ignore", category=UserWarning, module="pycaw")

class ControlHardwareError(Exception):
    """Excepción personalizada para fallos de inyección AVRCP."""
    pass

async def get_paired_devices():
    """Escanea y devuelve una lista de dispositivos de audio emparejados."""
    try:
        # Inicializar COM para hilos secundarios
        comtypes.CoInitialize()
        devices = AudioUtilities.GetAllDevices()
        found = []
        seen_names = set()
        
        for d in devices:
            try:
                # Solo dispositivos ACTIVOS (d.state == 1)
                # El objeto es de tipo AudioDeviceState, lo comparamos con 1 (Active)
                if getattr(d.state, 'value', d.state) != 1:
                    continue

                name = d.FriendlyName
                if name and name not in seen_names:
                    found.append({
                        "name": name,
                        "id": d.id # Persistent ID
                    })
                    seen_names.add(name)
            except:
                continue
        return found
    except Exception as e:
        raise ControlHardwareError(f"Error escaneando dispositivos: {str(e)}")
    finally:
        comtypes.CoUninitialize()

async def get_media_state():
    """Obtiene el estado de reproducción y metadatos del SMTC de Windows."""
    manager = await media_control.GlobalSystemMediaTransportControlsSessionManager.request_async()
    session = manager.get_current_session()
    
    if not session:
        return {"status": "NONE", "title": "", "artist": ""}

    info = session.get_playback_info()
    status = info.playback_status.name if info else "UNKNOWN"
    
    try:
        props = await session.try_get_media_properties_async()
        return {
            "status": status,
            "title": props.title if props else "",
            "artist": props.artist if props else ""
        }
    except:
        return {"status": status, "title": "Unknown", "artist": "Unknown"}

def set_volume(target_id, target_name, percentage):
    """Inyecta volumen AVRCP 0x50 prioritizando ID sobre nombre."""
    if not (0 <= percentage <= 100):
        raise ControlHardwareError("El porcentaje debe estar entre 0 y 100.")

    comtypes.CoInitialize()
    try:
        devices = AudioUtilities.GetAllDevices()
        nivel_normalizado = percentage / 100.0
        
        target_found = False
        
        # PLAN A.1: Búsqueda focalizada por ID (Más preciso)
        if target_id:
            for d in devices:
                if d.id == target_id:
                    try:
                        d.EndpointVolume.SetMasterVolumeLevelScalar(nivel_normalizado, None)
                        return {"success": True, "method": "ID Match", "device": d.FriendlyName}
                    except Exception as e:
                        raise ControlHardwareError(f"Fallo al inyectar volumen por ID: {e}")

        # PLAN A.2: Búsqueda focalizada por nombre (Legacy/Fallback)
        if target_name:
            # ... rest of logic
            for d in devices:
                if d.FriendlyName and target_name.lower() in d.FriendlyName.lower():
                    try:
                        d.EndpointVolume.SetMasterVolumeLevelScalar(nivel_normalizado, None)
                        target_found = True
                        return {"success": True, "method": "Plan A", "device": d.FriendlyName}
                    except Exception as e:
                        raise ControlHardwareError(f"Fallo al inyectar volumen en {target_name}: {e}")

        # PLAN B: Fallback (Dispositivo predeterminado)
        if not target_found:
            try:
                altavoz = AudioUtilities.GetSpeakers()
                altavoz.EndpointVolume.SetMasterVolumeLevelScalar(nivel_normalizado, None)
                return {"success": True, "method": "Plan B (Fallback)", "device": "Default Speakers"}
            except Exception as e:
                raise ControlHardwareError("Inyección fallida. El hardware no expone el protocolo AVRCP Absolute Volume.")
    finally:
        comtypes.CoUninitialize()

async def run_command(command, value=None):
    """Ejecuta comandos multimedia usando Winsdk GlobalSystemMediaTransportControls."""
    manager = await media_control.GlobalSystemMediaTransportControlsSessionManager.request_async()
    session = manager.get_current_session()

    if not session:
        if command == "volume":
            # El volumen puede funcionar sin sesión media activa si el dispositivo está conectado
            return set_volume(os.environ.get("BT_DEVICE_ID"), os.environ.get("BT_DEVICE_NAME"), int(value))
        raise ControlHardwareError("No hay una sesión multimedia activa (Spotify, YouTube, etc.) para controlar.")

    try:
        if command == "play_pause":
            await session.try_toggle_play_pause_async()
            return {"success": True, "action": "play_pause"}
        elif command == "next":
            await session.try_skip_next_async()
            return {"success": True, "action": "next"}
        elif command == "prev":
            await session.try_skip_previous_async()
            return {"success": True, "action": "prev"}
        elif command == "volume":
            if value is None:
                raise ControlHardwareError("Se requiere un valor para el comando de volumen.")
            return set_volume(os.environ.get("BT_DEVICE_ID"), os.environ.get("BT_DEVICE_NAME"), int(value))
        else:
            raise ControlHardwareError(f"Comando desconocido: {command}")
    except Exception as e:
        raise ControlHardwareError(str(e))

async def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Faltan argumentos. Uso: scan | command <cmd> [valor]"}))
        return

    mode = sys.argv[1]

    try:
        if mode == "scan":
            devices = await get_paired_devices()
            print(json.dumps({"success": True, "devices": devices}))
        elif mode == "state":
            state = await get_media_state()
            print(json.dumps({"success": True, **state}))
        elif mode == "command":
            cmd = sys.argv[2]
            val = sys.argv[3] if len(sys.argv) > 3 else None
            result = await run_command(cmd, val)
            print(json.dumps(result))
        else:
            print(json.dumps({"error": f"Modo desconocido: {mode}"}))
    except ControlHardwareError as e:
        print(json.dumps({"error": str(e), "type": "ControlHardwareError"}))
    except Exception as e:
        print(json.dumps({"error": f"Fallo catastrófico: {str(e)}"}))

if __name__ == "__main__":
    asyncio.run(main())
