import tinytuya
import json
import os

def get_schema():
    REGION = os.environ.get("TUYA_API_REGION", "")
    KEY = os.environ.get("TUYA_API_KEY", "")
    SECRET = os.environ.get("TUYA_API_SECRET", "")
    DEVICE_ID = os.environ.get("TUYA_DEVICE_ID", "")

    if not REGION or not KEY or not SECRET or not DEVICE_ID:
        print(json.dumps({"error": "Faltan credenciales Cloud (REGION, KEY, SECRET) o DEVICE_ID en el entorno."}))
        return

    try:
        nube = tinytuya.Cloud(apiRegion=REGION, apiKey=KEY, apiSecret=SECRET)
        dps = nube.getdps(DEVICE_ID)
        
        if isinstance(dps, dict) and dps.get("success"):
            # En la estructura Tuya, result contiene 'functions' y 'status' (el schema de los DPs).
            result = dps.get("result", {})
            schema = result.get("status", [])
            print(json.dumps({"success": True, "schema": schema}))
        else:
            msg = dps.get("msg", "Error desconocido de Tuya") if isinstance(dps, dict) else str(dps)
            print(json.dumps({"error": f"Fallo al descargar schema: {msg}"}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    get_schema()
