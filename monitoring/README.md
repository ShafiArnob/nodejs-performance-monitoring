## 🏥 **Application Health Overview**

### Panel 1: ✅ Availability %
```promql
100 * (sum(rate(http_requests_total{status_code!~"5.."}[5m])) / sum(rate(http_requests_total[5m])))
```
**Explanation**: Calculates the percentage of successful HTTP requests (non-5xx errors) over the last 5 minutes. Shows application uptime and reliability.

### Panel 2: ✅ Requests Per Second (RPS)
```promql
sum(rate(http_requests_total[1m]))
```
**Explanation**: Measures the total number of HTTP requests per second over the last minute. Indicates application load and traffic volume.

### Panel 3: ✅ Request Latency P99
```promql
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```
**Explanation**: Shows the 99th percentile response time - 99% of requests complete faster than this time. Critical for user experience monitoring.

### Panel 4: ✅ DB Connection Count
```promql
db_connections_active
```
**Explanation**: Shows the number of active database connections. Helps monitor database connection pool usage and potential bottlenecks.



## 🔧 **Enhanced CPU Metrics**

### Panel 5: CPU Usage %
```promql
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```
**Explanation**: Calculates CPU utilization by subtracting idle time from 100%. Shows how busy the CPU is across all cores.

### Panel 6: Load Average 1m
```promql
node_load1
```
**Explanation**: System load average over 1 minute. Shows the average number of processes waiting to run. Values > number of CPU cores indicate overload.

### Panel 7: Context Switches/sec
```promql
rate(node_context_switches_total[5m])
```
**Explanation**: Number of context switches per second. High values may indicate excessive multitasking or I/O wait, impacting performance.

### Panel 8: CPU I/O Wait %
```promql
avg(rate(node_cpu_seconds_total{mode="iowait"}[5m])) * 100
```
**Explanation**: Percentage of time CPU spends waiting for I/O operations. High values indicate disk or network bottlenecks.



## 💾 **Enhanced Memory Metrics**

### Panel 9: Memory Usage %
```promql
100 * (1 - ((node_memory_MemAvailable_bytes or node_memory_MemFree_bytes) / node_memory_MemTotal_bytes))
```
**Explanation**: Calculates memory utilization percentage. Uses MemAvailable (preferred) or MemFree as fallback. Shows actual memory pressure.

### Panel 10: Total Memory
```promql
node_memory_MemTotal_bytes
```
**Explanation**: Total physical memory installed in the system. Static value showing hardware capacity.

### Panel 11: Available Memory
```promql
node_memory_MemAvailable_bytes
```
**Explanation**: Memory available for new processes without swapping. More accurate than free memory as it includes reclaimable cache.

### Panel 12: Swap Usage %
```promql
100 * (node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes) / node_memory_SwapTotal_bytes
```
**Explanation**: Percentage of swap space being used. High swap usage indicates memory pressure and potential performance issues.



## 💽 **Enhanced Disk & Network Metrics**

### Panel 13: Disk Usage %
```promql
100 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"} * 100)
```
**Explanation**: Disk space utilization excluding temporary filesystems. Monitors storage capacity and prevents disk full scenarios.

### Panel 14: Disk Read MB/s
```promql
rate(node_disk_read_bytes_total[5m]) / 1024 / 1024
```
**Explanation**: Disk read throughput in megabytes per second. Indicates storage I/O load and potential disk bottlenecks.

### Panel 15: Disk Write MB/s
```promql
rate(node_disk_written_bytes_total[5m]) / 1024 / 1024
```
**Explanation**: Disk write throughput in megabytes per second. Monitors write-heavy operations and storage performance.

### Panel 16: Network RX MB/s
```promql
rate(node_network_receive_bytes_total{device!="lo"}[5m]) / 1024 / 1024
```
**Explanation**: Network receive throughput excluding loopback interface. Shows incoming network traffic and bandwidth usage.



## 📊 **Performance & Database Metrics**

### Panel 17: ✅ Request Latency (P90/P99) - Timeseries
```promql
# P90 Latency
histogram_quantile(0.90, rate(http_request_duration_seconds_bucket[5m]))

# P99 Latency  
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```
**Explanation**: Shows 90th and 99th percentile response times over time. P90 shows typical performance, P99 shows worst-case user experience.

### Panel 18: ✅ DB Insert Latency P90 - Timeseries
```promql
# Insert Operations P90
histogram_quantile(0.90, rate(db_query_duration_seconds_bucket{operation="insert"}[5m]))

# Select Operations P90
histogram_quantile(0.90, rate(db_query_duration_seconds_bucket{operation="select"}[5m]))
```
**Explanation**: Database query performance metrics separated by operation type. Helps identify which database operations are slow.



## 🌐 **System Resources (CPU & Memory) - Timeseries**

### Panel 19: ✅ CPU Usage - Timeseries
```promql
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```
**Explanation**: CPU utilization over time. Same as Panel 5 but as a timeline chart to show trends and patterns.

### Panel 20: ✅ Memory Usage - Timeseries
```promql
100 * (1 - ((node_memory_MemAvailable_bytes or node_memory_MemFree_bytes) / node_memory_MemTotal_bytes))
```
**Explanation**: Memory usage over time. Same as Panel 9 but shows historical trends and memory consumption patterns.



## 🌐 **Network & Advanced Metrics - Timeseries**

### Panel 21: ✅ Network RX/TX Pressure
```promql
# Network Receive
rate(node_network_receive_bytes_total{device!="lo"}[5m]) / 1024 / 1024

# Network Transmit
rate(node_network_transmit_bytes_total{device!="lo"}[5m]) / 1024 / 1024
```
**Explanation**: Network traffic in both directions over time. Shows bandwidth usage patterns and network load by device.

### Panel 22: ✅ CPU Throttling & Load
```promql
# CPU Steal Time (Virtualization Throttling)
rate(node_cpu_seconds_total{mode="steal"}[5m])

# Load Average 1 minute
node_load1

# Load Average 5 minutes  
node_load5
```
**Explanation**: Advanced CPU metrics. Steal time shows CPU stolen by hypervisor, load averages show system demand over different time windows.

### Panel 23: ✅ Error Rates ⚠️ (Problem Panel)
```promql
# 5xx Server Errors
100 * (sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# 4xx Client Errors
100 * (sum(rate(http_requests_total{status_code=~"4.."}[5m])) / sum(rate(http_requests_total[5m]))
```
**Explanation**: HTTP error rates as percentages. **This panel likely fails because `http_requests_total` metric doesn't exist in your setup yet.**

