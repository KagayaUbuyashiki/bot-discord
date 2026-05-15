import { ItemCatalogTab } from "./ItemCatalogTab";

export function MutantsTab() {
  return (
    <ItemCatalogTab
      title="Preços — Peças de Mutante"
      table="mutant_prices"
      bucket="mutant-images"
      emptyHint="Nenhuma peça cadastrada"
    />
  );
}
