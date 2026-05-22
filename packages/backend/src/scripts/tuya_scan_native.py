
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
