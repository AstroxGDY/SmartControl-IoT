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
with open("tuya_scan_native.py", "w", encoding="utf-8") as f:
    f.write("""
import tinytuya
import sys
import json

def main():
    snapshot_file = "snapshot.json"
    if "-snapshot-file" in sys.argv:
        idx = sys.argv.index("-snapshot-file")
        if idx + 1 < len(sys.argv):
            snapshot_file = sys.argv[idx+1]
    
    print(f"Scanning devices...")
    
    d = tinytuya.deviceScan(verbose=False, maxretry=2)
    
    output = {"devices": []}
    for ip, dev in d.items():
        mapped = {
            "id": dev.get("gwId"),
            "ip": ip,
            "productKey": dev.get("productKey"),
            "version": dev.get("version"),
            "name": dev.get("name", f"Dispositivo {dev.get('gwId', '')[-4:]}")
        }
        output["devices"].append(mapped)
    
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
