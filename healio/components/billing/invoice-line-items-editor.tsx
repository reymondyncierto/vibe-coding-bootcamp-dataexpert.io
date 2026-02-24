"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type InvoiceLineItemDraft = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type Props = {
  items: InvoiceLineItemDraft[];
  onChange: (items: InvoiceLineItemDraft[]) => void;
};

function nextItem(): InvoiceLineItemDraft {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unitPrice: "0.00",
  };
}

export function InvoiceLineItemsEditor({ items, onChange }: Props) {
  function updateItem(id: string, patch: Partial<InvoiceLineItemDraft>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    onChange(items.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Line Items</p>
        <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...items, nextItem()])}>
          Add Line Item
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-card border border-border bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Item {index + 1}</p>
              <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(item.id)} disabled={items.length <= 1}>
                Remove
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_120px_140px]">
              <Input
                name={`line-item-description-${index}`}
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(item.id, { description: e.currentTarget.value })}
              />
              <Input
                name={`line-item-quantity-${index}`}
                type="number"
                min={1}
                step={1}
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, { quantity: e.currentTarget.value })}
              />
              <Input
                name={`line-item-unit-price-${index}`}
                inputMode="decimal"
                placeholder="Unit price"
                value={item.unitPrice}
                onChange={(e) => updateItem(item.id, { unitPrice: e.currentTarget.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function createDefaultInvoiceLineItemDrafts() {
  return [nextItem()];
}
