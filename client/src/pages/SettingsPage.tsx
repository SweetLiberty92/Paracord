import { useNavigate } from 'react-router-dom';
import { UserSettings } from '../components/user/UserSettings';

export function SettingsPage() {
  const navigate = useNavigate();

  return <UserSettings onClose={() => navigate(-1)} />;
}
