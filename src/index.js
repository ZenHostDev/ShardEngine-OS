"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
const PORT = process.env.PORT || 3000;
const ADDR = `http://localhost:${PORT}`;
let nodes = [ADDR];
const storage = new Map();
function getShard(key) {
    const hash = crypto_1.default.createHash('sha256').update(key).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % nodes.length;
    return nodes[index];
}
const getUI = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ShardEngine | Open Source Node</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        :root {
            --bg: #0a0a0a; --surface: #121212; --primary: #6366f1;
            --text: #e2e8f0; --dim: #64748b; --border: #262626;
            --success: #10b981; --warn: #f59e0b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); padding: 2rem 1rem; line-height: 1.5; }
        .wrapper { max-width: 1000px; margin: 0 auto; }

        /* Infrastructure Header */
        header { border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-weight: 700; font-size: 1rem; letter-spacing: 1px; color: var(--text); display: flex; align-items: center; gap: 8px; }
        .logo span { color: var(--primary); }
        .badge { font-family: 'JetBrains Mono'; font-size: 0.7rem; padding: 4px 10px; border-radius: 4px; background: #1a1a1a; border: 1px solid var(--border); }

        /* Main Dashboard */
        .grid { display: grid; grid-template-columns: 300px 1fr; gap: 2rem; }
        .card { background: var(--surface); border: 1px solid var(--border); padding: 1.5rem; border-radius: 4px; margin-bottom: 1.5rem; }
        .label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--dim); margin-bottom: 1rem; display: block; letter-spacing: 1px; }

        input { 
            width: 100%; background: #000; border: 1px solid var(--border); color: #fff; 
            padding: 10px; border-radius: 4px; font-family: 'JetBrains Mono'; font-size: 0.8rem; margin-bottom: 0.8rem;
        }
        button { 
            width: 100%; background: var(--primary); color: white; border: none; padding: 10px; 
            border-radius: 4px; font-weight: 600; font-size: 0.8rem; cursor: pointer;
        }
        button:hover { filter: brightness(1.1); }

        /* Tables */
        .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; background: var(--surface); border: 1px solid var(--border); }
        th { text-align: left; padding: 12px; color: var(--dim); border-bottom: 1px solid var(--border); background: #161616; }
        td { padding: 12px; border-bottom: 1px solid var(--border); font-family: 'JetBrains Mono'; }

        /* Info Boxes */
        .info-box { border-left: 3px solid var(--primary); padding: 1rem; background: rgba(99, 102, 241, 0.05); margin-bottom: 1.5rem; font-size: 0.85rem; }
        .disclaimer { font-size: 0.75rem; color: var(--dim); margin-top: 3rem; border-top: 1px solid var(--border); padding-top: 1.5rem; }
        .dev-status { display: flex; align-items: center; gap: 8px; color: var(--warn); font-weight: 600; font-size: 0.8rem; margin-bottom: 0.5rem; }
    </style>
</head>
<body>
    <div class="wrapper">
        <header>
            <div class="logo">SHARD<span>ENGINE</span>_OS</div>
            <div class="badge">V2.4.0-STABLE</div>
        </header>

        <div class="info-box">
            <div class="dev-status"><i class="fas fa-hammer"></i> ACTIVE DEVELOPMENT</div>
            Wir arbeiten kontinuierlich an der Optimierung der Sharding-Algorithmen und der Cluster-Stabilität. Updates werden regelmäßig über das Repository bereitgestellt.
        </div>

        <div class="grid">
            <aside>
                <div class="card">
                    <span class="label">Ingress Controller</span>
                    <input type="text" id="k" placeholder="KEY_ID">
                    <input type="text" id="v" placeholder="VALUE_STORE">
                    <button onclick="send()">PUSH_TO_CLUSTER</button>
                </div>
                <div class="card">
                    <span class="label">Cluster Map</span>
                    <input type="text" id="target" placeholder="REMOTE_HOST">
                    <button onclick="join()" style="background:#262626">LINK_NODE</button>
                </div>
            </aside>

            <section>
                <table class="data-table">
                    <thead>
                        <tr><th>PARTITION_KEY</th><th>NODE_OWNER</th><th>STATE</th></tr>
                    </thead>
                    <tbody id="storage"></tbody>
                </table>
            </section>
        </div>

        <footer class="disclaimer">
            <strong>LEGAL_NOTICE (MIT License):</strong><br>
            Dies ist ein Open-Source-Tool. Die Bereitstellung erfolgt "wie besehen" (as is), ohne jegliche Gewährleistung oder Haftung für Datenverlust, Systemausfälle oder rechtliche Konsequenzen, die aus der Nutzung dieser Software resultieren. Die Nutzer sind für die Einhaltung ihrer lokalen Datenschutzbestimmungen selbst verantwortlich. 
            <br><br>
            © 2026 ShardEngine Core Contributors.
        </footer>
    </div>

    <script>
        async function refresh() {
            const res = await fetch('/debug');
            const data = await res.json();
            document.getElementById('storage').innerHTML = data.keys.length ? data.keys.map(k => \`
                <tr>
                    <td>\${k}</td>
                    <td>\${location.host}</td>
                    <td style="color:var(--success)">MOUNTED</td>
                </tr>
            \`).join('') : '<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--dim)">NULL_DATA_SET</td></tr>';
        }

        async function send() {
            const key = document.getElementById('k').value;
            const value = document.getElementById('v').value;
            if(!key) return;
            await fetch('/set', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ key, value })
            });
            refresh();
        }

        async function join() {
            const url = document.getElementById('target').value;
            await fetch('/join', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ url })
            });
            refresh();
        }

        refresh();
        setInterval(refresh, 5000);
    </script>
</body>
</html>`;
// --- API (Infrastruktur wie gehabt) ---
app.get('/', (req, res) => res.send(getUI()));
app.post('/set', async (req, res) => {
    const { key, value } = req.body;
    const target = getShard(key);
    if (target === ADDR) {
        storage.set(key, value);
        return res.json({ status: 'OK', node: 'LOCAL' });
    }
    try {
        const response = await axios_1.default.post(`${target}/set`, { key, value });
        res.json({ status: 'OK', node: target });
    }
    catch (e) {
        res.status(500).json({ error: 'NODE_ERROR' });
    }
});
app.post('/join', (req, res) => {
    const { url } = req.body;
    if (url && !nodes.includes(url)) {
        nodes.push(url);
        nodes.sort();
    }
    res.json({ nodes });
});
app.get('/debug', (req, res) => {
    res.json({ nodes, keys: Array.from(storage.keys()) });
});
app.listen(PORT, () => console.log(`ShardEngine Node Active: ${ADDR}`));
//# sourceMappingURL=index.js.map