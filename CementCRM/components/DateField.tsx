import { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [draft, setDraft] = useState<Date>(value ? new Date(`${value}T00:00:00`) : new Date());

  const openPicker = () => {
    setDraft(value ? new Date(`${value}T00:00:00`) : new Date());
    setShowPicker(true);
  };

  if (Platform.OS === 'android') {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.field} onPress={openPicker}>
          <Text style={value ? styles.valueText : styles.placeholderText}>
            {value || 'Select a date'}
          </Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={draft}
            mode="date"
            display="default"
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

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={openPicker}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value || 'Select a date'}
        </Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              style={styles.picker}
              onChange={(_event, selectedDate) => {
                if (selectedDate) setDraft(selectedDate);
              }}
            />
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onChange(toDateString(draft));
                  setShowPicker(false);
                }}
              >
                <Text style={styles.done}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: 360,
  },
  picker: { height: 420, width: '100%' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
    marginTop: 8,
  },
  cancel: { color: '#64748b', fontSize: 15, fontWeight: '600' },
  done: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
});
