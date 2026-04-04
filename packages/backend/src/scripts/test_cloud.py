import tinytuya
import json
import os
import sys

# Leer credenciales del archivo .env a mano
with open('.env', 'r') as f:
    for line in f:
        if line.startswith('TUYA_API_REGION'): REGION = line.split('=')[1].strip()
        if line.startswith('TUYA_API_KEY'): KEY = line.split('=')[1].strip()
        if line.startswith('TUYA_API_SECRET'): SECRET = line.split('=')[1].strip()

DEVICE_ID = "bf37320ce31763..." # It doesn't matter, getdevices gets all if we leave it out!
nube = tinytuya.Cloud(apiRegion=REGION, apiKey=KEY, apiSecret=SECRET) # We can omit deviceId or use the first one if required.
try:
    devs = nube.getdevices()
    print(json.dumps(devs, indent=2))
except Exception as e:
    print(str(e))
