import { useState, useEffect } from 'react';
import { healthCheck } from '@/services/accessApi';
import { Badge } from '@/components/ui/badge';
import { Database, WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await healthCheck();
        setStatus('connected');
      } catch {
        setStatus('disconnected');
      }
    };

    checkConnection();
    
    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'checking') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Database className="h-3 w-3 animate-pulse" />
        Checking...
      </Badge>
    );
  }

  if (status === 'connected') {
    return (
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
        <Database className="h-3 w-3" />
        MS Access Connected
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1">
      <WifiOff className="h-3 w-3" />
      Backend Offline
    </Badge>
  );
}
