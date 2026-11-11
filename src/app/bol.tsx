import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BackBar, Screen } from '../components/Chrome';
import { CameraIcon } from '../components/Icons';
import { Button, Fake, Gap, T } from '../components/ui';
import { clock } from '../logic/format';
import { TODAY_STOP } from '../logic/sampleData';
import { useStore } from '../state/AppStore';
import { color, protoColor } from '../theme/tokens';

/** Opens the camera (phone) or file picker (desktop). Falls back to the photo library. */
async function takePhoto(): Promise<string | null> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
  if (Platform.OS !== 'web') {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      const lib = await ImagePicker.launchImageLibraryAsync(opts);
      return lib.canceled ? null : lib.assets[0].uri;
    }
  }
  const r = await ImagePicker.launchCameraAsync(opts);
  return r.canceled ? null : r.assets[0].uri;
}

/** v1 10 Snap BOL */
export default function SnapBol() {
  const { s, ui, a } = useStore();

  async function pick() {
    try {
      const uri = await takePhoto();
      if (uri) a.setPhoto(uri);
    } catch {
      a.toast('Couldn’t open the camera.');
    }
  }
  function done(bol: boolean) {
    a.logStop(bol);
    router.replace('/summary');
  }

  return (
    <Screen
      header={<BackBar label="Today" onPress={() => router.navigate('/today')} />}
      footer={
        <>
          {ui.photoUri ? <Button label="Use this photo" onPress={() => done(true)} /> : null}
          <Button
            label="Skip, use location times"
            variant={ui.photoUri ? 'text' : 'quiet'}
            onPress={() => done(false)}
          />
        </>
      }
    >
      <T v="bodySmall">You left {TODAY_STOP.short} at {clock(s.stop.leave ?? s.now)}</T>
      <Gap h={8} />
      <T v="h2">Snap your signed bill of lading</T>
      <Gap h={8} />
      <T v="bodySmall">
        Docket reads the in and out times the facility wrote on it and checks them against your location times. Two
        records that agree are hard to argue with.
      </T>
      <Gap h={16} />
      <Pressable accessibilityRole="button" accessibilityLabel="Take a photo of your BOL" onPress={pick} style={styles.photo}>
        {ui.photoUri ? (
          <Image source={{ uri: ui.photoUri }} style={styles.img} accessibilityLabel="Your BOL photo" />
        ) : (
          <>
            <View style={styles.frame} />
            <View style={{ alignItems: 'center' }}>
              <CameraIcon />
              <T v="bodySmall" style={{ marginTop: 6 }}>Tap to take a photo</T>
            </View>
          </>
        )}
      </Pressable>
      <Gap h={12} />
      <T v="bodyTiny">
        The photo stays on your phone. <Fake /> Reading the times off the photo uses a sample result for now.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    backgroundColor: color.raise,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  frame: {
    position: 'absolute',
    top: 28,
    left: 28,
    right: 28,
    bottom: 28,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: protoColor.dashed,
    borderRadius: 16,
  },
});
