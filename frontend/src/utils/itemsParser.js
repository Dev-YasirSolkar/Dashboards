export function parsePartsFromSheetText(partsText) {
  if (!partsText || String(partsText).includes('No parts issued')) return [];
  const items = [];
  const blocks = String(partsText).split(/\n\s*\n|\n(?=\d+\.\s)/).map(b => b.trim()).filter(Boolean);
  
  blocks.forEach(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    
    const headerLine = lines[0] || '';
    let partName = headerLine.replace(/^\d+\.\s*/, '').trim();
    let partNumber = 'N/A';
    
    const match = headerLine.match(/(?:\d+\.\s*)?(.+?)\s*(?:\(([^)]+)\))?$/);
    if (match) {
      partName = (match[1] || partName).replace(/^\d+\.\s*/, '').trim();
      if (match[2]) partNumber = match[2].trim();
    }
    
    let qtyIssued = 1;
    let qtyUsed = 0;
    let qtyReturned = 0;
    let unit = 'Nos';
    
    const fullText = lines.join(' ');
    const qtyMatch = fullText.match(/Issued:\s*(\d+)\s*(\w+)?/i);
    if (qtyMatch) {
      qtyIssued = parseInt(qtyMatch[1]) || 1;
      if (qtyMatch[2]) unit = qtyMatch[2].trim();
    }
    
    const usedMatch = fullText.match(/Used:\s*(\d+)/i);
    if (usedMatch) qtyUsed = parseInt(usedMatch[1]) || 0;
    
    const returnedMatch = fullText.match(/Returned:\s*(\d+)/i);
    if (returnedMatch) qtyReturned = parseInt(returnedMatch[1]) || 0;
    
    items.push({
      partId: 'part-' + (partNumber !== 'N/A' ? partNumber : Math.random().toString(36).substring(2, 8)),
      partNumber,
      partName,
      name: partName,
      qtyIssued: Math.max(qtyIssued, qtyUsed + qtyReturned),
      qtyUsed,
      qtyReturned,
      unit,
      unitPrice: 0
    });
  });
  
  return items;
}

export function parseItemsIssued(rawItems) {
  if (!rawItems) return [];

  if (Array.isArray(rawItems)) {
    const result = [];
    rawItems.forEach(item => {
      if (typeof item === 'string') {
        result.push(...parsePartsFromSheetText(item));
      } else if (item && typeof item === 'object') {
        result.push({
          partId: item.partId || item.id || 'part-' + (item.partNumber || Math.random().toString(36).substring(2, 7)),
          partNumber: item.partNumber || item.number || 'N/A',
          partName: item.partName || item.name || 'Spare Part',
          name: item.partName || item.name || 'Spare Part',
          qtyIssued: Number(item.qtyIssued) || 1,
          qtyUsed: Number(item.qtyUsed) || 0,
          qtyReturned: Number(item.qtyReturned) || 0,
          qtyDamaged: Number(item.qtyDamaged) || 0,
          unit: item.unit || 'Nos',
          unitPrice: Number(item.unitPrice) || 0,
          itemStatus: item.itemStatus || 'ISSUED',
          installationNotes: item.installationNotes || ''
        });
      }
    });
    return result;
  }

  if (typeof rawItems === 'string') {
    const trimmed = rawItems.trim();
    if (!trimmed || trimmed === 'No parts issued') return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const json = JSON.parse(trimmed);
        return parseItemsIssued(json);
      } catch (e) {}
    }
    return parsePartsFromSheetText(trimmed);
  }

  return [];
}

export function normalizeStatus(statusStr) {
  if (!statusStr) return 'DISPATCHED';
  const s = String(statusStr).toUpperCase();
  if (s.includes('COMPLETED')) return 'COMPLETED';
  if (s.includes('SCHEDULED')) return 'SCHEDULED';
  return 'DISPATCHED';
}
