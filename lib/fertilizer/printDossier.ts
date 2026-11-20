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
    const isBagTask = task.id === 'p3_fert_dose3' || task.id === 'p2_fert_labour';
    const isPesticide = task.id === 'p1_fert' || task.id === 'p2_tillering';
    const qtyUnit =
      isPesticide
        ? ' L'
        : isBagTask
          ? ' bags'
          : '';
    const materialPart = isBagTask
      ? `Bags: ${entry.fertQty ?? 0} | Fert: ₹${fmt(entry.fertPrice ?? 0)}`
      : isPesticide
        ? `Pesticide: ${entry.fertQty ?? 0} L | Price: ₹${fmt(entry.fertPrice ?? 0)}`
        : `Qty: ${entry.fertQty ?? 0}${qtyUnit} × ₹${fmt(entry.fertPrice ?? 0)}`;

    if (task.isMultiDayLabour && !entry.isMachineMode) {
      const activeDays = (entry.dayEntries || []).filter(
        (d) => d.labourCount > 0 || d.labourWage > 0 || d.snackCost > 0 || d.travelCost > 0
      );
      if (activeDays.length === 0) return `${materialPart} | Labour: Not entered`;
      const daysText = activeDays
        .map((d) => {
          const extras = [
            d.snackCost > 0 ? `Snacks ₹${fmt(d.snackCost)}` : '',
            d.travelCost > 0 ? `Travel ₹${fmt(d.travelCost)}` : '',
          ].filter(Boolean);
          return `Day ${d.day}: ${d.labourCount} × ₹${fmt(d.labourWage)}${extras.length ? ` (${extras.join(', ')})` : ''} = ₹${fmt(computeDailyLabourCost(d))}`;
        })
        .join(' • ');
      return `${materialPart} | ${daysText}`;
    }

    const parts = [
      materialPart,
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

  if (task.id === 'p1_fuel') {
    let desc = `Diesel / Petrol: ₹${fmt(entry.ratePerCent ?? 0)}`;
    if (entry.hasRepairCost && (entry.repairCost ?? 0) > 0) {
      const mechInfo = [
        entry.mechanicName ? `Mechanic: ${entry.mechanicName}` : '',
        entry.mechanicNumber ? `Ph: ${entry.mechanicNumber}` : '',
        `Repair: ₹${fmt(entry.repairCost ?? 0)}`,
      ].filter(Boolean).join(', ');
      desc += ` + [${mechInfo}]`;
    }
    return desc;
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
  isTamil?: boolean;
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
  <title></title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 10mm 12mm;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h2 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #065f46;
      margin: 14px 0 6px 0;
      border-left: 3px solid #10b981;
      padding-left: 7px;
      page-break-after: avoid;
      break-after: avoid;
    }
    h2:first-of-type {
      margin-top: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
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
  </style>
</head>
<body>
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
  try {
    if (doc) doc.title = '';
  } catch {}

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

export function buildSimplePhaseSummaryHtml(params: PrintDossierParams): string {
  const {
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
    getPhaseMeta,
    isTamil = false,
  } = params;

  const phaseRowsHtml = currentPhases
    .map((phase) => {
      const pMeta = getPhaseMeta(phase);
      const pTot = phaseTotals[phase.id]?.total || 0;
      const pct = phase.isProfitPhase
        ? revenueTotal > 0
          ? isTamil ? '100.0% (வருவாய்)' : '100.0% (Revenue)'
          : isTamil ? '0.0% (வருவாய்)' : '0.0% (Revenue)'
        : grandTotal > 0
          ? `${((pTot / grandTotal) * 100).toFixed(1)}%`
          : '0.0%';
      return `
        <tr>
          <td class="phase-col"><strong>${escapeHtml(pMeta.month)}</strong></td>
          <td class="desc-col">${escapeHtml(pMeta.name)}</td>
          <td class="day-col">${escapeHtml(pMeta.daySpan)}</td>
          <td class="num pct-col">${escapeHtml(pct)}</td>
          <td class="num total-col"><strong>₹${escapeHtml(fmt(pTot))}</strong></td>
        </tr>
      `;
    })
    .join('');

  const tableTitle = isTamil ? 'கட்ட வாரியான செலவு & வருவாய் சுருக்கம்' : 'PHASE-WISE COST & REVENUE SUMMARY';
  const colPhase = isTamil ? 'கட்டம்' : 'PHASE';
  const colDesc = isTamil ? 'செயல்முறை விளக்கம்' : 'STAGE DESCRIPTION';
  const colDays = isTamil ? 'நாட்கள்' : 'DAY SPAN';
  const colShare = isTamil ? 'செலவுப் பங்கு (%)' : 'OUTLAY SHARE (%)';
  const colTotal = isTamil ? 'கட்டத்தின் மொத்தம் (₹)' : 'PHASE TOTAL (₹)';
  const totalRowLabel = isTamil ? 'மொத்த சாகுபடி செலவு (கட்டம் 1 – 4)' : 'Total Cultivation Expenses (Phases 1 – 4)';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(userDetails.name || 'Farmer')}_Phase_Cost_Summary</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 10mm 12mm;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 20px;
      background: #f8fafc;
    }
    .header-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .main-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #065f46;
      text-transform: uppercase;
    }
    .date-badge {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 3px 8px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      font-size: 11px;
    }
    .meta-item .lbl {
      color: #64748b;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      display: block;
      margin-bottom: 2px;
    }
    .meta-item .val {
      color: #0f172a;
      font-weight: 700;
      font-size: 12px;
    }
    table.cost-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    table.cost-table th {
      background-color: #f0f7ff;
      color: #1e293b;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    table.cost-table td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      font-size: 12px;
      color: #0f172a;
      vertical-align: middle;
    }
    table.cost-table td.phase-col {
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      color: #0f172a;
      width: 14%;
    }
    table.cost-table td.desc-col {
      color: #334155;
      width: 36%;
    }
    table.cost-table td.day-col {
      color: #475569;
      width: 18%;
    }
    table.cost-table td.pct-col {
      width: 16%;
    }
    table.cost-table td.total-col {
      width: 16%;
    }
    .num {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    table.cost-table tr.total-row td {
      background-color: #ecfdf5;
      color: #064e3b;
      font-weight: 800;
      font-size: 12.5px;
      border-top: 2px solid #059669;
    }
    .metrics-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .metric-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 14px;
      background: #ffffff;
    }
    .metric-card.outlay {
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
    }
    .metric-card.revenue {
      border-left: 4px solid #06b6d4;
      background: #ecfeff;
    }
    .metric-card.profit {
      border-left: 4px solid #10b981;
      background: #ecfdf5;
    }
    .metric-card .title {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .metric-card .value {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      margin: 4px 0 2px 0;
      font-variant-numeric: tabular-nums;
    }
    .metric-card .subtitle {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .footer-note {
      margin-top: 24px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header-card">
    <div class="header-title-row">
      <div class="main-title">🌱 ${tableTitle}</div>
      <div class="date-badge">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
    <div class="meta-grid">
      <div class="meta-item">
        <span class="lbl">${isTamil ? 'விவசாயி பெயர்' : 'Farmer Name'}</span>
        <span class="val">${escapeHtml(userDetails.name || 'Farmer')}</span>
      </div>
      <div class="meta-item">
        <span class="lbl">${isTamil ? 'நிலப்பரப்பு' : 'Land Area'}</span>
        <span class="val">${escapeHtml(userDetails.landSize)} ${isTamil ? 'சென்ட்' : 'Cents'}</span>
      </div>
      <div class="meta-item">
        <span class="lbl">${isTamil ? 'பயிர் முறை' : 'Crop Package'}</span>
        <span class="val" style="text-transform: capitalize;">${escapeHtml(cultivation)} (${escapeHtml(totalCropDays)} ${isTamil ? 'நாட்கள்' : 'Days'})</span>
      </div>
      <div class="meta-item">
        <span class="lbl">${isTamil ? 'இடம் / வட்டம்' : 'Zone / Location'}</span>
        <span class="val">${escapeHtml(userDetails.location || [userDetails.village, userDetails.district, userDetails.state].filter(Boolean).join(', ') || '-')}</span>
      </div>
    </div>
  </div>

  <table class="cost-table">
    <thead>
      <tr>
        <th style="width: 14%;">${colPhase}</th>
        <th style="width: 38%;">${colDesc}</th>
        <th style="width: 18%;">${colDays}</th>
        <th class="num" style="width: 15%;">${colShare}</th>
        <th class="num" style="width: 15%;">${colTotal}</th>
      </tr>
    </thead>
    <tbody>
      ${phaseRowsHtml}
      <tr class="total-row">
        <td colspan="3">${totalRowLabel}</td>
        <td class="num">100.0%</td>
        <td class="num">₹${escapeHtml(fmt(grandTotal))}</td>
      </tr>
    </tbody>
  </table>

  <div class="metrics-summary">
    <div class="metric-card outlay">
      <div class="title">${isTamil ? 'மொத்த சாகுபடி செலவு' : 'Total Cultivation Outlay (Ph 1–4)'}</div>
      <div class="value">₹${escapeHtml(fmt(grandTotal))}</div>
      <div class="subtitle">₹${escapeHtml(fmt(costPerCent))} / ${isTamil ? 'சென்ட்' : 'cent'}</div>
    </div>
    <div class="metric-card revenue">
      <div class="title">${isTamil ? 'மொத்த விளைச்சல் வருவாய்' : 'Gross Revenue Realization (Ph 5)'}</div>
      <div class="value">₹${escapeHtml(fmt(revenueTotal))}</div>
      <div class="subtitle">₹${escapeHtml(fmt(revenuePerCent))} / ${isTamil ? 'சென்ட்' : 'cent'}</div>
    </div>
    <div class="metric-card profit">
      <div class="title">${isTamil ? 'நிகர பண்ணை லாபம்' : 'Net Farm Profit &amp; ROI'}</div>
      <div class="value">₹${escapeHtml(fmt(netProfit))}</div>
      <div class="subtitle">${roiPercentage > 0 ? `+${roiPercentage}% ROI` : `${roiPercentage}% ROI`}</div>
    </div>
  </div>

  <div class="footer-note">
    Tamil Nadu Agricultural Advisory &amp; Farm Planning Platform • Generated on ${new Date().toLocaleString('en-IN')}
  </div>
</body>
</html>`;
}

export function printSimplePhaseSummaryPdf(params: PrintDossierParams): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const html = buildSimplePhaseSummaryHtml(params);
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

  const cleanName = (params.userDetails.name || 'Farmer').replace(/[^a-zA-Z0-9_-]/g, '_');
  const title = `${cleanName}_Phase_Cost_Summary`;

  doc.open();
  doc.write(html);
  doc.close();
  try {
    if (doc) doc.title = title;
  } catch {}

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

export function downloadSimplePhaseSummaryFile(params: PrintDossierParams): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const html = buildSimplePhaseSummaryHtml(params);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = (params.userDetails.name || 'Farmer').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `${cleanName}_Phase_Cost_Summary.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSimplePhaseSummaryCsv(params: PrintDossierParams): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const { currentPhases, phaseTotals, grandTotal, revenueTotal, getPhaseMeta, userDetails, isTamil } = params;
  const headerCols = isTamil
    ? ['கட்டம்', 'செயல்முறை விளக்கம்', 'நாட்கள்', 'செலவுப் பங்கு (%)', 'கட்டத்தின் மொத்தம் (ரூ.)']
    : ['PHASE', 'STAGE DESCRIPTION', 'DAY SPAN', 'OUTLAY SHARE (%)', 'PHASE TOTAL (INR)'];

  const rows = [
    headerCols,
    ...currentPhases.map((phase) => {
      const pMeta = getPhaseMeta(phase);
      const pTot = phaseTotals[phase.id]?.total || 0;
      const pct = phase.isProfitPhase
        ? revenueTotal > 0
          ? isTamil ? '100.0% (வருவாய்)' : '100.0% (Revenue)'
          : '0.0%'
        : grandTotal > 0
          ? `${((pTot / grandTotal) * 100).toFixed(1)}%`
          : '0.0%';
      return [pMeta.month, pMeta.name, pMeta.daySpan, pct, String(pTot)];
    }),
    [
      isTamil ? 'மொத்த சாகுபடி செலவு (கட்டம் 1 - 4)' : 'Total Cultivation Expenses (Phases 1 - 4)',
      '',
      '',
      '100.0%',
      String(grandTotal),
    ],
  ];

  const csvContent =
    '\uFEFF' +
    rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = (userDetails.name || 'Farmer').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `${cleanName}_Phase_Cost_Summary.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


