import { Redirect } from 'expo-router';
import { setupStep } from '../logic/state';
import { useStore } from '../state/AppStore';

export default function Index() {
  const { s } = useStore();
  const step = setupStep(s);
  return <Redirect href={step ? (s.name ? step : '/welcome') : '/today'} />;
}
