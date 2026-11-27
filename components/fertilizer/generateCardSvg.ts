import type { SavedPlanRecord } from '@/lib/fertilizer/types';
import { formatCurrency as fmt } from '@/lib/fertilizer/calc';

export function generateCardSvgDataUrl(
  plan: SavedPlanRecord,
  index: number,
  totalCount: number,
  isTamil: boolean = false
): string {
  const grainTask = plan.expenseMap?.phase_5?.grain_yield || plan.expenseMap?.phase_5?.bunch_sales;
  const strawTask = plan.expenseMap?.phase_5?.straw_yield;
  const transportTask = plan.expenseMap?.phase_4?.transport;

  const yieldMode = grainTask?.yieldMode ?? 'tons';
  const yieldTons = grainTask?.yieldTons ?? 14;
  const bagWeightKg = grainTask?.bagWeightKg ?? 75;
  const grainBagCount =
    grainTask?.grainBagCount && !isNaN(grainTask.grainBagCount)
      ? grainTask.grainBagCount
      : Number(((yieldTons * 1000) / (bagWeightKg || 75)).toFixed(2));
  const grainBagPrice =
    grainTask?.grainBagPrice && grainTask.grainBagPrice > 0
      ? grainTask.grainBagPrice
      : grainTask?.pricePerBag && grainTask.pricePerBag > 0
      ? grainTask.pricePerBag
      : 1650;
  const strawSackCount = strawTask?.strawSackCount ?? (strawTask?.SackCount ?? 100);
  const strawPrice = strawTask?.strawPrice ?? (strawTask?.SackPrice ?? 150);
  const transportRent = transportTask?.transportRent ?? 1500;
  const loadingWorkers = transportTask?.loadingWorkers ?? (transportTask?.loadingLabourCount ?? 4);

  const profitPercent =
    plan.totals.revenueTotal > 0
      ? Math.round((plan.totals.netProfit / plan.totals.revenueTotal) * 100)
      : plan.totals.grandTotal > 0
      ? Math.round((plan.totals.netProfit / plan.totals.grandTotal) * 100)
      : 0;

  const farmerName = (plan.userDetails.name || 'Unnamed Farm Plot').slice(0, 26);
  const location = (
    [plan.userDetails.village, plan.userDetails.district].filter(Boolean).join(', ') ||
    plan.userDetails.address ||
    'Tamil Nadu'
  ).slice(0, 28);

  const recordNum = totalCount - index;
  const dateStr = plan.updated_at || plan.created_at || 'Recent';

  const escapeXml = (str: string) =>
    str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="420" viewBox="0 0 380 420">
  <defs>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#0a1f1c" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="outlayBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="100%" stop-color="#09090b" />
    </linearGradient>
  </defs>
  
  <!-- Outer Card Frame -->
  <rect x="2" y="2" width="376" height="416" rx="20" fill="url(#cardBg)" stroke="#10b981" stroke-width="2" stroke-opacity="0.4" />
  
  <!-- Top Badges -->
  <rect x="20" y="20" width="85" height="22" rx="6" fill="#ffffff" fill-opacity="0.1" />
  <text x="62" y="35" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#94a3b8" text-anchor="middle">RECORD #${recordNum}</text>
  
  <rect x="112" y="20" width="75" height="22" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-opacity="0.3" stroke-width="1" />
  <text x="149" y="35" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">🌾 Paddy</text>

  <rect x="194" y="20" width="85" height="22" rx="6" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-opacity="0.4" stroke-width="1" />
  <text x="236" y="35" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#6ee7b7" text-anchor="middle">✓ Completed</text>
  
  <text x="360" y="35" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#64748b" text-anchor="end">${escapeXml(dateStr)}</text>
  
  <!-- Farmer Name & Details -->
  <text x="20" y="74" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="900" fill="#ffffff" letter-spacing="-0.5">${escapeXml(farmerName)}</text>
  
  <rect x="20" y="86" width="70" height="20" rx="5" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-opacity="0.3" stroke-width="1" />
  <text x="55" y="100" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="#34d399" text-anchor="middle">${plan.userDetails.landSize} Cents</text>
  
  <text x="100" y="100" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#94a3b8">• ${escapeXml(location)}</text>
  
  <!-- Highlights Container -->
  <rect x="20" y="118" width="340" height="98" rx="14" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1" />
  <text x="32" y="140" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8">Grain Yield:</text>
  <text x="348" y="140" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#f8fafc" text-anchor="end">${yieldMode === 'tons' ? `${yieldTons} Tons (${grainBagCount} Bags)` : `${grainBagCount} Bags`}</text>
  
  <text x="32" y="162" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8">Mandi Price:</text>
  <text x="348" y="162" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="#34d399" text-anchor="end">₹${fmt(grainBagPrice)} / Bag</text>
  
  <text x="32" y="184" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8">Straw Byproduct:</text>
  <text x="348" y="184" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#cbd5e1" text-anchor="end">${strawSackCount} Sacks @ ₹${fmt(strawPrice)}</text>
  
  <text x="32" y="204" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8">Transport &amp; Mandi:</text>
  <text x="348" y="204" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#cbd5e1" text-anchor="end">₹${fmt(transportRent)} Rent • ${loadingWorkers} Workers</text>

  <!-- Financial Outlay & Revenue -->
  <rect x="20" y="226" width="165" height="52" rx="12" fill="url(#outlayBg)" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1" />
  <text x="32" y="244" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" fill="#94a3b8" letter-spacing="0.5">CULTIVATION OUTLAY</text>
  <text x="32" y="267" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="900" fill="#fbbf24">₹${fmt(plan.totals.grandTotal)}</text>

  <rect x="195" y="226" width="165" height="52" rx="12" fill="url(#outlayBg)" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1" />
  <text x="207" y="244" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" fill="#94a3b8" letter-spacing="0.5">GROSS REVENUE</text>
  <text x="207" y="267" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="900" fill="#22d3ee">₹${fmt(plan.totals.revenueTotal)}</text>

  <!-- Net Profit Box -->
  <rect x="20" y="288" width="340" height="62" rx="14" fill="#10b981" fill-opacity="0.12" stroke="#10b981" stroke-opacity="0.3" stroke-width="1" />
  <text x="34" y="310" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#6ee7b7" letter-spacing="0.5">NET FARM PROFIT</text>
  <text x="34" y="338" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" fill="#34d399">₹${fmt(plan.totals.netProfit)}</text>

  <rect x="290" y="306" width="58" height="26" rx="6" fill="#10b981" fill-opacity="0.25" stroke="#10b981" stroke-opacity="0.4" stroke-width="1" />
  <text x="319" y="323" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="900" fill="#a7f3d0" text-anchor="middle">${profitPercent}%</text>

  <!-- Bottom Action / Instruction -->
  <line x1="20" y1="365" x2="360" y2="365" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1" />
  <text x="20" y="392" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" fill="#34d399">🗑️ Throw into dustbin to delete</text>
  <text x="360" y="392" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="900" fill="#34d399" text-anchor="end">→</text>
</svg>`;

  if (typeof window !== 'undefined') {
    try {
      const b64 = window.btoa(unescape(encodeURIComponent(svg)));
      return `data:image/svg+xml;base64,${b64}`;
    } catch {
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
