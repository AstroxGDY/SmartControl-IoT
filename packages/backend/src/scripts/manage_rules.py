import tinytuya
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def manage_rules():
    command = sys.argv[1] if len(sys.argv) > 1 else "list"
    
    REGION = os.environ.get("TUYA_API_REGION", "")
    KEY = os.environ.get("TUYA_API_KEY", "")
    SECRET = os.environ.get("TUYA_API_SECRET", "")

    if not REGION or not KEY or not SECRET:
        print(json.dumps({"error": "Faltan credenciales de Tuya Cloud."}))
        return

    try:
        nube = tinytuya.Cloud(apiRegion=REGION, apiKey=KEY, apiSecret=SECRET)
        
        if command == "list":
            # Obtener lista de reglas
            res = nube.cloudrequest("/v2.0/cloud/scene/rule")
            print(json.dumps(res, ensure_ascii=False))
            
        elif command == "trigger":
            rule_id = sys.argv[2] if len(sys.argv) > 2 else ""
            if not rule_id:
                print(json.dumps({"error": "Falta rule_id"}))
                return
            res = nube.cloudrequest(f"/v2.0/cloud/scene/rule/{rule_id}/actions/trigger", method="POST")
            print(json.dumps(res, ensure_ascii=False))
            
        elif command == "delete":
            rule_id = sys.argv[2] if len(sys.argv) > 2 else ""
            if not rule_id:
                print(json.dumps({"error": "Falta rule_id"}))
                return
            res = nube.cloudrequest(f"/v2.0/cloud/scene/rule/{rule_id}", method="DELETE")
            print(json.dumps(res, ensure_ascii=False))
            
        elif command == "create":
            # Esperamos un JSON por stdin
            try:
                rule_data = json.load(sys.stdin)
                res = nube.cloudrequest("/v2.0/cloud/scene/rule", method="POST", post_data=rule_data)
                print(json.dumps(res, ensure_ascii=False))
            except Exception as e:
                print(json.dumps({"error": f"JSON inválido: {str(e)}"}))

        else:
            print(json.dumps({"error": f"Comando desconocido: {command}"}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    manage_rules()
