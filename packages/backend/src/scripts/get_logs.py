import tinytuya
import json
import sys
import os
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def obtener_logs():
    # Parámetros desde el entorno
    REGION = os.environ.get("TUYA_API_REGION", "")
    KEY = os.environ.get("TUYA_API_KEY", "")
    SECRET = os.environ.get("TUYA_API_SECRET", "")
    DEVICE_ID = os.environ.get("TUYA_DEVICE_ID", "")
    
    # Rango de tiempo: últimos 7 días por defecto
    # Tuya usa timestamps en milisegundos
    end_time = int(time.time() * 1000)
    start_time = end_time - (7 * 24 * 60 * 60 * 1000)

    if not REGION or not KEY or not SECRET or not DEVICE_ID:
        print(json.dumps({"error": "Faltan credenciales o ID de dispositivo."}))
        return

    try:
        nube = tinytuya.Cloud(apiRegion=REGION, apiKey=KEY, apiSecret=SECRET)
        
        # Intentamos usar getdevicelog que es el método oficial en versiones recientes
        # end_time y start_time deben ser milisegundos en la API de Tuya
        logs = nube.getdevicelog(DEVICE_ID, start=start_time, end=end_time, size=50)
        
        # Si getdevicelog no devuelve lo esperado o da error de firma,
        # puede ser por el formato de los parámetros.
        if isinstance(logs, dict) and "success" in logs and not logs["success"]:
            # Si el error es "sign invalid", a veces es por la región o el formato de tiempo
            # Reintentamos con segundos por si la versión de tinytuya los prefiere
            if logs.get("code") == "sign invalid" or "sign" in logs.get("msg", "").lower():
                s_start = start_time // 1000
                s_end = end_time // 1000
                logs = nube.getdevicelog(DEVICE_ID, start=s_start, end=s_end, size=50)

        if isinstance(logs, dict) and "success" in logs and not logs["success"]:
            print(json.dumps({"error": logs.get("msg", "Error de servidor Tuya"), "code": logs.get("code")}))
            return

        print(json.dumps(logs, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    obtener_logs()
