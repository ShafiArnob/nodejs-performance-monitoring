# Grafana Dashboard PromQL Queries

## 📊 Essential Metrics for Manual Dashboard Creation

### 🚀 Request Latency (P90/P99)

**P90 Request Latency:**
```promql
histogram_quantile(0.90, rate(http_request_duration_seconds_bucket[5m]))
```

**P99 Request Latency:**
```promql
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

### 📈 Requests Per Second (RPS)

**Total RPS:**
```promql
rate(http_requests_total[1m])
```

**RPS by Status Code:**
```promql
sum(rate(http_requests_total[1m])) by (status_code)
```

### 💻 CPU & Memory Usage (Node Exporter)

**CPU Usage (%):**
```promql
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**Memory Usage (%):**
```promql
100 * (1 - ((node_memory_MemAvailable_bytes or node_memory_MemFree_bytes) / node_memory_MemTotal_bytes))
```

**Memory Available (GB):**
```promql
(node_memory_MemAvailable_bytes or node_memory_MemFree_bytes) / 1024 / 1024 / 1024
```

### 🗄️ Database Performance

**DB Insert Latency P90:**
```promql
histogram_quantile(0.90, rate(db_query_duration_seconds_bucket{operation="insert"}[5m]))
```

**DB Select Latency P90:**
```promql
histogram_quantile(0.90, rate(db_query_duration_seconds_bucket{operation="select"}[5m]))
```

**DB Connection Count:**
```promql
db_connections_active
```

**DB Operations Rate:**
```promql
sum(rate(db_operations_total[1m])) by (operation, status)
```

### 📡 Availability & Health

**Availability Percentage (Last 5m):**
```promql
100 * (
  sum(rate(http_requests_total{status_code!~"5.."}[5m])) / 
  sum(rate(http_requests_total[5m]))
)
```

**Health Check Success Rate:**
```promql
100 * (
  sum(rate(http_requests_total{route="/health",status_code="200"}[5m])) /
  sum(rate(http_requests_total{route="/health"}[5m]))
)
```

### ⚡ CPU Throttling

**CPU Throttling Events:**
```promql
rate(node_cpu_seconds_total{mode="steal"}[5m])
```

**Load Average (1m, 5m, 15m):**
```promql
node_load1
node_load5
node_load15
```

### 🌐 Network RX/TX Pressure

**Network Receive (MB/s):**
```promql
rate(node_network_receive_bytes_total{device!="lo"}[5m]) / 1024 / 1024
```

**Network Transmit (MB/s):**
```promql
rate(node_network_transmit_bytes_total{device!="lo"}[5m]) / 1024 / 1024
```

**Network Errors:**
```promql
rate(node_network_receive_errs_total[5m]) + rate(node_network_transmit_errs_total[5m])
```

### 💾 Disk I/O

**Disk Read IOPS:**
```promql
rate(node_disk_reads_completed_total[5m])
```

**Disk Write IOPS:**
```promql
rate(node_disk_writes_completed_total[5m])
```

**Disk Utilization (%):**
```promql
100 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"} * 100)
```

## 🎨 Dashboard Panel Suggestions

### Row 1: Application Health
- **Panel 1:** Availability % (Single Stat)
- **Panel 2:** Total RPS (Single Stat)
- **Panel 3:** P99 Latency (Single Stat)
- **Panel 4:** Active DB Connections (Single Stat)

### Row 2: Performance Trends
- **Panel 1:** Request Latency Over Time (Graph - P90, P95, P99)
- **Panel 2:** Requests Per Second (Graph)

### Row 3: Database Performance
- **Panel 1:** DB Query Latencies (Graph - Insert/Select P90)
- **Panel 2:** DB Operations Rate (Graph)

### Row 4: System Resources
- **Panel 1:** CPU Usage (Graph)
- **Panel 2:** Memory Usage (Graph)
- **Panel 3:** Network I/O (Graph)

### Row 5: Advanced Metrics
- **Panel 1:** Load Average (Graph)
- **Panel 2:** Disk I/O (Graph)
- **Panel 3:** Error Rates (Graph)

## 🔧 Grafana Dashboard Configuration Tips

### Time Range Settings
- Default: Last 1 hour
- Refresh: 5s auto-refresh during load testing
- Use relative time ranges for better performance

### Alert Thresholds (Recommended)
- **P99 Latency:** > 2000ms (Warning), > 5000ms (Critical)
- **Error Rate:** > 5% (Warning), > 10% (Critical)
- **CPU Usage:** > 80% (Warning), > 95% (Critical)
- **Memory Usage:** > 85% (Warning), > 95% (Critical)
- **Availability:** < 99% (Warning), < 95% (Critical)

### Panel Colors & Styling
- **Green:** Good performance metrics
- **Yellow:** Warning thresholds
- **Red:** Critical thresholds
- **Blue:** Informational metrics