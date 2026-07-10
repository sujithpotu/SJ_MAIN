import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Print from 'expo-print';
import { supabase } from '../../../lib/supabase';
import { formatCurrency, formatDate } from '../../../lib/format';
import { buildDispatchNoteHtml } from '../../../lib/dispatchNoteHtml';
import { DateField } from '../../../components/DateField';
import { SalesOrder, SalesOrderStatus, SALES_ORDER_STATUS_LABELS } from '../../../types/database';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  product: { name: string } | null;
}

interface OrderWithJoins extends SalesOrder {
  account: {
    name: string;
    location: string | null;
    contact_person: string | null;
    phone: string | null;
  } | null;
}

const STATUS_COLORS: Record<SalesOrderStatus, string> = {
  confirmed: '#64748b',
  delivery_planned: '#0891b2',
  dispatched: '#7c3aed',
  delivered: '#16a34a',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<OrderWithJoins | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [driverInfo, setDriverInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [orderRes, itemsRes] = await Promise.all([
      supabase
        .from('sales_orders')
        .select('*, account:accounts(name, location, contact_person, phone)')
        .eq('id', id)
        .single(),
      supabase
        .from('sales_order_items')
        .select('id, quantity, unit_price, product:products(name)')
        .eq('sales_order_id', id),
    ]);
    if (orderRes.error) setError(orderRes.error.message);
    const data = (orderRes.data as any) ?? null;
    setOrder(data);
    setItems((itemsRes.data as any) ?? []);
    if (data) {
      setDeliveryDate(data.delivery_date ?? '');
      setDeliveryAddress(data.delivery_address ?? '');
      setVehicleInfo(data.vehicle_info ?? '');
      setDriverInfo(data.driver_info ?? '');
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const locked = order ? order.status === 'dispatched' || order.status === 'delivered' : false;

  const handleSaveDelivery = async () => {
    if (!order) return;
    setSaving(true);
    const update: Record<string, unknown> = {
      delivery_date: deliveryDate || null,
      delivery_address: deliveryAddress.trim() || null,
      vehicle_info: vehicleInfo.trim() || null,
      driver_info: driverInfo.trim() || null,
    };
    if (order.status === 'confirmed' && deliveryDate && deliveryAddress.trim()) {
      update.status = 'delivery_planned';
    }
    const { error } = await supabase.from('sales_orders').update(update).eq('id', id);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    load();
  };

  const handleDispatch = async () => {
    if (!order) return;
    if (!deliveryDate || !deliveryAddress.trim()) {
      Alert.alert('Missing details', 'Set a delivery date and address before dispatching.');
      return;
    }
    setDispatching(true);
    try {
      const html = buildDispatchNoteHtml({
        accountName: order.account?.name ?? 'Unknown account',
        accountLocation: order.account?.location ?? null,
        accountContact: order.account?.contact_person ?? null,
        accountPhone: order.account?.phone ?? null,
        deliveryAddress: deliveryAddress.trim(),
        deliveryDate,
        vehicleInfo: vehicleInfo.trim() || null,
        driverInfo: driverInfo.trim() || null,
        items: items.map((item) => ({
          productName: item.product?.name ?? 'Unknown product',
          quantity: Number(item.quantity),
        })),
      });
      await Print.printAsync({ html });
      await supabase
        .from('sales_orders')
        .update({
          status: 'dispatched',
          dispatched_at: new Date().toISOString(),
          delivery_date: deliveryDate,
          delivery_address: deliveryAddress.trim(),
          vehicle_info: vehicleInfo.trim() || null,
          driver_info: driverInfo.trim() || null,
        })
        .eq('id', id);
      load();
    } catch (e: any) {
      Alert.alert('Could not dispatch', e.message ?? String(e));
    } finally {
      setDispatching(false);
    }
  };

  const handleReprint = async () => {
    if (!order) return;
    try {
      const html = buildDispatchNoteHtml({
        accountName: order.account?.name ?? 'Unknown account',
        accountLocation: order.account?.location ?? null,
        accountContact: order.account?.contact_person ?? null,
        accountPhone: order.account?.phone ?? null,
        deliveryAddress: order.delivery_address,
        deliveryDate: order.delivery_date,
        vehicleInfo: order.vehicle_info,
        driverInfo: order.driver_info,
        items: items.map((item) => ({
          productName: item.product?.name ?? 'Unknown product',
          quantity: Number(item.quantity),
        })),
      });
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('Could not print', e.message ?? String(e));
    }
  };

  const handleMarkDelivered = async () => {
    const { error } = await supabase
      .from('sales_orders')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      Alert.alert('Could not update', error.message);
      return;
    }
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Order not found.'}</Text>
      </View>
    );
  }

  const total = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={[styles.badge, { backgroundColor: STATUS_COLORS[order.status] }]}>
        <Text style={styles.badgeText}>{SALES_ORDER_STATUS_LABELS[order.status]}</Text>
      </View>

      <Text style={styles.accountName}>{order.account?.name ?? 'Unknown account'}</Text>

      <Text style={styles.sectionHeading}>Items</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.lineRow}>
          <Text style={styles.lineName}>{item.product?.name ?? 'Unknown product'}</Text>
          <Text style={styles.lineMeta}>
            {item.quantity} × {formatCurrency(Number(item.unit_price))} ={' '}
            {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
          </Text>
        </View>
      ))}
      <Text style={styles.grandTotal}>Total: {formatCurrency(total)}</Text>

      <Text style={styles.sectionHeading}>Delivery planning</Text>

      {locked ? (
        <View style={styles.readonlyBlock}>
          <Text style={styles.readonlyLine}>
            Date: {order.delivery_date ? formatDate(order.delivery_date) : 'Not set'}
          </Text>
          <Text style={styles.readonlyLine}>Address: {order.delivery_address ?? 'Not set'}</Text>
          <Text style={styles.readonlyLine}>Vehicle: {order.vehicle_info ?? 'Not set'}</Text>
          <Text style={styles.readonlyLine}>Driver: {order.driver_info ?? 'Not set'}</Text>
        </View>
      ) : (
        <>
          <DateField label="Delivery date" value={deliveryDate} onChange={setDeliveryDate} />
          <Text style={styles.label}>Delivery address</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Where should this be delivered?"
            multiline
          />
          <Text style={styles.label}>Vehicle</Text>
          <TextInput
            style={styles.input}
            value={vehicleInfo}
            onChangeText={setVehicleInfo}
            placeholder="e.g. Truck plate number"
          />
          <Text style={styles.label}>Driver</Text>
          <TextInput
            style={styles.input}
            value={driverInfo}
            onChangeText={setDriverInfo}
            placeholder="Driver name / phone"
          />

          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSaveDelivery}
            disabled={saving}
          >
            <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save delivery details'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dispatchButton, dispatching && styles.buttonDisabled]}
            onPress={handleDispatch}
            disabled={dispatching}
          >
            <Text style={styles.buttonText}>
              {dispatching ? 'Preparing…' : 'Print dispatch note & dispatch'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {locked && (
        <TouchableOpacity style={[styles.button, styles.dispatchButton]} onPress={handleReprint}>
          <Text style={styles.buttonText}>Print dispatch note again</Text>
        </TouchableOpacity>
      )}

      {order.status === 'dispatched' && (
        <TouchableOpacity
          style={[styles.button, styles.deliveredButton]}
          onPress={handleMarkDelivered}
        >
          <Text style={styles.buttonText}>Mark delivered</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626', fontSize: 15 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  accountName: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 20 },
  sectionHeading: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 10 },
  lineRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  lineName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  lineMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  grandTotal: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 12, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    color: '#0f172a',
  },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  readonlyBlock: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 20 },
  readonlyLine: { fontSize: 14, color: '#334155', marginBottom: 4 },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButton: { backgroundColor: '#2563eb' },
  dispatchButton: { backgroundColor: '#0f172a' },
  deliveredButton: { backgroundColor: '#16a34a', marginBottom: 40 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
