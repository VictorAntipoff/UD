export const renderHTML = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System</title>
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #f8fafc;
            --bg-card: rgba(255, 255, 255, 0.8);
            --text-primary: #1a1a1a;
            --text-secondary: #666666;
            --accent: #EF4444;
            --success: #10B981;
            --warning: #F59E0B;
            --error: #EF4444;
            --radius: 12px;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: linear-gradient(135deg, #f6f8ff 0%, #ffffff 100%);
            color: var(--text-primary);
            line-height: 1.5;
            min-height: 100vh;
            margin: 0;
            padding: 2rem;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            position: relative;
            margin-bottom: 3rem;
            padding: 0 2rem;
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 2rem;
        }

        .brand {
            display: flex;
            align-items: center;
        }

        .brand img {
            width: 120px;
            height: 120px;
            object-fit: contain;
        }

        .title {
            text-align: center;
            font-size: 1.5rem;
            font-weight: 500;
            color: var(--text-primary);
        }

        .system-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 0.5rem;
        }

        .status-indicator.online {
            background: var(--success);
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .status-indicator.issue {
            background: var(--warning);
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
        }

        .status-indicator.offline {
            background: var(--error);
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }

        .card {
            background: var(--bg-card);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.5);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            padding: 1.5rem;
            border-radius: var(--radius);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        .card-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .metrics {
            display: grid;
            gap: 1rem;
        }

        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.5);
            border-radius: var(--radius);
            margin-bottom: 0.5rem;
        }

        .metric-label {
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .metric-value {
            font-weight: 500;
            color: var(--text-primary);
        }

        .endpoints {
            display: grid;
            gap: 0.75rem;
        }

        .endpoint {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            border-radius: calc(var(--radius) - 4px);
            font-family: ui-monospace, monospace;
            font-size: 0.875rem;
        }

        .method {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            color: white;
        }

        .method.get {
            background: #3B82F6;  /* Blue for GET */
        }

        .method.post {
            background: #10B981;  /* Green for POST */
        }

        .method.put {
            background: #F59E0B;  /* Orange for PUT */
        }

        .method.delete {
            background: #EF4444;  /* Red for DELETE */
        }

        .path {
            color: var(--text-secondary);
        }

        .chart {
            height: 100px;
            display: flex;
            align-items: flex-end;
            gap: 2px;
            margin-top: 1rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.5);
            border-radius: var(--radius);
        }

        .chart canvas {
            border-bottom: 2px solid var(--accent);
        }

        .chart-bar {
            flex: 1;
            background: var(--accent);
            opacity: 0.8;
            transition: height 0.3s ease;
            border-radius: 2px 2px 0 0;
        }

        footer {
            text-align: center;
            margin-top: 3rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        footer a {
            color: var(--accent);
            text-decoration: none;
        }

        footer a:hover {
            text-decoration: underline;
        }

        @media (max-width: 768px) {
            body {
                padding: 1rem;
            }

            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
    <script>
        function updateSystemStatus() {
            fetch('/api/health')
                .then(response => response.json())
                .then(data => {
                    const statusIndicator = document.getElementById('statusIndicator');
                    const statusText = document.getElementById('statusText');
                    const environment = document.getElementById('environment');
                    const uptime = document.getElementById('uptime');
                    const version = document.getElementById('version');
                    const region = document.getElementById('region');
                    const latency = document.getElementById('latency');

                    // Update status
                    if (data.status === 'healthy') {
                        statusIndicator.className = 'status-indicator online';
                        statusText.textContent = 'All Systems Operational';
                    } else if (data.status === 'degraded') {
                        statusIndicator.className = 'status-indicator issue';
                        statusText.textContent = 'Partial System Outage';
                    } else {
                        statusIndicator.className = 'status-indicator offline';
                        statusText.textContent = 'System Issues Detected';
                    }

                    // Update metrics
                    environment.textContent = data.env || '-';
                    uptime.textContent = data.uptime?.formatted || '-';
                    version.textContent = data.version || '-';
                    region.textContent = data.region || '-';
                    latency.textContent = data.dbLatency || '-';

                    // Update chart with real or empty data
                    updateLatencyChart(data.latencyHistory || Array(30).fill(0));
                })
                .catch(error => {
                    console.error('Health check failed:', error);
                    const statusIndicator = document.getElementById('statusIndicator');
                    const statusText = document.getElementById('statusText');
                    
                    statusIndicator.className = 'status-indicator offline';
                    statusText.textContent = 'System Offline';
                    
                    // Clear metrics on error
                    document.getElementById('environment').textContent = '-';
                    document.getElementById('uptime').textContent = '-';
                    document.getElementById('version').textContent = '-';
                    document.getElementById('region').textContent = '-';
                    document.getElementById('latency').textContent = '-';
                    
                    // Clear chart
                    updateLatencyChart(Array(30).fill(0));
                });
        }

        function updateLatencyChart(latencyData) {
            const chart = document.getElementById('latencyChart');
            if (!chart) return;

            // Create or update bars
            const maxLatency = Math.max(...latencyData, 100); // minimum 100ms for scale
            latencyData.forEach((latency, index) => {
                const height = (latency / maxLatency) * 100;
                const bar = chart.children[index] || document.createElement('div');
                bar.className = 'chart-bar';
                bar.style.height = \`\${Math.max(10, height)}%\`;
                if (!chart.children[index]) {
                    chart.appendChild(bar);
                }
            });
        }

        // Initial update
        updateSystemStatus();

        // Update every 10 seconds
        setInterval(updateSystemStatus, 10000);

        // Simulate latency data for the chart
        setInterval(() => {
            const latencyData = Array.from({length: 30}, () => 
                Math.floor(Math.random() * 50) + 20
            );
            updateLatencyChart(latencyData);
        }, 2000);
    </script>
</body>
</html>
`; 