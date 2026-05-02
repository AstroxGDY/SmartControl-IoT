import tinytuya
import sys
import json

def main():
    snapshot_file = "snapshot.json"
    if "-snapshot-file" in sys.argv:
        idx = sys.argv.index("-snapshot-file")
        if idx + 1 < len(sys.argv):
            snapshot_file = sys.argv[idx+1]
    
    from tinytuya import Scanner
    d = Scanner().discover(maxwait=5)
    
    output = {"devices": []}
    for dev in d:
        output["devices"].append(d[dev])
    
    with open(snapshot_file, "w") as f:
        json.dump(output, f)

if __name__ == "__main__":
    main()


