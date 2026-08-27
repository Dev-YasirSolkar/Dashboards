const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx2SPJN0KtddPqI3J2QmWkr6J7d2iN5bbFD2M2wakw_bln_sK5uYJIdfqjzP6ex4YlT7w/exec';

let lastWriteTimestamp = 0;

/**
 * Cleanly format multi-line bullet points for Google Sheets
 */
function formatPartsForSheet(itemsIssued) {
  if (!itemsIssued || itemsIssued.length === 0) return 'No parts issued';

  return itemsIssued.map((item, idx) => {
    const issued = item.qtyIssued || 0;
    const used = item.qtyUsed || 0;
    const returned = item.qtyReturned || 0;
    const unit = item.unit || 'Nos';

    let statusLine = `Issued: ${issued} ${unit}`;
    if (used > 0 || returned > 0) {
      statusLine += `  ➜  Used: ${used} | Returned: ${returned}`;
    }

    const pName = item.partName || item.name || 'Spare Part';
    return `${idx + 1}. ${pName} (${item.partNumber || 'N/A'})\n   └ ${statusLine}`;
  }).join('\n\n');
}

function formatWorkClausesForSheet(dispatch) {
  if (!dispatch) return 'Service Visit';

  const isCompleted = dispatch.status === 'COMPLETED' || (typeof dispatch.status === 'string' && dispatch.status.includes('COMPLETED'));

  // ── 1. IF DISPATCH IS IN-PROGRESS (DISPATCHED / SCHEDULED) ──
  if (!isCompleted) {
    let tasks = [];
    if (Array.isArray(dispatch.assignedTasks) && dispatch.assignedTasks.length > 0) {
      tasks = dispatch.assignedTasks;
    } else if (dispatch.issueDescription) {
      tasks = dispatch.issueDescription.split(/ • |\n/).map(s => s.trim()).filter(Boolean);
    }

    if (tasks.length === 0) {
      tasks = ['Service Visit'];
    }

    const cleanBullets = tasks.map(t => {
      // Filter out meta status strings
      if (t.includes('⚠️') || t.includes('Work Summary:') || t.includes('On Site')) return null;
      const clean = t.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                     .replace(/^[•\-\*\s✅❌]+/g, '')
                     .replace(/^(Done|Pending):\s*/i, '')
                     .trim();
      return clean ? `• ${clean}` : null;
    }).filter(Boolean);

    let result = cleanBullets.join('\n');
    result += `\n  ⚠️ (Work Summary: On Site (In Progress))`;
    return result;
  }

  // ── 2. IF DISPATCH IS COMPLETED ──
  const report = dispatch.completionReport;
  const lines = [];
  const pendingReasons = [];

  if (report && (Array.isArray(report.completedTasks) || Array.isArray(report.incompleteTasks))) {
    // A. Completed tasks from employee's report
    if (Array.isArray(report.completedTasks)) {
      report.completedTasks.forEach(task => {
        if (task.includes('⚠️') || task.includes('Work Summary:') || task.includes('On Site')) return;
        const clean = task.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                          .replace(/^[•\-\*\s✅❌]+/g, '')
                          .replace(/^(Done|Pending):\s*/i, '')
                          .trim();
        if (clean) lines.push(`• ✅ ${clean}`);
      });
    }

    // B. Incomplete / Pending tasks from employee's report with Reason directly underneath
    if (Array.isArray(report.incompleteTasks)) {
      report.incompleteTasks.forEach(item => {
        const taskName = typeof item === 'string' ? item : (item.task || '');
        if (taskName.includes('⚠️') || taskName.includes('Work Summary:') || taskName.includes('On Site')) return;
        const reason = typeof item === 'object' ? item.reason : '';
        const clean = taskName.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                             .replace(/^[•\-\*\s✅❌]+/g, '')
                             .replace(/^(Done|Pending):\s*/i, '')
                             .trim();
        if (clean) {
          lines.push(`• ❌ ${clean}`);
          if (reason && reason.trim()) {
            lines.push(`  ⚠️ (Reason: ${reason.trim()})`);
          }
        }
      });
    }

    // C. Extra work completed
    if (Array.isArray(report.extraWork)) {
      report.extraWork.forEach(task => {
        if (task.includes('⚠️') || task.includes('Work Summary:') || task.includes('On Site')) return;
        const clean = task.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                          .replace(/^[•\-\*\s✅❌]+/g, '')
                          .trim();
        if (clean) lines.push(`• ✅ ${clean}`);
      });
    }

    // D. Custom overall remark
    const customRemark = (dispatch.customerRemarks || report.remarks || dispatch.notes || '').trim();
    if (customRemark) {
      lines.push(`  ⚠️ (Remark: ${customRemark})`);
    }
  } else {
    // Fallback: parse from workSummary string or assignedTasks
    const rawText = dispatch.workSummary || dispatch.issueDescription || '';
    const clauses = rawText.split(/\n| \| /).map(c => c.trim()).filter(Boolean);

    clauses.forEach(c => {
      // Keep line if it is already a Reason or Remark line
      if (c.includes('⚠️')) {
        lines.push(`  ${c.replace(/^[•\-\*\s]+/g, '')}`);
        return;
      }
      if (c.toLowerCase().startsWith('notes:') || c.toLowerCase().includes('service visit completed')) return;

      const isPending = c.includes('❌') || c.toLowerCase().includes('pending');
      const clean = c.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                     .replace(/^[•\-\*\s✅❌]+/g, '')
                     .replace(/^(Done|Pending):\s*/i, '')
                     .trim();
      if (!clean) return;

      lines.push(`• ${isPending ? '❌' : '✅'} ${clean}`);
    });
  }

  if (lines.length === 0) {
    lines.push('• ✅ Service Visit Completed');
  }

  return lines.join('\n');
}

/**
 * Sync dispatch record to Google Sheets
 */
async function syncDispatchToGoogleSheets(dispatch) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) return false;
  lastWriteTimestamp = Date.now();

  try {
    const formattedParts = formatPartsForSheet(dispatch.itemsIssued);
    let formattedWork = formatWorkClausesForSheet(dispatch);
    
    // Clean date string to avoid duplicate "Outward: Outward: ..." wrapping
    let rawDateStr = String(dispatch.dispatchDate || '')
      .replace(/Outward:\s*/gi, '')
      .replace(/Returned:\s*/gi, '')
      .replace(/\s*\([\d:\sAPM]+\)/gi, '')
      .split('\n')[0]
      .trim();
    if (!rawDateStr || rawDateStr.includes('Invalid Date')) {
      rawDateStr = new Date().toISOString().split('T')[0];
    }

    let rawTimeStr = dispatch.dispatchTime ? String(dispatch.dispatchTime).replace(/[\(\)]/g, '').trim() : '';

    let dateStr = `Outward: ${rawDateStr}${rawTimeStr ? ` (${rawTimeStr})` : ''}`;
    if (dispatch.returnDate) {
      let rawReturnDateStr = String(dispatch.returnDate || '')
        .replace(/Returned:\s*/gi, '')
        .replace(/Outward:\s*/gi, '')
        .replace(/\s*\([\d:\sAPM]+\)/gi, '')
        .split('\n')[0]
        .trim();
      let rawReturnTimeStr = dispatch.returnTime ? String(dispatch.returnTime).replace(/[\(\)]/g, '').trim() : '';
      dateStr += `\nReturned: ${rawReturnDateStr}${rawReturnTimeStr ? ` (${rawReturnTimeStr})` : ''}`;
    }

    let cleanLeadTech = String(dispatch.leadTechnician || 'Technician')
      .split('\n')[0]
      .replace(/\s*\([\s\S]*$/, '')
      .trim() || 'Technician';

    let teamStr = cleanLeadTech;
    if (Array.isArray(dispatch.teamMembers) && dispatch.teamMembers.length > 0) {
      teamStr += `\n(Helpers: ${dispatch.teamMembers.join(', ')})`;
    }

    const payload = {
      action: 'SAVE_DISPATCH',
      dispatchCode: dispatch.dispatchCode,
      clientName: dispatch.clientName,
      siteAddress: dispatch.siteAddress,
      forkliftModel: (() => {
        const rawModel = String(dispatch.forkliftModel || 'Standard Forklift');
        const models = rawModel.split(/,|\n/).map(s => s.trim()).filter(Boolean);
        let formatted = models.length > 1 
          ? models.map(m => `• ${m}`).join('\n')
          : (models[0] || 'Standard Forklift');
        if (dispatch.forkliftSerialNo) {
          formatted += `\n(S/N: ${dispatch.forkliftSerialNo})`;
        }
        return formatted;
      })(),
      leadTechnician: teamStr,
      dispatchDate: dateStr,
      status: dispatch.status === 'COMPLETED' ? '✅ COMPLETED' : '🚚 ON SITE (IN PROGRESS)',
      itemsIssued: formattedParts,
      workSummary: formattedWork,
      // ── Cost Columns ────────────────────────────────────────
      partsCost: dispatch.costBreakdown?.partsCost ?? '',
      travellingCost: dispatch.costBreakdown?.travellingCost ?? '',
      otherCost: (() => {
        if (!dispatch.costBreakdown) return '';
        const labour = dispatch.costBreakdown.labourCost || 0;
        const other = dispatch.costBreakdown.otherCost || 0;
        const note = dispatch.costBreakdown.otherCostNote ? ` (${dispatch.costBreakdown.otherCostNote})` : '';
        return labour + other > 0 ? `${labour + other}${note}` : '';
      })(),
      totalTripCost: dispatch.costBreakdown?.totalCost ?? ''
    };

    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    console.log(`[Google Sheets] Synced dispatch ${dispatch.dispatchCode}. Status: ${response.status}`);
    return true;
  } catch (err) {
    console.error('[Google Sheets Sync Error]:', err.message);
    return false;
  }
}

/**
 * Delete a dispatch from Google Sheets
 */
async function deleteDispatchFromGoogleSheets(dispatchCode) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL || !dispatchCode) return false;
  lastWriteTimestamp = Date.now();

  try {
    const payload = {
      action: 'DELETE_DISPATCH',
      dispatchCode: dispatchCode
    };

    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    console.log(`[Google Sheets] Deleted dispatch ${dispatchCode} from sheet. Status: ${response.status}`);
    return true;
  } catch (err) {
    console.error('[Google Sheets Delete Error]:', err.message);
    return false;
  }
}

/**
 * Sync entire inventory master list to Google Sheets (Full Replace / Update)
 */
async function syncInventoryToGoogleSheets(inventory) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) return false;
  lastWriteTimestamp = Date.now();

  try {
    const payload = {
      action: 'SYNC_INVENTORY',
      inventory: (inventory || []).map(item => ({
        partNumber: item.partNumber,
        name: item.name,
        category: item.category,
        stockQuantity: item.stockQuantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        locationRack: item.locationRack
      }))
    };

    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    console.log(`[Google Sheets] Synced ${inventory.length} inventory parts to sheet. Status: ${response.status}`);
    return true;
  } catch (err) {
    console.error('[Google Sheets Inventory Sync Error]:', err.message);
    return false;
  }
}

/**
 * Sync all technicians to Google Sheets (Full Replace / Update)
 */
async function syncTechniciansToGoogleSheets(technicians) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) return false;
  lastWriteTimestamp = Date.now();

  try {
    const payload = {
      action: 'SYNC_TECHNICIANS',
      technicians: (technicians || []).map(tech => ({
        name: tech.name,
        phone: tech.phone || 'N/A',
        designation: tech.designation || 'Technician',
        experience: tech.experience || '1 Year',
        status: tech.status || 'Available'
      }))
    };

    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    console.log(`[Google Sheets] Synced ${technicians.length} technicians to sheet. Status: ${response.status}`);
    return true;
  } catch (err) {
    console.error('[Google Sheets Technicians Sync Error]:', err.message);
    return false;
  }
}

/**
 * Sync all clients / sites to Google Sheets (Full Replace / Update)
 */
async function syncClientsToGoogleSheets(clients) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) return false;
  lastWriteTimestamp = Date.now();

  try {
    const payload = {
      action: 'SYNC_CLIENTS',
      clients: (clients || []).map(cli => ({
        clientName: cli.clientName,
        siteAddress: cli.siteAddress,
        contactPerson: cli.contactPerson || 'N/A',
        forklifts: (() => {
          if (!cli.forklifts) return 'N/A';
          let list = [];
          if (Array.isArray(cli.forklifts)) {
            list = cli.forklifts.flatMap(f => String(f).split(/,|\n/)).map(s => s.trim()).filter(Boolean);
          } else if (typeof cli.forklifts === 'string') {
            list = cli.forklifts.split(/,|\n/).map(s => s.trim()).filter(Boolean);
          }
          if (list.length === 0) return 'N/A';
          return list.map(m => `• ${m}`).join('\n');
        })()
      }))
    };

    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    console.log(`[Google Sheets] Synced ${clients.length} clients to sheet. Status: ${response.status}`);
    return true;
  } catch (err) {
    console.error('[Google Sheets Clients Sync Error]:', err.message);
    return false;
  }
}

/**
 * Pull latest data from Google Sheets into Local Database (Sheet ➔ App)
 * Guarded against race conditions with recent writes
 */
async function fetchAllDataFromGoogleSheets(force = false) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) return null;

  // If a local write occurred in the last 10 seconds, do not overwrite with potentially stale read
  if (!force && Date.now() - lastWriteTimestamp < 10000) {
    console.log('[Google Sheets] Skipping pull: recent local write in progress.');
    return null;
  }

  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return null;
    const json = await response.json();
    return json.data || null;
  } catch (err) {
    try {
      const postRes = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'GET_ALL_DATA' })
      });
      const postJson = await postRes.json();
      return postJson.data || null;
    } catch (e) {
      console.warn('[Google Sheets Pull Warning]:', e.message);
      return null;
    }
  }
}

module.exports = {
  syncDispatchToGoogleSheets,
  deleteDispatchFromGoogleSheets,
  syncInventoryToGoogleSheets,
  syncTechniciansToGoogleSheets,
  syncClientsToGoogleSheets,
  fetchAllDataFromGoogleSheets,
  formatWorkClausesForSheet,
  GOOGLE_SHEETS_WEBHOOK_URL
};
