import { Button, Card, Input, Label } from "@/components/shared/ui";
import { createGeographyAction } from "./actions";

interface Item {
  id: string;
  name: string;
}

export function GeographySection({
  estateSlug,
  kind,
  title,
  items,
}: {
  estateSlug: string;
  kind: "block" | "street" | "zone";
  title: string;
  items: Item[];
}) {
  return (
    <Card>
      <h2 className="font-medium">{title}</h2>
      <ul className="mt-3 space-y-1">
        {items.length === 0 && <li className="text-sm text-slate-400">None yet</li>}
        {items.map((item) => (
          <li key={item.id} className="text-sm text-slate-700">
            {item.name}
          </li>
        ))}
      </ul>
      <form
        action={async (formData) => {
          "use server";
          await createGeographyAction(estateSlug, kind, formData);
        }}
        className="mt-4 flex gap-2"
      >
        <div className="flex-1">
          <Label htmlFor={`${kind}-name`} className="sr-only">
            Name
          </Label>
          <Input id={`${kind}-name`} name="name" required placeholder={`Add ${kind}`} />
        </div>
        <Button type="submit" variant="secondary">
          Add
        </Button>
      </form>
    </Card>
  );
}
