import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchLiveSignals, selectMetadataHit } from './geneApis';
afterEach(() => vi.unstubAllGlobals());
describe('gene lookup identity and source status', () => {
  it('selects valid MAP2 rather than METAP2 alias', () => expect(selectMetadataHit([{symbol:'METAP2',alias:['MAP2']},{symbol:'MAP2',entrezgene:4133}], 'MAP2').hit?.entrezgene).toBe(4133));
  it('does not resolve an ambiguous NEU alias', () => expect(selectMetadataHit([{symbol:'ERBB2',alias:['NEU']},{symbol:'NEU1',alias:['NEU']}], 'NEU').resolution).toBe('ambiguous'));
  it('queries canonical clinical signals for HER2 while keeping input map identity', async () => {
    const clinical: string[][] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('mygene')) return Response.json({hits:[{symbol:'ERBB2',alias:['HER2'],entrezgene:2064}],total:1});
      const body = JSON.parse(String(init?.body)); clinical.push(body.variables.s ?? body.variables.n);
      return Response.json({data:{genes:{nodes:url.includes('civic') ? [{name:'ERBB2',stats:{evidenceItemCount:307}}] : [{name:'ERBB2',geneCategories:[],interactions:[{drug:{name:'DRUG1'}}]}]}}});
    }));
    const result = (await fetchLiveSignals(['HER2'])).get('HER2');
    expect(result?.officialSymbol).toBe('ERBB2'); expect(result?.civicEvidenceCount).toBe(307);
    expect(result?.dgidbDrugs).toEqual(['DRUG1']); expect(clinical).toEqual([['ERBB2'],['ERBB2']]);
  });
  it('does not assign BRCA2 to kinase because its summary mentions kinase signaling', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('mygene') ? Response.json({hits:[{symbol:'BRCA2',name:'BRCA2 DNA repair associated',summary:'Regulates kinase signaling.'}],total:1}) : Response.json({data:{genes:{nodes:[]}}})));
    expect((await fetchLiveSignals(['BRCA2'])).get('BRCA2')?.inferredRole).toBe('DNA Repair');
  });
  it('returns unavailable status on upstream failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const result = (await fetchLiveSignals(['MAP2'])).get('MAP2');
    expect(result?.sourceStatus).toEqual({civic:'unavailable',dgidb:'unavailable',metadata:'unavailable'});
  });
  it('never accepts an incomplete alias result page as a definitive identity', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('mygene') ? Response.json({hits:[{symbol:'ERBB2',alias:['HER2']}],total:101}) : Response.json({data:{genes:{nodes:[]}}})));
    const result = (await fetchLiveSignals(['HER2'])).get('HER2');
    expect(result?.resolution).toBe('ambiguous'); expect(result?.officialSymbol).toBeUndefined();
  });
});
