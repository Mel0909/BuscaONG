// Os tipos do mapbox-gl usam o namespace global GeoJSON (UMD) sem referenciá-lo. Para funcionar:
// - este arquivo inclui o pacote (no TypeScript 6 a opção `types` passou a ser [] por padrão);
// - o tsconfig liga `allowUmdGlobalAccess`, porque os tipos do mapbox-gl são um módulo.
/// <reference types="geojson" />
