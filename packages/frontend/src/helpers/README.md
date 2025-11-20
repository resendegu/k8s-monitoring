# Formatters Test Examples

## CPU Formatting

```typescript
import { formatCPU, formatCPUPercentage, getCPUPercentage } from './helpers';

// Example from your API
const cpuUsage = '32859908n';

console.log(formatCPU(cpuUsage));
// Output: "32.86m" (32.86 millicores)

// With total cores for percentage
const totalCores = 2; // 2 CPU cores
console.log(formatCPUPercentage(cpuUsage, totalCores));
// Output: "1.6%" (percentage of 2 cores)

// Numeric percentage for calculations
const percent = getCPUPercentage(cpuUsage, totalCores);
console.log(percent);
// Output: 1.64 (numeric value)
```

## Memory Formatting

```typescript
import { formatMemory, formatMemoryPercentage, getMemoryPercentage } from './helpers';

// Example from your API
const memoryUsage = '1847100Ki';

console.log(formatMemory(memoryUsage));
// Output: "1.76 GiB" (human-readable)

// With total memory for percentage
const totalMemory = '4Gi';
console.log(formatMemoryPercentage(memoryUsage, totalMemory));
// Output: "45.2%" (percentage of total)

// Numeric percentage for calculations
const percent = getMemoryPercentage(memoryUsage, totalMemory);
console.log(percent);
// Output: 45.18 (numeric value)
```

## Real Examples

```typescript
// Your actual data
const node = {
  name: '10.0.10.137',
  roles: 'node',
  version: 'v1.34.1',
  cpuUsage: '32859908n',
  memoryUsage: '1847100Ki',
  cpuCapacity: '2000000000n', // 2 cores in nanocores
  memoryCapacity: '4Gi'
};

// Format for display
console.log('CPU:', formatCPU(node.cpuUsage)); // "32.86m"
console.log('Memory:', formatMemory(node.memoryUsage)); // "1.76 GiB"

// Calculate percentages
console.log('CPU %:', formatCPUPercentage(node.cpuUsage, 2)); // "1.6%"
console.log('Memory %:', formatMemoryPercentage(node.memoryUsage, node.memoryCapacity)); // "44.0%"
```

## Supported Units

### CPU
- `n` - nanocores (1 billion nanocores = 1 core)
- `m` - millicores (1000 millicores = 1 core)
- no suffix - cores

### Memory
- `Ki` - Kibibytes (1024 bytes)
- `Mi` - Mebibytes (1024^2 bytes)
- `Gi` - Gibibytes (1024^3 bytes)
- `Ti` - Tebibytes (1024^4 bytes)
- `K`, `M`, `G`, `T` - Decimal units (1000-based)

## Usage in Components

The formatters are now used in the `Nodes` component to display:
- CPU usage in millicores or cores (human-readable)
- Memory usage in appropriate units (KiB, MiB, GiB)
- Accurate percentage bars based on actual capacity

The component handles both:
- Real data from the API (with nanocores and Ki units)
- Mock data for demo mode (with realistic values)
