import { computeDailyLabourCost, formatCurrency as fmt } from './calc';
import type {
  CultivationType,
  ExpenseEntry,
  ExpenseTask,
  PhaseGroup,
  UserDetails,
} from './types';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function describeTaskInputs(task: ExpenseTask, entry: ExpenseEntry, isSkipped: boolean): string {
  if (isSkipped) return 'Skipped (₹0)';

  if (task.isFertilizerWithLabour) {
    const qtyUnit =
      task.id === 'p1_fert' || task.id === 'p2_tillering'
        ? ' L'
        : task.id === 'p3_fert_dose3'
          ? ' bags'
          : '';
    const parts = [
      `Qty: ${entry.fertQty ?? 0}${qtyUnit} × ₹${fmt(entry.fertPrice ?? 0)}`,
      `Labour: ${entry.labourCount ?? 0} × ₹${fmt(entry.labourWage ?? 0)}`,
    ];
    if ((entry.snackCost ?? 0) > 0) parts.push(`Snacks: ₹${fmt(entry.snackCost ?? 0)}`);
    if ((entry.travelCost ?? 0) > 0) parts.push(`Travel: ₹${fmt(entry.travelCost ?? 0)}`);
    return parts.join(' | ');
  }

  if (task.isMultiDayLabour && !entry.isMachineMode) {
    const activeDays = (entry.dayEntries || []).filter(
      (d) => d.labourCount > 0 || d.labourWage > 0 || d.snackCost > 0 || d.travelCost > 0
    );
    if (activeDays.length === 0) return 'Not entered';
    return activeDays
      .map((d) => {
        const extras = [
          d.snackCost > 0 ? `Snacks ₹${fmt(d.snackCost)}` : '',
          d.travelCost > 0 ? `Travel ₹${fmt(d.travelCost)}` : '',
        ].filter(Boolean);
        return `Day ${d.day}: ${d.labourCount} × ₹${fmt(d.labourWage)}${extras.length ? ` (${extras.join(', ')})` : ''} = ₹${fmt(computeDailyLabourCost(d))}`;
      })
      .join(' • ');
  }

  if (task.isLabour) {
    if (entry.isMachineMode) {
      return `Machine Cost: ₹${fmt(entry.ratePerCent)}`;
    }
    const parts = [`${entry.labourCount ?? 0} workers × ₹${fmt(entry.labourWage ?? 0)}`];
    if (task.hasSnacks && (entry.snackCost ?? 0) > 0) parts.push(`Snacks: ₹${fmt(entry.snackCost ?? 0)}`);
    if (task.hasTravel && (entry.travelCost ?? 0) > 0) parts.push(`Travel: ₹${fmt(entry.travelCost ?? 0)}`);
    return parts.join(' + ');
  }

  if (task.isGunnyBags) {
    const type = entry.isPlasticBag !== false ? 'Plastic' : 'Traditional Jute';
    return `${entry.bagCount ?? 0} ${type} bags × ₹${fmt(entry.bagPrice ?? 0)}`;
  }

  if (task.isTransportLoading) {
    const parts = [
      `Vehicle Rent: ₹${fmt(entry.transportRent ?? 0)}`,
      `Loading: ${entry.loadingWorkers ?? 0} × ₹${fmt(entry.loadingWage ?? 0)}`,
    ];
    if ((entry.loadingSnacks ?? 0) > 0) parts.push(`Snacks: ₹${fmt(entry.loadingSnacks ?? 0)}`);
    return parts.join(' + ');
  }

  if (task.isGrainYield) {
    const totalKg = entry.yieldKg ?? ((entry.yieldTons ?? 0) * 1000);
    return `${fmt(totalKg)} KG ÷ ${entry.bagWeightKg ?? 0} kg = ${entry.grainBagCount ?? 0} bags × ₹${fmt(entry.grainBagPrice ?? 0)}`;
  }

  if (task.isStrawYield) {
    return `${entry.strawSackCount ?? 0} sacks × ₹${fmt(entry.strawPrice ?? 0)}`;
  }

  if (task.isMandiTrip) {
    return `${entry.mandiCount ?? 0} trips × ₹${fmt(entry.mandiRate ?? 0)}`;
  }

  if (task.id === 'p1_nursery') {
    return `Seed: ₹${fmt(entry.ratePerCent)}${entry.hasTravelCost !== false && (entry.travelCost ?? 0) > 0 ? ` + Travel: ₹${fmt(entry.travelCost ?? 0)}` : ''}`;
  }

  return `Amount: ₹${fmt(entry.ratePerCent)}`;
}

export interface PrintDossierParams {
  activePlanId: string | null;
  userDetails: UserDetails;
  cultivation: CultivationType;
  totalCropDays: number;
  grandTotal: number;
  revenueTotal: number;
  netProfit: number;
  costPerCent: number;
  revenuePerCent: number;
  roiPercentage: number;
  currentPhases: PhaseGroup[];
  phaseTotals: Record<string, { total: number; daily: number }>;
  expenseMap: Record<string, ExpenseEntry>;
  getPhaseMeta: (phase: PhaseGroup) => { month: string; name: string; daySpan: string };
  getTaskMeta: (task: ExpenseTask) => { name: string; dayRange: string; description: string; costEstimateHint: string };
}

export function buildDossierPrintHtml(params: PrintDossierParams): string {
  const {
    activePlanId,
    userDetails,
    cultivation,
    totalCropDays,
    grandTotal,
    revenueTotal,
    netProfit,
    costPerCent,
    revenuePerCent,
    roiPercentage,
    currentPhases,
    phaseTotals,
    expenseMap,
    getPhaseMeta,
    getTaskMeta,
  } = params;

  const netProfitPerCent =
    userDetails.landSize > 0 ? Math.round(netProfit / userDetails.landSize) : 0;
  const generatedOn = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const phaseRowsHtml = currentPhases
    .map((phase) => {
      const pMeta = getPhaseMeta(phase);
      const pTot = phaseTotals[phase.id]?.total || 0;
      const pct = phase.isProfitPhase
        ? revenueTotal > 0
          ? '100.0% (Revenue)'
          : '0.0% (Revenue)'
        : grandTotal > 0
          ? `${((pTot / grandTotal) * 100).toFixed(1)}%`
          : '0.0%';
      return `
        <tr>
          <td><strong>${escapeHtml(pMeta.month)}</strong></td>
          <td>${escapeHtml(pMeta.name)}</td>
          <td>${escapeHtml(pMeta.daySpan)}</td>
          <td class="num">${escapeHtml(pct)}</td>
          <td class="num"><strong>₹${escapeHtml(fmt(pTot))}</strong></td>
        </tr>
      `;
    })
    .join('');

  const itemizedRowsHtml = currentPhases
    .flatMap((phase) => {
      const pMeta = getPhaseMeta(phase);
      return phase.tasks.map((task) => {
        const tMeta = getTaskMeta(task);
        const entry = expenseMap[task.id] || {
          ratePerCent: 0,
          days: task.defaultDays,
          totalCost: 0,
          costPerDay: 0,
        };
        const isSkipped = Boolean(task.isOptional && entry.isEnabled === false);
        const details = describeTaskInputs(task, entry, isSkipped);
        const amount = isSkipped ? 0 : entry.totalCost;
        return `
          <tr>
            <td>${escapeHtml(pMeta.month)}</td>
            <td><strong>${escapeHtml(tMeta.name)}</strong></td>
            <td>${escapeHtml(tMeta.dayRange)}</td>
            <td>${escapeHtml(details)}</td>
            <td class="num">${isSkipped ? '<span class="muted">₹0</span>' : `<strong>₹${escapeHtml(fmt(amount))}</strong>`}</td>
          </tr>
        `;
      });
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Cultivation Financial Audit - ${escapeHtml(userDetails.name || 'Farmer')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #059669;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0 0 3px 0;
      font-size: 18px;
      color: #064e3b;
      letter-spacing: -0.01em;
    }
    .header p {
      margin: 0;
      color: #475569;
      font-size: 10px;
    }
    .meta {
      text-align: right;
      font-size: 10px;
      color: #475569;
    }
    h2 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #065f46;
      margin: 14px 0 6px 0;
      border-left: 3px solid #10b981;
      padding-left: 7px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .kv-label {
      width: 22%;
      background-color: #f8fafc;
      font-weight: 600;
      color: #334155;
    }
    .kv-value {
      width: 28%;
      color: #0f172a;
    }
    .num {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .total-row td {
      background-color: #ecfdf5;
      font-weight: 700;
      color: #064e3b;
    }
    .profit-row td {
      background-color: #eff6ff;
      font-weight: 700;
      color: #0c4a6e;
    }
    .muted {
      color: #64748b;
    }
    .footer-note {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Precision Cultivation &amp; Financial Audit Dossier</h1>
      <p>Comprehensive Summary of Farmer Parameters, Phase Costs, Revenue Realization &amp; Net Profit</p>
    </div>
    <div class="meta">
      ${activePlanId ? `<div><strong>Plan ID:</strong> ${escapeHtml(activePlanId)}</div>` : ''}
      <div><strong>Generated:</strong> ${escapeHtml(generatedOn)}</div>
    </div>
  </div>

  <h2>1. Farmer &amp; Plot Details</h2>
  <table>
    <tbody>
      <tr>
        <td class="kv-label">Farmer Name</td>
        <td class="kv-value"><strong>${escapeHtml(userDetails.name || '-')}</strong></td>
        <td class="kv-label">Mobile Number</td>
        <td class="kv-value">+91 ${escapeHtml(userDetails.phone || '-')}</td>
      </tr>
      <tr>
        <td class="kv-label">Cultivation Area</td>
        <td class="kv-value"><strong>${escapeHtml(userDetails.landSize)} Cents</strong></td>
        <td class="kv-label">Crop Package</td>
        <td class="kv-value" style="text-transform: capitalize;">${escapeHtml(cultivation)} (${escapeHtml(totalCropDays)} Days)</td>
      </tr>
      <tr>
        <td class="kv-label">Zone / Location</td>
        <td class="kv-value">${escapeHtml(userDetails.location || [userDetails.village, userDetails.district, userDetails.state].filter(Boolean).join(', ') || '-')}</td>
        <td class="kv-label">Farm Address</td>
        <td class="kv-value">${escapeHtml(userDetails.address || '-')}</td>
      </tr>
    </tbody>
  </table>

  <h2>2. Financial &amp; Revenue Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th class="num">Per Cent Rate</th>
        <th class="num">Total Amount / Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total Cultivation Outlay (Phases 1 – 4)</td>
        <td class="num">₹${escapeHtml(fmt(costPerCent))} / cent</td>
        <td class="num"><strong>₹${escapeHtml(fmt(grandTotal))}</strong></td>
      </tr>
      <tr class="profit-row">
        <td>Gross Revenue Realization (Phase 5)</td>
        <td class="num">₹${escapeHtml(fmt(revenuePerCent))} / cent</td>
        <td class="num">₹${escapeHtml(fmt(revenueTotal))}</td>
      </tr>
      <tr class="total-row">
        <td>Net Farm Profit</td>
        <td class="num">₹${escapeHtml(fmt(netProfitPerCent))} / cent</td>
        <td class="num">₹${escapeHtml(fmt(netProfit))}</td>
      </tr>
      <tr>
        <td>Estimated Return on Investment (ROI)</td>
        <td class="num">—</td>
        <td class="num"><strong>${roiPercentage > 0 ? `+${roiPercentage}%` : `${roiPercentage}%`} ROI</strong></td>
      </tr>
    </tbody>
  </table>

  <h2>3. Phase-Wise Cost &amp; Revenue Percentage Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Phase</th>
        <th>Stage Description</th>
        <th>Day Span</th>
        <th class="num">Outlay Share (%)</th>
        <th class="num">Phase Total (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${phaseRowsHtml}
      <tr class="total-row">
        <td colspan="3">Total Cultivation Expenses (Phases 1 – 4)</td>
        <td class="num">100.0%</td>
        <td class="num">₹${escapeHtml(fmt(grandTotal))}</td>
      </tr>
    </tbody>
  </table>

  <h2>4. Itemized Operations &amp; Revenue Ledger</h2>
  <table>
    <thead>
      <tr>
        <th>Phase</th>
        <th>Work / Operation</th>
        <th>Schedule</th>
        <th>Entered Values &amp; Details</th>
        <th class="num">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${itemizedRowsHtml}
    </tbody>
  </table>

  <div class="footer-note">
    Generated by Precision Farm Management OS • Official Cultivation Financial Audit Record
  </div>
</body>
</html>`;
}

export function printDossierAsPdf(params: PrintDossierParams): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const html = buildDossierPrintHtml(params);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };

  win.onafterprint = cleanup;
  setTimeout(() => {
    win.focus();
    win.print();
  }, 150);
}

