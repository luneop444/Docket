import { Redirect } from 'expo-router';
import { useStore } from '../state/AppStore';

export default function Index() {
  const { s } = useStore();
  return <Redirect href={s.onboarded ? '/today' : '/welcome'} />;
}
