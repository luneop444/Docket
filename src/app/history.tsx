import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { BackBar, Screen } from '../components/Chrome';
import { Button, Card, Gap, Pill, press, Row, T, TimeBar } from '../components/ui';
import { csvFileName, historyCsv, historyText, stopRows, type StopRow } from '../logic/export';
import { clock, dur, money } from '../logic/format';
import { dayLabel, weekLabel, weekStart } from '../logic/history';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';
import { Tappable } from '../components/Tappable';

/** Save the CSV: a download in the browser, the share sheet on a phone. */
async function saveCsv(csv: string, name: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
  const r = await Share.share({ message: csv, title: name });
  return r.action !== Share.dismissedAction;
}

/** Every stop timed with "I'm here", newest week first, with copy and CSV export for disputes. */
export default function History() {
  const { s, a } = useStore();
  const rows = stopRows(s.history, s.rules);
  const total = rows.reduce((t, r) => t + r.owed, 0);

  // Newest week first, newest stop first inside it.
  const weeks = new Map<number, StopRow[]>();
  for (const r of [...rows].reverse()) {
    const k = weekStart(r.h.dayStart + r.h.arrive * 60000);
    weeks.set(k, [...(weeks.get(k) ?? []), r]);
  }

  async function copy() {
    await Clipboard.setStringAsync(historyText(s.history, s.rules, s.company));
    a.toast('Copied. Paste it into a text or email.');
  }
  async function csv() {
    try {
      if (await saveCsv(historyCsv(s.history, s.rules), csvFileName(Date.now()))) {
        if (Platform.OS === 'web') a.toast('Saved to your downloads.');
      }
    } catch {
      a.toast('Couldn’t save the file.');
    }
  }

  return (
    <Screen
      header={<BackBar label="Back" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/paycheck'))} />}
    >
      <T v="h2">Your stops</T>
      <Gap h={8} />
      <T v="bodySmall">
        {rows.length
          ? `${rows.length} stop${rows.length === 1 ? '' : 's'} · ${money(total)} detention by your rules. Everything stays on this phone.`
          : 'Stops you time with “I’m here” show up here, with the times you need if your pay comes up short.'}
      </T>
      <Gap h={16} />
      {rows.length ? (
        <>
          <Card>
            <T v="bodyStrong">Keep a record</T>
            <Gap h={4} />
            <T v="bodySmall">Send it to your fleet manager, or keep the file in case a settlement comes up short.</T>
            <Gap h={12} />
            <Row style={{ gap: 12 }}>
              <Button label="Copy as text" variant="white" small style={{ flex: 1 }} onPress={copy} />
              <Button
                label={Platform.OS === 'web' ? 'Download CSV' : 'Share CSV'}
                variant="white"
                small
                style={{ flex: 1 }}
                onPress={csv}
              />
            </Row>
          </Card>
          {[...weeks.entries()].map(([k, list]) => (
            <Fragment key={k}>
              <Gap h={20} />
              <T v="bodySmall" style={{ paddingLeft: 4 }}>{weekLabel(k)}</T>
              <Gap h={8} />
              <View style={{ gap: 8 }}>
                {list.map((r) => (
                  <StopCard key={r.h.id} r={r} onRemove={() => a.removeLogged(r.h.id)} />
                ))}
              </View>
            </Fragment>
          ))}
        </>
      ) : (
        <Button label="Go to Today" variant="quiet" small onPress={() => router.navigate('/today')} />
      )}
    </Screen>
  );
}

function StopCard({ r, onRemove }: { r: StopRow; onRemove: () => void }) {
  const { h, waited, paidMin, owed } = r;
  const hasBol = h.bolIn != null || h.bolOut != null;
  // Two taps: this record may be the driver's proof later.
  const [sure, setSure] = useState(false);
  return (
    <Card>
      <Row base>
        <T v="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{h.place}</T>
        <T v="numberS">{money(owed)}</T>
      </Row>
      <T v="bodyTiny">
        {dayLabel(h.dayStart)}
        {h.load ? ` · Load ${h.load}` : ''} · {clock(h.arrive)} to {clock(h.leave)}
      </T>
      <Gap h={10} />
      <TimeBar free={Math.max(0, waited - paidMin)} detention={paidMin} />
      <Gap h={8} />
      <Row>
        <T v="bodyTiny">
          Waited {dur(waited)}
          {paidMin > 0 ? `, ${dur(paidMin)} past free time` : ', within free time'}
        </T>
        {hasBol ? <Pill label="BOL" /> : null}
      </Row>
      <Tappable accessibilityRole="button" onPress={() => (sure ? onRemove() : setSure(true))} hitSlop={8} give={1} style={[press.hit, { marginTop: 4 }]}>
        <T v="bodyTiny" c={sure ? color.flag : undefined}>
          {sure ? 'Tap again to remove this stop for good' : 'Not a real stop? Remove it'}
        </T>
      </Tappable>
    </Card>
  );
}
