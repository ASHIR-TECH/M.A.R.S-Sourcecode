import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

/** Entry redirect — authenticated users go to Chat, everyone else to Login. */
export default function IndexScreen() {
  const { isAuthenticated } = useAuth();
  return <Redirect href={isAuthenticated ? '/(tabs)/chat' : '/login'} />;
}
