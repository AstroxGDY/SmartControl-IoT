import tinytuya
import json
import time

DEVICE_ID = "bf7ab23339cbe03832cjza"
IP = "192.168.18.21"
LOCAL_KEY = "hzn<]n~f7#q1nI+N"
VERSION = 3.3

print("Conectando con la regleta...")
device = tinytuya.Device(DEVICE_ID, IP, LOCAL_KEY)
device.set_version(VERSION)

print("Estado inicial:")
print(device.status())

print("Enviando apagado mediante set_value('20', False)...")
res1 = device.set_value("20", False, nowait=False)
print("Respuesta:", res1)
time.sleep(1)

print("Estado intermedio:")
print(device.status())

print("Enviando encendido mediante set_status(True)...")
res2 = device.set_status(True)
print("Respuesta:", res2)
time.sleep(1)

print("Estado final 1:")
print(device.status())

print("Enviando apagado manual generate_payload...")
payload = device.generate_payload(tinytuya.CONTROL, {"20": False})
res3 = device.send(payload)
print("Respuesta:", res3)
time.sleep(1)

print("Estado final 2:")
print(device.status())
