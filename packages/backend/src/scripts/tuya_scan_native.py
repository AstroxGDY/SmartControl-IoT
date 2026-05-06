import tinytuya
import sys
import json

def main():
    snapshot_file = "snapshot.json"
    if "-snapshot-file" in sys.argv:
        idx = sys.argv.index("-snapshot-file")
        if idx + 1 < len(sys.argv):
            snapshot_file = sys.argv[idx+1]
    
    # TinyTuya 1.17.6+ uses deviceScan for discovery
    # We set verbose=False to keep stdout clean for our extractJson logic
    try:
        devices = tinytuya.deviceScan(verbose=False, maxwait=10)
    except Exception as e:
        # Fallback if deviceScan fails or signature is different
        devices = {}

    output = {"devices": []}
    # deviceScan returns a dict where keys are IDs
    for dev_id in devices:
        output["devices"].append(devices[dev_id])
    
    with open(snapshot_file, "w") as f:
        json.dump(output, f)

if __name__ == "__main__":
    main()
