import * as ImagePicker from 'expo-image-picker';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { View } from 'react-native';
import { shrinkPhoto, type DocFile } from '../state/readDoc';

export interface Shot {
  file: DocFile;
  preview: string;
}
export type CamState = 'starting' | 'live' | 'off';
export interface Viewfinder {
  capture: () => Promise<Shot | null>;
}

/**
 * On the phone build the shutter opens the system camera (a live in-app viewfinder needs
 * expo-camera, which isn't in this build). The scanner says so.
 */
export const ScanViewfinder = forwardRef<Viewfinder, { onState: (s: CamState) => void }>(function ScanViewfinder({ onState }, ref) {
  useEffect(() => onState('off'), [onState]);
  useImperativeHandle(ref, () => ({
    async capture() {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      const r = cam.granted
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (r.canceled) return null;
      return { file: await shrinkPhoto(r.assets[0].uri), preview: r.assets[0].uri };
    },
  }));
  return <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0B0B0C' }} />;
});
