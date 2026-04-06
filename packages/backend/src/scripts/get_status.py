import tinytuya
import sys
import json
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def get_status():
    try:
        DEVICE_ID = os.environ.get("TUYA_DEVICE_ID", "")
        IP = os.environ.get("TUYA_IP", "")
        LOCAL_KEY = os.environ.get("TUYA_LOCAL_KEY", "")
        VERSION = float(os.environ.get("TUYA_VERSION", "3.3"))

        if not DEVICE_ID or not IP or not LOCAL_KEY:
            print(json.dumps({"error": "Faltan datos para conectar."}))
            return

        device = tinytuya.Device(DEVICE_ID, IP, LOCAL_KEY)
        device.set_version(VERSION)
        
        datos = device.status()
        
        if "Error" in datos:
            print(json.dumps({"error": datos["Error"]}))
        else:
            print(json.dumps({"status": "success", "data": datos}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    get_status()
