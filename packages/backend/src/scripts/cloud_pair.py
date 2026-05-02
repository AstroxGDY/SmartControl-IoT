import tinytuya
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def extraer_credenciales_nube():
    # Leer de variables de entorno para mayor seguridad (evitamos verlas en el log de pm2/node)
    API_REGION = os.environ.get("TUYA_API_REGION", "")
    API_KEY = os.environ.get("TUYA_API_KEY", "")
    API_SECRET = os.environ.get("TUYA_API_SECRET", "")
    DEVICE_ID = os.environ.get("TUYA_DEVICE_ID", "")

    if not API_REGION or not API_KEY or not API_SECRET or not DEVICE_ID:
        print(json.dumps({"error": "Faltan credenciales de Tuya Cloud en el backend (Revisa tu .env)"}), file=sys.stdout)
        return

    # Usamos stderr para no contaminar el JSON de stdout que leerá Node
    print(f"[*] Conectando a Tuya Cloud (Región {API_REGION})...", file=sys.stderr)
    
    try:
        nube = tinytuya.Cloud(
            apiRegion=API_REGION, 
            apiKey=API_KEY, 
            apiSecret=API_SECRET, 
            apiDeviceID=DEVICE_ID
        )
        
        dispositivos = nube.getdevices()

        if not dispositivos:
            print(json.dumps({"error": "No se obtuvieron datos de the Tuya Cloud. Verifica tus claves."}), file=sys.stdout)
            return

        # Si Tuya nos devuelve un diccionario con un error (ej. credenciales inválidas), iterarlo fallaría.
        if isinstance(dispositivos, dict) and "success" in dispositivos and not dispositivos["success"]:
            # El API de Tuya ha devuelto un error, mostrámoslo.
            error_msg = dispositivos.get("msg", "Error desconocido de Tuya")
            code = dispositivos.get("code", "")
            print(json.dumps({"error": f"Tuya Cloud canceló la conexión (Código {code}): {error_msg}"}), file=sys.stdout)
            return

        if isinstance(dispositivos, dict):
            # En caso de que lo mande dentro de una llave "result"
            dispositivos_lista = dispositivos.get("result", [])
        else:
            dispositivos_lista = dispositivos

        for dev in dispositivos_lista:
            if dev.get('id') == DEVICE_ID:
                llave_encontrada = dev.get('local_key') or dev.get('localKey') or dev.get('key')

                # Solo campos necesarios — evitamos serializar el objeto completo de Tuya
                # que puede contener referencias circulares y romper json.dumps
                datos_extraidos = {
                    "status": "success",
                    "device_id": dev.get('id'),
                    "local_key": llave_encontrada,
                    "name": dev.get('name', ''),
                    "product_name": dev.get('product_name', ''),
                }

                print("[*] ¡Dispositivo emparejado! Mandando Local Key de vuelta a Node.js...", file=sys.stderr)
                # default=str como seguro de fallo para cualquier tipo no serializable
                print(json.dumps(datos_extraidos, ensure_ascii=False, default=str))
                return

        print(json.dumps({"error": "Device ID no encontrado en los dispositivos asociados a tu cuenta de nube."}), file=sys.stdout)

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stdout)

if __name__ == "__main__":
    extraer_credenciales_nube()

