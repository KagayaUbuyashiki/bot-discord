import { ItemCatalogTab } from "./ItemCatalogTab";

export function EquipmentTab() {
  return (
    <ItemCatalogTab
      title="Equipamentos"
      table="equipment"
      bucket="equipment-images"
      emptyHint="Nenhum equipamento cadastrado"
    />
  );
}
