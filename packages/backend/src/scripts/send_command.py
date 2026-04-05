import tinytuya
import sys
import json
import os

def send_command():
    try:
        # Extraer credenciales pasadas por entorno
        DEVICE_ID = os.environ.get("TUYA_DEVICE_ID", "")
        IP = os.environ.get("TUYA_IP", "")
        LOCAL_KEY = os.environ.get("TUYA_LOCAL_KEY", "")
        VERSION = float(os.environ.get("TUYA_VERSION", "3.3"))
        
        DP = os.environ.get("TUYA_DP", "")
        VALUE = os.environ.get("TUYA_VALUE", "")

        if not DEVICE_ID or not IP or not LOCAL_KEY or not DP:
            print(json.dumps({"error": "Faltan datos para enviar comando."}))
            return

        # Parsear value a boolean (o int si hiciera falta)
        if VALUE.lower() in ['true', '1']:
            val = True
        elif VALUE.lower() in ['false', '0']:
            val = False
        else:
            try:
                val = int(VALUE)
            except ValueError:
                val = VALUE

        # Conectar de manera genérica
        device = tinytuya.Device(DEVICE_ID, IP, LOCAL_KEY)
        device.set_version(VERSION)
        
        # Usamos set_value, la manera robusta de enviar comandos en tuya (calcula payload adecuado)
        data = device.set_value(DP, val)

        print(json.dumps({"status": "success", "response": data}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    send_command()
