import tinytuya
import sys
import json

def main():
    snapshot_file = "snapshot.json"
    if "-snapshot-file" in sys.argv:
        idx = sys.argv.index("-snapshot-file")
        if idx + 1 < len(sys.argv):
            snapshot_file = sys.argv[idx+1]
    try:
        devices = tinytuya.deviceScan(verbose=False, poll=False)
    except Exception as e:
        print(f"Error scanning: {e}", file=sys.stderr)
        devices = {}

    output = {"devices": []}
    if isinstance(devices, dict):
        for dev_id in devices:
            dev = devices[dev_id]
            # Ensure it has the ID field
            if isinstance(dev, dict):
                if 'id' not in dev: 
                    dev['id'] = dev_id
                output["devices"].append(dev)
    
    with open(snapshot_file, "w") as f:
        json.dump(output, f, indent=4)

if __name__ == "__main__":
    main()
