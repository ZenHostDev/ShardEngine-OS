import express, { type Request, type Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ADDR = `http://localhost:${PORT}`;
let nodes: string[] = [ADDR];
const storage: Map<string, any> = new Map();

function getShard(key: string): string {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % nodes.length;
    return nodes[index];
}

const getUI = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ShardEngine | Infrastructure Node</title>
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

        header { border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-weight: 700; font-size: 1rem; letter-spacing: 1px; color: var(--text); display: flex; align-items: center; gap: 8px; }
        .logo span { color: var(--primary); }
        .badge { font-family: 'JetBrains Mono'; font-size: 0.7rem; padding: 4px 10px; border-radius: 4px; background: #1a1a1a; border: 1px solid var(--border); }

        .grid { display: grid; grid-template-columns: 300px 1fr; gap: 2rem; }
        .card { background: var(--surface); border: 1px solid var(--border); padding: 1.5rem; border-radius: 4px; margin-bottom: 1.5rem; }
        .label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--dim); margin-bottom: 1rem; display: block; letter-spacing: 1px; }

        input { 
            width: 100%; background: #000; border: 1px solid var(--border); color: #fff; 
            padding: 10px; border-radius: 4px; font-family: 'JetBrains Mono'; font-size: 0.8rem; margin-bottom: 0.8rem; outline: none;
        }
        input:focus { border-color: var(--primary); }
        button { 
            width: 100%; background: var(--primary); color: white; border: none; padding: 10px; 
            border-radius: 4px; font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: opacity 0.2s;
        }
        button:hover { opacity: 0.9; }

        .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; background: var(--surface); border: 1px solid var(--border); }
        th { text-align: left; padding: 12px; color: var(--dim); border-bottom: 1px solid var(--border); background: #161616; }
        td { padding: 12px; border-bottom: 1px solid var(--border); font-family: 'JetBrains Mono'; }

        .info-box { border-left: 3px solid var(--primary); padding: 1rem; background: rgba(99, 102, 241, 0.05); margin-bottom: 1.5rem; font-size: 0.85rem; }
        .disclaimer { font-size: 0.75rem; color: var(--dim); margin-top: 3rem; border-top: 1px solid var(--border); padding-top: 1.5rem; }
        .dev-status { display: flex; align-items: center; gap: 8px; color: var(--warn); font-weight: 600; font-size: 0.8rem; margin-bottom: 0.5rem; }
    </style>
</head>
<body>
    <div class="wrapper">
        <header>
            <div class="logo">SHARD<span>ENGINE</span>_OS</div>
            <div class="badge">V2.4.0-STABLE // PORT ${PORT}</div>
        </header>

        <div class="info-box">
            <div class="dev-status"><i class="fas fa-hammer"></i> ACTIVE DEVELOPMENT</div>
            We are continuously optimizing the sharding algorithms and cluster stability. Updates are pushed regularly to the core repository.
        </div>

        <div class="grid">
            <aside>
                <div class="card">
                    <span class="label">Ingress Controller</span>
                    <input type="text" id="k" placeholder="DATA_KEY">
                    <input type="text" id="v" placeholder="DATA_VALUE">
                    <button onclick="send()">PUSH_TO_CLUSTER</button>
                </div>
                <div class="card">
                    <span class="label">Network Topology</span>
                    <input type="text" id="target" placeholder="REMOTE_NODE_ADDR">
                    <button onclick="join()" style="background:#262626">LINK_REMOTE_NODE</button>
                </div>
            </aside>

            <section>
                <table class="data-table">
                    <thead>
                        <tr><th>PARTITION_KEY</th><th>RESPONSIBLE_NODE</th><th>STATE</th></tr>
                    </thead>
                    <tbody id="storage"></tbody>
                </table>
            </section>
        </div>

        <footer class="disclaimer">
            <strong>LEGAL_NOTICE (MIT License):</strong><br>
            This is an open-source tool provided "as is" without any warranty of any kind. The contributors are not liable for any data loss, system failure, or legal issues arising from the use of this software. Users are responsible for compliance with local data protection regulations.
            <br><br>
            © 2026 ShardEngine Core Contributors.
        </footer>
    </div>

    <script>
        async function refresh() {
            try {
                const res = await fetch('/debug');
                const data = await res.json();
                const container = document.getElementById('storage');
                container.innerHTML = data.keys.length ? data.keys.map(k => \`
                    <tr>
                        <td>\${k}</td>
                        <td>\${location.host}</td>
                        <td style="color:var(--success)">MOUNTED_SYNC</td>
                    </tr>
                \`).join('') : '<tr><td colspan="3" style="text-align:center; padding:2rem; color:var(--dim)">NULL_DATA_SET</td></tr>';
            } catch(e) {}
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
            if(!url) return;
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

app.get('/', (req, res) => res.send(getUI()));

app.post('/set', async (req, res) => {
    const { key, value } = req.body;
    const target = getShard(key);
    if (target === ADDR) {
        storage.set(key, value);
        return res.json({ status: 'OK', node: 'LOCAL_STORAGE' });
    }
    try {
        const response = await axios.post(`${target}/set`, { key, value });
        res.json({ status: 'OK', node: target });
    } catch (e) { res.status(500).json({ error: 'NODE_UNREACHABLE' }); }
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

app.listen(PORT, () => console.log(`[CORE] ShardEngine Node active on ${ADDR}`));