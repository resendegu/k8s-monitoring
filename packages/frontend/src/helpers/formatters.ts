/**
 * Kubernetes resource formatters
 * Converts raw Kubernetes metrics to human-readable formats
 */

/**
 * Converts CPU from nanocores to a human-readable format
 * @param cpuValue - CPU value in nanocores (e.g., "32859908n")
 * @returns Formatted CPU string (e.g., "32.86m" for millicores, "0.03" for cores)
 */
export function formatCPU(cpuValue: string): string {
  // Remove the 'n' suffix if present
  const numericValue = cpuValue.replace(/n$/i, '');
  const nanocores = parseInt(numericValue, 10);

  if (isNaN(nanocores)) {
    return '0';
  }

  // Convert nanocores to millicores (1 millicore = 1,000,000 nanocores)
  const millicores = nanocores / 1_000_000;

  // If less than 1000 millicores, show in millicores
  if (millicores < 1000) {
    return `${millicores.toFixed(2)}m`;
  }

  // Otherwise, show in cores (1 core = 1000 millicores)
  const cores = millicores / 1000;
  return cores.toFixed(2);
}

/**
 * Converts CPU from nanocores to percentage
 * @param cpuValue - CPU value in nanocores (e.g., "32859908n")
 * @param totalCores - Total CPU cores available on the node
 * @returns Percentage string (e.g., "3.2%")
 */
export function formatCPUPercentage(cpuValue: string, totalCores: number): string {
  const numericValue = cpuValue.replace(/n$/i, '');
  const nanocores = parseInt(numericValue, 10);

  if (isNaN(nanocores) || totalCores === 0) {
    return '0%';
  }

  // Convert nanocores to cores
  const cores = nanocores / 1_000_000_000;
  const percentage = (cores / totalCores) * 100;

  return `${percentage.toFixed(1)}%`;
}

/**
 * Converts CPU from nanocores to numeric percentage
 * @param cpuValue - CPU value in nanocores (e.g., "32859908n")
 * @param totalCores - Total CPU cores available on the node
 * @returns Numeric percentage (e.g., 3.2)
 */
export function getCPUPercentage(cpuValue: string, totalCores: number): number {
  const numericValue = cpuValue.replace(/n$/i, '');
  const nanocores = parseInt(numericValue, 10);

  if (isNaN(nanocores) || totalCores === 0) {
    return 0;
  }

  const cores = nanocores / 1_000_000_000;
  return (cores / totalCores) * 100;
}

/**
 * Converts memory from Kubernetes format to human-readable format
 * @param memoryValue - Memory value (e.g., "1847100Ki", "2Gi", "512Mi")
 * @returns Formatted memory string (e.g., "1.76 GiB", "512 MiB")
 */
export function formatMemory(memoryValue: string): string {
  // Parse the value and unit
  const match = memoryValue.match(/^(\d+(?:\.\d+)?)(.*?)$/);
  
  if (!match) {
    return '0 B';
  }

  const [, valueStr, unit] = match;
  let bytes = parseFloat(valueStr);

  // Convert to bytes based on unit
  switch (unit.toLowerCase()) {
    case 'ki':
      bytes *= 1024;
      break;
    case 'mi':
      bytes *= 1024 ** 2;
      break;
    case 'gi':
      bytes *= 1024 ** 3;
      break;
    case 'ti':
      bytes *= 1024 ** 4;
      break;
    case 'pi':
      bytes *= 1024 ** 5;
      break;
    case 'k':
      bytes *= 1000;
      break;
    case 'm':
      bytes *= 1000 ** 2;
      break;
    case 'g':
      bytes *= 1000 ** 3;
      break;
    case 't':
      bytes *= 1000 ** 4;
      break;
    case 'p':
      bytes *= 1000 ** 5;
      break;
    default:
      // Assume bytes if no unit
      break;
  }

  // Format to appropriate unit
  if (bytes >= 1024 ** 4) {
    return `${(bytes / (1024 ** 4)).toFixed(2)} TiB`;
  } else if (bytes >= 1024 ** 3) {
    return `${(bytes / (1024 ** 3)).toFixed(2)} GiB`;
  } else if (bytes >= 1024 ** 2) {
    return `${(bytes / (1024 ** 2)).toFixed(2)} MiB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KiB`;
  } else {
    return `${bytes.toFixed(0)} B`;
  }
}

/**
 * Converts memory to percentage
 * @param memoryValue - Memory value (e.g., "1847100Ki")
 * @param totalMemory - Total memory available (e.g., "4Gi")
 * @returns Percentage string (e.g., "45.2%")
 */
export function formatMemoryPercentage(memoryValue: string, totalMemory: string): string {
  const percentage = getMemoryPercentage(memoryValue, totalMemory);
  return `${percentage.toFixed(1)}%`;
}

/**
 * Converts memory to numeric percentage
 * @param memoryValue - Memory value (e.g., "1847100Ki")
 * @param totalMemory - Total memory available (e.g., "4Gi")
 * @returns Numeric percentage (e.g., 45.2)
 */
export function getMemoryPercentage(memoryValue: string, totalMemory: string): number {
  const usedBytes = memoryToBytes(memoryValue);
  const totalBytes = memoryToBytes(totalMemory);

  if (totalBytes === 0) {
    return 0;
  }

  return (usedBytes / totalBytes) * 100;
}

/**
 * Converts memory string to bytes
 * @param memoryValue - Memory value (e.g., "1847100Ki", "2Gi")
 * @returns Number of bytes
 */
export function memoryToBytes(memoryValue: string): number {
  const match = memoryValue.match(/^(\d+(?:\.\d+)?)(.*?)$/);
  
  if (!match) {
    return 0;
  }

  const [, valueStr, unit] = match;
  let bytes = parseFloat(valueStr);

  switch (unit.toLowerCase()) {
    case 'ki':
      bytes *= 1024;
      break;
    case 'mi':
      bytes *= 1024 ** 2;
      break;
    case 'gi':
      bytes *= 1024 ** 3;
      break;
    case 'ti':
      bytes *= 1024 ** 4;
      break;
    case 'pi':
      bytes *= 1024 ** 5;
      break;
    case 'k':
      bytes *= 1000;
      break;
    case 'm':
      bytes *= 1000 ** 2;
      break;
    case 'g':
      bytes *= 1000 ** 3;
      break;
    case 't':
      bytes *= 1000 ** 4;
      break;
    case 'p':
      bytes *= 1000 ** 5;
      break;
    default:
      break;
  }

  return bytes;
}

/**
 * Formats a timestamp to a human-readable relative time
 * @param timestamp - ISO timestamp or Date object
 * @returns Relative time string (e.g., "2 hours ago", "just now")
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDay < 30) {
    return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Formats a duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "2h 30m", "45s")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
}
