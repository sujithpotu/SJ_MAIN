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
  const [showPicker, setShowPicker] = useState(false);
  const dateValue = value ? new Date(`${value}T00:00:00`) : new Date();

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value || 'Select a date'}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selectedDate) => {
            setShowPicker(Platform.OS === 'ios');
            if (event.type === 'dismissed') {
              setShowPicker(false);
              return;
            }
            if (selectedDate) onChange(toDateString(selectedDate));
            if (Platform.OS === 'android') setShowPicker(false);
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  valueText: { fontSize: 15, color: '#0f172a' },
  placeholderText: { fontSize: 15, color: '#94a3b8' },
});
