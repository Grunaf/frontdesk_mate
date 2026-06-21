export type ProductMapStatus = 'planned' | 'implemented' | 'smoke_ok' | 'prod_ready';

export type ProductMapArea = 'Admin' | 'Guest' | 'Reception' | 'City pack' | 'Landing' | 'Platform';

export interface ProductMapEntry {
  id: string;
  useCase: string;
  area: ProductMapArea;
  status: ProductMapStatus;
  smokeSpec: string;
  notes: string;
}
