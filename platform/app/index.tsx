import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AppIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/LandingPage');
  }, []);

  return null;
}