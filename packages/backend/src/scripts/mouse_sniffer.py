import sys
import json
import asyncio
import ctypes
from ctypes import wintypes
import subprocess
import time
import re

class ControlHardwareError(Exception):
    pass

class RAWINPUTHEADER(ctypes.Structure):
    _fields_ = [("dwType", wintypes.DWORD), ("dwSize", wintypes.DWORD),
                ("hDevice", wintypes.HANDLE), ("wParam", wintypes.WPARAM)]

class _BUTTON_STRUCT(ctypes.Structure):
    _fields_ = [("usButtonFlags", wintypes.USHORT), ("usButtonData", ctypes.c_short)]

class _BUTTON_UNION(ctypes.Union):
    _fields_ = [("ulButtons", wintypes.ULONG), ("struct2", _BUTTON_STRUCT)]

class RAWMOUSE(ctypes.Structure):
    _fields_ = [("usFlags", wintypes.USHORT), ("union1", _BUTTON_UNION),
                ("ulRawButtons", wintypes.ULONG), ("lLastX", wintypes.LONG),
                ("lLastY", wintypes.LONG), ("ulExtraInformation", wintypes.ULONG)]

class _RAW_DATA_UNION(ctypes.Union):
    _fields_ = [("mouse", RAWMOUSE), ("dummy", ctypes.c_byte * 24)]

class RAWINPUT(ctypes.Structure):
    _fields_ = [("header", RAWINPUTHEADER), ("data", _RAW_DATA_UNION)]

class RAWINPUTDEVICELIST(ctypes.Structure):
    _fields_ = [("hDevice", wintypes.HANDLE), ("dwType", wintypes.DWORD)]

# Constantes de botones de Windows (Bitmask)
RI_MOUSE_LEFT_BUTTON_DOWN = 0x0001
RI_MOUSE_RIGHT_BUTTON_DOWN = 0x0004
RI_MOUSE_MIDDLE_BUTTON_DOWN = 0x0010
RI_MOUSE_WHEEL = 0x0400

def enviar_json(datos):
    print(json.dumps(datos))
    sys.stdout.flush()

async def leer_bateria_powershell(id_hardware):
    mac = re.search(r'([A-F0-9]{12})', id_hardware)
    vid_pid = re.search(r'(VID[_\&][A-F0-9]+[_\&]PID[_\&][A-F0-9]+)', id_hardware)

    if mac:
        filtro = mac.group(1)
    elif vid_pid:
        filtro = vid_pid.group(1).replace('&', '*')
    else:
        filtro = id_hardware

    comando = f"""
    $dispositivos = Get-PnpDevice -PresentOnly | Where-Object {{ $_.InstanceId -match '{filtro}' }}
    if ($dispositivos) {{
        foreach ($disp in $dispositivos) {{
            $prop = Get-PnpDeviceProperty -InstanceId $disp.InstanceId -KeyName '{{104EA319-6EE2-4701-BD47-8DDBF425BBE5}} 2' -ErrorAction SilentlyContinue
            if ($prop -and $prop.Data -ne $null) {{
                Write-Output $prop.Data
                break
            }}
        }}
    }}
    """
    try:
        resultado = subprocess.run(["powershell", "-Command", comando], capture_output=True, text=True)
        salida = resultado.stdout.strip()
        if salida and salida.isdigit():
            return int(salida)
        else:
            return None
    except Exception as e:
        raise ControlHardwareError(f"Fallo del SO al ejecutar PowerShell: {e}")

def obtener_nombre_amigable(mac_o_id):
    """Intenta obtener el nombre amigable del dispositivo Bluetooth via PowerShell/PnP."""
    try:
        comando = f"""
        $devs = Get-PnpDevice -PresentOnly | Where-Object {{ $_.InstanceId -match '{mac_o_id}' -and $_.Class -eq 'Bluetooth' }}
        foreach ($d in $devs) {{
            $n = $d.FriendlyName
            if ($n -and $n -notmatch 'Servicio|Generic|GATT|Attribute|Access|Perfil|Atributo|informaci') {{
                Write-Output $n
                break
            }}
        }}
        """
        resultado = subprocess.run(["powershell", "-Command", comando], capture_output=True, text=True, timeout=10)
        salida = resultado.stdout.strip()
        if salida:
            return salida
    except Exception:
        pass
    return None

def escanear_ratones_bluetooth():
    user32 = ctypes.windll.user32
    user32.GetRawInputDeviceList.argtypes = [ctypes.c_void_p, ctypes.POINTER(wintypes.UINT), wintypes.UINT]
    user32.GetRawInputDeviceInfoW.argtypes = [wintypes.HANDLE, wintypes.UINT, wintypes.LPVOID, ctypes.POINTER(wintypes.UINT)]

    num_devices = wintypes.UINT(0)
    user32.GetRawInputDeviceList(None, ctypes.byref(num_devices), ctypes.sizeof(RAWINPUTDEVICELIST))

    if num_devices.value == 0:
        return []

    devices = (RAWINPUTDEVICELIST * num_devices.value)()
    user32.GetRawInputDeviceList(ctypes.cast(devices, ctypes.c_void_p), ctypes.byref(num_devices), ctypes.sizeof(RAWINPUTDEVICELIST))

    ratones_bt = []
    for i in range(num_devices.value):
        if devices[i].dwType == 0:
            hDevice = devices[i].hDevice
            tamano_nombre = wintypes.UINT(0)
            user32.GetRawInputDeviceInfoW(hDevice, 0x20000007, None, ctypes.byref(tamano_nombre))

            if tamano_nombre.value > 0:
                buffer_nombre = ctypes.create_unicode_buffer(tamano_nombre.value)
                user32.GetRawInputDeviceInfoW(hDevice, 0x20000007, buffer_nombre, ctypes.byref(tamano_nombre))
                nombre = buffer_nombre.value.upper()

                es_bluetooth = "{00001812" in nombre or "BTHENUM" in nombre or "BTHLE" in nombre or re.search(r'_([A-F0-9]{12})&', nombre)

                if es_bluetooth:
                    if '#' in nombre:
                        partes = nombre.split('#')
                        id_corta = partes[1] if len(partes) > 1 else nombre
                    else:
                        id_corta = nombre

                    # Extraer la MAC: últimos 12 hex después del último '_'
                    if '_' in id_corta:
                        posible_mac = id_corta.split('_')[-1]
                        if re.match(r'^[A-F0-9]{12}$', posible_mac):
                            id_corta = posible_mac

                    # Intentar resolver nombre amigable del dispositivo
                    nombre_amigable = obtener_nombre_amigable(id_corta) or f"Ratón BT ({id_corta[:4]}...{id_corta[-4:]})"

                    ratones_bt.append({"handle": str(hDevice), "id": id_corta, "name": nombre_amigable})

    return ratones_bt

def iniciar_modo_diagnostico_hid(handle_str):
    try:
        handle_objetivo = int(handle_str)
    except ValueError:
        enviar_json({"error": "Handle inválido"})
        return

    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32

    user32.DefWindowProcW.argtypes = [wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]
    user32.DefWindowProcW.restype = ctypes.c_ssize_t
    user32.GetRawInputData.argtypes = [wintypes.HANDLE, wintypes.UINT, wintypes.LPVOID, ctypes.POINTER(wintypes.UINT), wintypes.UINT]
    user32.GetRawInputData.restype = wintypes.UINT
    user32.PeekMessageW.argtypes = [ctypes.POINTER(wintypes.MSG), wintypes.HWND, wintypes.UINT, wintypes.UINT, wintypes.UINT]
    user32.DestroyWindow.argtypes = [wintypes.HWND]
    user32.UnregisterClassW.argtypes = [wintypes.LPCWSTR, wintypes.HINSTANCE]

    WndProcType = ctypes.WINFUNCTYPE(ctypes.c_ssize_t, wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)

    def procesar_mensajes(hwnd, msg, wparam, lparam):
        if msg == 0x00FF:
            paquete = RAWINPUT()
            tamano = wintypes.UINT(ctypes.sizeof(RAWINPUT))
            user32.GetRawInputData(ctypes.c_void_p(lparam), 0x10000003, ctypes.byref(paquete), ctypes.byref(tamano), ctypes.sizeof(RAWINPUTHEADER))

            if paquete.header.hDevice == handle_objetivo:
                if paquete.header.dwType == 0:
                    raton = paquete.data.mouse
                    flags_boton = raton.union1.struct2.usButtonFlags
                    datos_rueda = raton.union1.struct2.usButtonData
                    x = raton.lLastX
                    y = raton.lLastY

                    if x != 0 or y != 0:
                        enviar_json({"event": "move", "x": x, "y": y})

                    if flags_boton & RI_MOUSE_LEFT_BUTTON_DOWN:
                        enviar_json({"event": "click", "button": "left"})
                    elif flags_boton & RI_MOUSE_RIGHT_BUTTON_DOWN:
                        enviar_json({"event": "click", "button": "right"})
                    elif flags_boton & RI_MOUSE_MIDDLE_BUTTON_DOWN:
                        enviar_json({"event": "click", "button": "middle"})

                    if flags_boton & RI_MOUSE_WHEEL:
                        direccion = "up" if datos_rueda > 0 else "down"
                        enviar_json({"event": "scroll", "direction": direccion, "force": datos_rueda})

        return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

    wndproc_c = WndProcType(procesar_mensajes)

    class WNDCLASS(ctypes.Structure):
        _fields_ = [("style", wintypes.UINT), ("lpfnWndProc", WndProcType), ("cbClsExtra", ctypes.c_int),
                    ("cbWndExtra", ctypes.c_int), ("hInstance", wintypes.HINSTANCE), ("hIcon", wintypes.HICON),
                    ("hCursor", wintypes.HANDLE), ("hbrBackground", wintypes.HBRUSH),
                    ("lpszMenuName", wintypes.LPCWSTR), ("lpszClassName", wintypes.LPCWSTR)]

    kernel32.GetModuleHandleW.restype = wintypes.HINSTANCE
    wndclass = WNDCLASS()
    wndclass.lpfnWndProc = wndproc_c
    wndclass.lpszClassName = "GhostWindowTFG_Sniffer"
    wndclass.hInstance = kernel32.GetModuleHandleW(None)
    user32.RegisterClassW(ctypes.byref(wndclass))

    user32.CreateWindowExW.argtypes = [wintypes.DWORD, wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.DWORD, ctypes.c_int,
                                       ctypes.c_int, ctypes.c_int, ctypes.c_int, wintypes.HWND, wintypes.HMENU,
                                       wintypes.HINSTANCE, wintypes.LPVOID]
    user32.CreateWindowExW.restype = wintypes.HWND
    hwnd_fantasma = user32.CreateWindowExW(0, wndclass.lpszClassName, "Ghost", 0, 0, 0, 0, 0, None, None,
                                           wndclass.hInstance, None)

    class RAWINPUTDEVICE(ctypes.Structure):
        _fields_ = [("usUsagePage", wintypes.USHORT), ("usUsage", wintypes.USHORT), ("dwFlags", wintypes.DWORD),
                    ("hwndTarget", wintypes.HWND)]

    rid = RAWINPUTDEVICE(0x01, 0x02, 0x0100, hwnd_fantasma)
    if not user32.RegisterRawInputDevices(ctypes.byref(rid), 1, ctypes.sizeof(rid)):
        enviar_json({"error": "El SO denegó el registro RAWINPUT."})
        return

    enviar_json({"status": "sniffer_started"})

    msg = wintypes.MSG()
    try:
        while True:
            while user32.PeekMessageW(ctypes.byref(msg), None, 0, 0, 1):
                user32.TranslateMessage(ctypes.byref(msg))
                user32.DispatchMessageW(ctypes.byref(msg))
            time.sleep(0.01)
    except KeyboardInterrupt:
        user32.DestroyWindow(hwnd_fantasma)
        user32.UnregisterClassW(wndclass.lpszClassName, wndclass.hInstance)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        enviar_json({"error": "Comando no especificado"})
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "list":
        ratones = escanear_ratones_bluetooth()
        enviar_json({"devices": ratones})
    elif cmd == "battery":
        if len(sys.argv) < 3:
            enviar_json({"error": "ID no especificada"})
            sys.exit(1)
        try:
            bateria = asyncio.run(leer_bateria_powershell(sys.argv[2]))
            enviar_json({"battery": bateria})
        except ControlHardwareError as e:
            enviar_json({"error": str(e)})
    elif cmd == "sniff":
        if len(sys.argv) < 3:
            enviar_json({"error": "Handle no especificado"})
            sys.exit(1)
        iniciar_modo_diagnostico_hid(sys.argv[2])
    else:
        enviar_json({"error": f"Comando desconocido: {cmd}"})
