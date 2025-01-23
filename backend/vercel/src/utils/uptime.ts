interface SystemInfo {
  hostname: string;
  platform: string;
  uptime: string;
  loadAvg: number[];
  memory: {
    total: number;
    free: number;
    used: number;
  };
  cpu: {
    model: string;
    speed: number;
    cores: number;
  };
}

export const getSystemInfo = (): SystemInfo => {
  const os = require('os');
  
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: formatUptime(os.uptime()),
    loadAvg: os.loadavg(),
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    },
    cpu: {
      model: os.cpus()[0].model,
      speed: os.cpus()[0].speed,
      cores: os.cpus().length
    }
  };
};

const formatUptime = (uptime: number): string => {
  const days = Math.floor(uptime / (24 * 60 * 60));
  const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptime % (60 * 60)) / 60);
  const seconds = Math.floor(uptime % 60);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

export function calculateUptime(startTime: number): string {
  const uptime = Date.now() - startTime;
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];
  
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours % 24}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes % 60}m`);
  parts.push(`${seconds % 60}s`);

  return parts.join(' ');
} 