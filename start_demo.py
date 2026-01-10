import subprocess
import webbrowser
import sys
import time

def open_browser(url='http://localhost:8000'):
    try:
        webbrowser.open(url)
    except Exception:
        pass

if __name__ == '__main__':
    print('Starting SkyShield backend...')
    if sys.platform.startswith('win'):
        uvicorn_cmd = ['cmd', '/c', 'run_dev.bat']
    else:
        uvicorn_cmd = ['bash', '-lc', './run_dev.sh']
    p = subprocess.Popen(uvicorn_cmd)
    time.sleep(1.3)
    open_browser('http://localhost:8000')
    print('UI should open in your default browser. To stop, terminate this script and the server.')
    try:
        p.wait()
    except KeyboardInterrupt:
        p.terminate()
        print('terminated')
