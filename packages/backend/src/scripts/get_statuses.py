import json
import os
import sys
import tinytuya
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def fetch_device(device_data):
    dev_id = device_data.get("tuyaId")
    ip = device_data.get("ip")
    local_key = device_data.get("localKey")
    version = float(device_data.get("version", "3.3"))
    doc_id = device_data.get("_id")

    if not all([dev_id, ip, local_key]):
        return {"_id": doc_id, "error": "Credenciales incompletas", "offline": True}

    try:
        device = tinytuya.Device(dev_id, ip, local_key)
        device.set_version(version)
        device.set_socketRetryLimit(1)
        device.set_socketTimeout(1.0) # Timeout corto para UI rapida
        
        data = device.status()
        
        if "dps" in data:
            return {"_id": doc_id, "success": True, "dps": data["dps"], "offline": False}
        else:
            return {"_id": doc_id, "error": "Error formato Tuya", "offline": True}
    except Exception as e:
        return {"_id": doc_id, "error": str(e), "offline": True}

def get_multiple_statuses():
    try:
        input_file = sys.argv[1]
        with open(input_file, 'r', encoding='utf-8') as f:
            devices = json.load(f)
            
        results = []
        
        # Consultar en paralelo (max 10 hilos) para no bloquear y ser rapidos
        with ThreadPoolExecutor(max_workers=min(10, max(1, len(devices)))) as executor:
            future_to_dev = {executor.submit(fetch_device, dev): dev for dev in devices}
            
            for future in as_completed(future_to_dev):
                results.append(future.result())
                
        print(json.dumps({"success": True, "results": results}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    get_multiple_statuses()
