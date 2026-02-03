[web](https://fifi1ous.github.io/CTU_FSV_YDPD_2026/)

## Running Locally

**Important:** Potree point clouds require a web server to function properly. You cannot open the HTML file directly (file:// protocol) due to browser security restrictions.

### Option 1: Python HTTP Server
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```
Then open: `http://localhost:8000`

### Option 2: Node.js HTTP Server
```bash
npx http-server -p 8000
```

### Option 3: VS Code Live Server
Use the Live Server extension in VS Code to serve the project.