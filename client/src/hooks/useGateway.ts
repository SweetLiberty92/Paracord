import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { gateway } from '../gateway/connection';

export function useGateway() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      gateway.connect();
    }
    return () => {
      gateway.disconnect();
    };
  }, [token]);
}
