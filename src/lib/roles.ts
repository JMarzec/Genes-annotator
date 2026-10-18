import type { GeneRole } from '@/data/sampleData';
export const ROLE_ORDER: GeneRole[] = ['Oncogene', 'Tumor Suppressor', 'Kinase', 'DNA Repair', 'TF', 'Immune', 'Unknown'];
const tokens: Record<GeneRole, string> = { Oncogene: 'oncogene', 'Tumor Suppressor': 'tumor-suppressor', Kinase: 'kinase', 'DNA Repair': 'dna-repair', TF: 'tf', Immune: 'immune', Unknown: 'unknown' };
export const ROLE_COLORS = Object.fromEntries(ROLE_ORDER.map(r => [r, `hsl(var(--${tokens[r]}))`])) as Record<GeneRole, string>;
export const ROLE_STYLES: Record<GeneRole, string> = {
  Oncogene: 'bg-oncogene/15 text-oncogene', 'Tumor Suppressor': 'bg-tumor-suppressor/15 text-tumor-suppressor', Kinase: 'bg-kinase/15 text-kinase', 'DNA Repair': 'bg-dna-repair/15 text-dna-repair', TF: 'bg-tf/15 text-tf', Immune: 'bg-immune/15 text-immune', Unknown: 'bg-unknown/15 text-unknown',
};
