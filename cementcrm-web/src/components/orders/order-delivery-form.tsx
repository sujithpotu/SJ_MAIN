"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { buildDispatchNoteHtml } from "@/lib/dispatch-note-html";
import { printHtml } from "@/lib/print";
import { dispatchOrder, markDelivered, saveDeliveryDetails } from "@/app/(dashboard)/orders/actions";
import type { SalesOrder } from "@/types/database";

interface OrderItemLine {
  productName: string;
  quantity: number;
}

export function OrderDeliveryForm({
  order,
  accountName,
  accountLocation,
  accountContact,
  accountPhone,
  items,
}: {
  order: SalesOrder;
  accountName: string;
  accountLocation: string | null;
  accountContact: string | null;
  accountPhone: string | null;
  items: OrderItemLine[];
}) {
  const router = useRouter();
  const [deliveryDate, setDeliveryDate] = useState(order.delivery_date ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(order.delivery_address ?? "");
  const [vehicleInfo, setVehicleInfo] = useState(order.vehicle_info ?? "");
  const [driverInfo, setDriverInfo] = useState(order.driver_info ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const locked = order.status === "dispatched" || order.status === "delivered";

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveDeliveryDetails(order.id, {
        delivery_date: deliveryDate,
        delivery_address: deliveryAddress,
        vehicle_info: vehicleInfo,
        driver_info: driverInfo,
      });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  const handleDispatch = () => {
    if (!deliveryDate || !deliveryAddress.trim()) {
      setError("Set a delivery date and address before dispatching.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const html = buildDispatchNoteHtml({
        accountName,
        accountLocation,
        accountContact,
        accountPhone,
        deliveryAddress: deliveryAddress.trim(),
        deliveryDate,
        vehicleInfo: vehicleInfo.trim() || null,
        driverInfo: driverInfo.trim() || null,
        items,
      });
      printHtml(html);
      const result = await dispatchOrder(order.id, {
        delivery_date: deliveryDate,
        delivery_address: deliveryAddress,
        vehicle_info: vehicleInfo,
        driver_info: driverInfo,
      });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  const handleReprint = () => {
    const html = buildDispatchNoteHtml({
      accountName,
      accountLocation,
      accountContact,
      accountPhone,
      deliveryAddress: order.delivery_address,
      deliveryDate: order.delivery_date,
      vehicleInfo: order.vehicle_info,
      driverInfo: order.driver_info,
      items,
    });
    printHtml(html);
  };

  const handleMarkDelivered = () => {
    setError(null);
    startTransition(async () => {
      const result = await markDelivered(order.id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h3 className="text-sm font-semibold">Delivery planning</h3>

      {locked ? (
        <div className="rounded-md bg-muted p-3 text-sm">
          <p>Date: {order.delivery_date ? formatDate(order.delivery_date) : "Not set"}</p>
          <p>Address: {order.delivery_address ?? "Not set"}</p>
          <p>Vehicle: {order.vehicle_info ?? "Not set"}</p>
          <p>Driver: {order.driver_info ?? "Not set"}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delivery-date">Delivery date</Label>
            <input
              id="delivery-date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delivery-address">Delivery address</Label>
            <Textarea
              id="delivery-address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Where should this be delivered?"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicle-info">Vehicle</Label>
            <Input
              id="vehicle-info"
              value={vehicleInfo}
              onChange={(e) => setVehicleInfo(e.target.value)}
              placeholder="e.g. Truck plate number"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="driver-info">Driver</Label>
            <Input
              id="driver-info"
              value={driverInfo}
              onChange={(e) => setDriverInfo(e.target.value)}
              placeholder="Driver name / phone"
            />
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!locked && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={handleSave}>
            {pending ? "Saving…" : "Save delivery details"}
          </Button>
          <Button type="button" disabled={pending} onClick={handleDispatch}>
            {pending ? "Preparing…" : "Print dispatch note & dispatch"}
          </Button>
        </div>
      )}

      {locked && (
        <Button type="button" variant="outline" onClick={handleReprint} className="w-fit">
          Print dispatch note again
        </Button>
      )}

      {order.status === "dispatched" && (
        <Button type="button" disabled={pending} onClick={handleMarkDelivered} className="w-fit">
          {pending ? "Saving…" : "Mark delivered"}
        </Button>
      )}
    </div>
  );
}
