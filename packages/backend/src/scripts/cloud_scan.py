import tinytuya
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def obtener_nube():
    REGION = os.environ.get("TUYA_API_REGION", "")
    KEY = os.environ.get("TUYA_API_KEY", "")
    SECRET = os.environ.get("TUYA_API_SECRET", "")

    if not REGION or not KEY or not SECRET:
        print(json.dumps({"error": "Faltan credenciales de Tuya Cloud."}))
        return

    try:
        nube = tinytuya.Cloud(apiRegion=REGION, apiKey=KEY, apiSecret=SECRET)
        devs = nube.getdevices()
        
        # Filtramos de forma defensiva
        if isinstance(devs, dict) and "success" in devs and not devs["success"]:
            print(json.dumps({"error": devs.get("msg", "Error de servidor Tuya")}))
            return

        if isinstance(devs, dict):
            lista = devs.get("result", [])
        else:
            lista = devs if devs else []

        # Solo enviamos atributos seguros por JSON
        safe_list = []
        for d in lista:
            safe_list.append({
                "id": d.get("id"),
                "name": d.get("name"),
                "category": d.get("category"),
                "icon": f"https://images.tuyaeu.com/{d.get('icon')}" if d.get('icon') else None,
                "local_key": d.get("local_key") or d.get("key"),
                "dps": d.get("status") # Tuya Status array
            })
            
        print(json.dumps(safe_list, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    obtener_nube()
