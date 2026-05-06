import os
import subprocess
import sys

scripts = [
    "bluetooth_manager.py",
    "cloud_pair.py",
    "cloud_scan.py",
    "get_logs.py",
    "get_schema.py",
    "get_status.py",
    "get_statuses.py",
    "mouse_sniffer.py",
    "send_command.py",
    "nvd_scanner.py"
]

# Create a small script for tinytuya scan since it's used as a module
with open("tuya_scan_native.py", "w") as f:
    f.write("""
import tinytuya
import sys
import json
import os

# Simular 'python -m tinytuya scan' simplificado
def main():
    # Obtener argumentos (ej: -snapshot-file)
    snapshot_file = "snapshot.json"
    if "-snapshot-file" in sys.argv:
        idx = sys.argv.index("-snapshot-file")
        if idx + 1 < len(sys.argv):
            snapshot_file = sys.argv[idx+1]
    
    print(f"Scanning devices...")
    # Ejecutar scan
    # Nota: tinytuya.Scanner.scan() es lo que hace el CLI internamente
    # Para simplificar, usamos el comando directo si es posible o una version reducida
    from tinytuya import Scanner
    
    # scan() escribe en snapshot.json por defecto si se le pide
    # Pero aquí simplemente vamos a usar la lógica de descubrimiento
    d = Scanner().discover(maxwait=5)
    
    # Formatear como espera el resto de la app
    output = {"devices": []}
    for dev in d:
        output["devices"].append(d[dev])
    
    with open(snapshot_file, "w") as f:
        json.dump(output, f)
    
    print("Scan complete.")

if __name__ == "__main__":
    main()
""")

scripts.append("tuya_scan_native.py")

output_dir = "dist_bin"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

for script in scripts:
    print(f"Freezing {script}...")
    subprocess.run([
        sys.executable,
        "-m", "PyInstaller",
        "--onefile",
        "--noconsole",
        "--distpath", output_dir,
        script
    ], check=True)

print("All scripts frozen in dist_bin/")
