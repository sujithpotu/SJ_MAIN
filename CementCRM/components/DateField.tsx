import { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  label: string;
  value: string; // YYYY-MM-DD, or '' for unset
  onChange: (value: string) => void;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DateField({ label, value, onChange }: Props) {
  const dateValue = value ? new Date(`${value}T00:00:00`) : new Date();
  const [showPicker, setShowPicker] = useState(false);

  // iOS "compact" is a persistent native pill that opens its own popover —
  // just render it directly, no manual open/close state needed.
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.field}>
          <DateTimePicker
            value={dateValue}
            mode="date"
            display="compact"
            locale="en-GB"
            onChange={(event, selectedDate) => {
              if (event.type === 'dismissed') return;
              if (selectedDate) onChange(toDateString(selectedDate));
            }}
          />
          {!value && (
            <Text style={styles.placeholderHint}>Not set — tap the date to choose one</Text>
          )}
        </View>
      </View>
    );
  }

  // Android's "default" display is a triggered dialog, not a persistent
  // widget, so it needs to be mounted only while open.
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.androidField} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value || 'Select a date'}
        </Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          locale="en-GB"
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (event.type === 'dismissed') return;
            if (selectedDate) onChange(toDateString(selectedDate));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  androidField: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  placeholderHint: { fontSize: 12, color: '#94a3b8', marginLeft: 8 },
  valueText: { fontSize: 15, color: '#0f172a' },
  placeholderText: { fontSize: 15, color: '#94a3b8' },
});
