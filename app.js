/* ============================================
   Shopify Partner Intelligence Dashboard
   Interactive JavaScript Module — v2.0
   Enhanced with Web Enrichment + AI Chat
   ============================================ */

// ---- Utility Functions ----
const fmt = {
  currency: (v) => {
    if (v == null || isNaN(v)) return '—';
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
    return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  },
  currencyFull: (v) => {
    if (v == null || isNaN(v)) return '—';
    return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  },
  number: (v) => {
    if (v == null || isNaN(v)) return '—';
    return v.toLocaleString('en-US');
  },
  pct: (v) => {
    if (v == null || isNaN(v)) return '—';
    return v.toFixed(1) + '%';
  },
  days: (v) => {
    if (v == null || isNaN(v)) return '—';
    return Math.round(v) + ' days';
  },
  date: (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
};

const countryNames = {
  GB: '🇬🇧 United Kingdom', US: '🇺🇸 United States', AU: '🇦🇺 Australia',
  IE: '🇮🇪 Ireland', DE: '🇩🇪 Germany', NZ: '🇳🇿 New Zealand',
  CA: '🇨🇦 Canada', NL: '🇳🇱 Netherlands', ES: '🇪🇸 Spain',
  PL: '🇵🇱 Poland', SG: '🇸🇬 Singapore'
};

// ---- Tab Navigation ----
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  const sections = document.querySelectorAll('.section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.section);
      if (target) target.classList.add('active');
    });
  });
}

// ---- KPI Cards Render ----
function renderKPIs(data) {
  const summary = data.overall_summary;
  const kpiHTML = `
    <div class="kpi-card highlight">
      <div class="kpi-label">Total Partners</div>
      <div class="kpi-value">9</div>
      <div class="kpi-detail">6 active • 3 inactive (last 2 years)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Merchants Launched</div>
      <div class="kpi-value">${summary.total_merchants}</div>
      <div class="kpi-detail">Across 6 active partners</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total L365d GMV</div>
      <div class="kpi-value">${fmt.currency(summary.total_gmv_l365d_usd)}</div>
      <div class="kpi-detail">Avg ${fmt.currency(summary.avg_gmv_per_merchant_l365d_usd)} per merchant</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Avg Time to Launch</div>
      <div class="kpi-value">${Math.round(summary.avg_days_to_launch)} days</div>
      <div class="kpi-detail">Median: ${Math.round(summary.median_days_to_launch)} days</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Plus Shop Rate</div>
      <div class="kpi-value">${fmt.pct(summary.plus_shop_pct)}</div>
      <div class="kpi-detail">Enterprise-grade adoption</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Primary Market</div>
      <div class="kpi-value">🇬🇧 UK</div>
      <div class="kpi-detail">26 of 46 merchants (57%)</div>
    </div>
  `;
  document.getElementById('kpi-grid').innerHTML = kpiHTML;
}

// ---- Partner Comparison Table ----
let currentSort = { field: 'recent_merchant_count', dir: 'desc' };
let tableData = [];

function renderPartnerTable(partners, sfPartners) {
  tableData = partners.map(p => {
    const sf = sfPartners.find(s => s.shopify_partner_id === String(p.partner_id)) || {};
    return { ...p, sf };
  });
  updateTableSort();
}

function updateTableSort() {
  const sorted = [...tableData].sort((a, b) => {
    let va = getSortValue(a, currentSort.field);
    let vb = getSortValue(b, currentSort.field);
    if (va == null) va = -Infinity;
    if (vb == null) vb = -Infinity;
    return currentSort.dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const searchTerm = (document.getElementById('table-search')?.value || '').toLowerCase();
  const repFilter = document.getElementById('filter-rep')?.value || '';
  const statusFilter = document.getElementById('filter-status')?.value || '';

  const filtered = sorted.filter(p => {
    if (searchTerm && !p.partner_name.toLowerCase().includes(searchTerm)) return false;
    if (repFilter && (p.sf?.sales_rep?.name || '') !== repFilter) return false;
    if (statusFilter === 'active' && p.recent_merchant_count === 0) return false;
    if (statusFilter === 'inactive' && p.recent_merchant_count > 0) return false;
    return true;
  });

  const tbody = document.getElementById('partner-table-body');
  tbody.innerHTML = filtered.map(p => {
    const geo = p.geographic_focus ? Object.keys(p.geographic_focus).join(', ') : '—';
    const rep = p.sf?.sales_rep?.name || '—';
    const totalGMV = p.merchants ? p.merchants.reduce((s, m) => s + (m.gmv_usd_l365d || 0), 0) : 0;
    const isActive = p.recent_merchant_count > 0;

    return `<tr>
      <td class="partner-name-cell">${p.partner_name}</td>
      <td class="${isActive ? 'status-active' : 'status-inactive'}">${isActive ? '● Active' : '○ Inactive'}</td>
      <td class="text-right">${p.recent_merchant_count}</td>
      <td class="text-right">${p.all_time_merchants}</td>
      <td class="text-right">${totalGMV > 0 ? fmt.currency(totalGMV) : '—'}</td>
      <td class="text-right">${p.average_contract_value_usd ? fmt.currency(p.average_contract_value_usd) : '—'}</td>
      <td class="text-right">${p.launch_timeline_metrics?.avg_days_to_launch != null ? Math.round(p.launch_timeline_metrics.avg_days_to_launch) : '—'}</td>
      <td>${geo}</td>
      <td>${rep}</td>
    </tr>`;
  }).join('');

  document.querySelectorAll('#partner-table th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.field === currentSort.field) {
      th.classList.add(currentSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

function getSortValue(p, field) {
  switch (field) {
    case 'partner_name': return p.partner_name.toLowerCase();
    case 'status': return p.recent_merchant_count > 0 ? 1 : 0;
    case 'recent_merchant_count': return p.recent_merchant_count;
    case 'all_time_merchants': return p.all_time_merchants;
    case 'total_gmv': return p.merchants ? p.merchants.reduce((s, m) => s + (m.gmv_usd_l365d || 0), 0) : 0;
    case 'avg_contract': return p.average_contract_value_usd || 0;
    case 'avg_launch': return p.launch_timeline_metrics?.avg_days_to_launch || 9999;
    case 'geo': return p.geographic_focus ? Object.keys(p.geographic_focus).length : 0;
    case 'rep': return (p.sf?.sales_rep?.name || 'zzz').toLowerCase();
    default: return 0;
  }
}

function initTableSort() {
  document.querySelectorAll('#partner-table th[data-field]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.field;
      if (currentSort.field === field) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.dir = 'desc';
      }
      updateTableSort();
    });
  });
}

// ---- Top Deals Leaderboard ----
function renderTopDeals(data) {
  const allMerchants = [];
  data.partners.forEach(p => {
    if (p.merchants) {
      p.merchants.forEach(m => {
        allMerchants.push({ ...m, partnerName: p.partner_name });
      });
    }
  });

  const byDeal = [...allMerchants]
    .filter(m => (m.deal_amount_usd || 0) > 0 || (m.gmv_usd_l365d || 0) > 0)
    .sort((a, b) => (b.deal_amount_usd || 0) - (a.deal_amount_usd || 0))
    .slice(0, 10);

  const container = document.getElementById('top-deals-list');
  container.innerHTML = byDeal.map((m, i) => `
    <div class="leaderboard-item">
      <div class="leaderboard-rank">${i + 1}</div>
      <div class="leaderboard-info">
        <div class="leaderboard-name">${m.shop_name || m.deal_name || m.domain}</div>
        <div class="leaderboard-partner">${m.partnerName} • ${countryNames[m.country_code] || m.country_code}${m.close_date ? ' • Closed ' + fmt.date(m.close_date) : ''}</div>
      </div>
      <div class="leaderboard-values">
        <div class="leaderboard-deal-value">${fmt.currency(m.deal_amount_usd)}</div>
        <div class="leaderboard-gmv">GMV: ${fmt.currency(m.gmv_usd_l365d)}</div>
      </div>
    </div>
  `).join('');
}

// ---- Geographic Distribution ----
function renderGeoDistribution(data) {
  const countryBreakdown = data.overall_summary.country_breakdown;
  const total = Object.values(countryBreakdown).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(countryBreakdown).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted[0]?.[1] || 1;

  const container = document.getElementById('geo-bars');
  container.innerHTML = sorted.map(([code, count]) => {
    const pct = (count / maxCount * 100).toFixed(0);
    const totalPct = (count / total * 100).toFixed(0);
    return `
      <div class="geo-bar-row">
        <div class="geo-bar-label">${code}</div>
        <div class="geo-bar-track">
          <div class="geo-bar-fill" style="width: ${pct}%">
            <span class="geo-bar-value">${totalPct}%</span>
          </div>
        </div>
        <div class="geo-bar-count">${count} merchant${count !== 1 ? 's' : ''}</div>
      </div>`;
  }).join('');

  renderGeoChart(sorted, total);
}

function renderGeoChart(sorted, total) {
  const ctx = document.getElementById('geoDonutChart')?.getContext('2d');
  if (!ctx) return;

  const colors = ['#008060', '#95bf47', '#2c6ecb', '#b98900', '#d72c0d',
    '#7c3aed', '#0891b2', '#be185d', '#ea580c', '#059669', '#8b5cf6'];

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(([code]) => countryNames[code] || code),
      datasets: [{
        data: sorted.map(([, count]) => count),
        backgroundColor: colors.slice(0, sorted.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 14, padding: 8, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = (ctx.raw / total * 100).toFixed(1);
              return `${ctx.label}: ${ctx.raw} merchants (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ---- Launch Timeline ----
function renderLaunchTimeline(data) {
  const launchData = [];
  data.partners.forEach(p => {
    if (p.merchants) {
      p.merchants.forEach(m => {
        if (m.days_to_launch != null) {
          launchData.push({
            name: m.shop_name,
            days: m.days_to_launch,
            partner: p.partner_name,
            closeDate: m.close_date,
            launchDate: m.launch_date,
            gmv: m.gmv_usd_l365d
          });
        }
      });
    }
  });

  launchData.sort((a, b) => a.days - b.days);
  const maxDays = Math.max(...launchData.map(d => d.days), 1);

  const allDays = launchData.map(d => d.days);
  const fastest = allDays.length ? Math.min(...allDays) : null;
  const slowest = allDays.length ? Math.max(...allDays) : null;
  const avg = allDays.length ? (allDays.reduce((s, d) => s + d, 0) / allDays.length) : null;
  const sortedDays = [...allDays].sort((a, b) => a - b);
  const median = allDays.length ? sortedDays[Math.floor(allDays.length / 2)] : null;

  document.getElementById('timeline-stats').innerHTML = `
    <div class="timeline-stat-card">
      <div class="ts-value">${allDays.length}</div>
      <div class="ts-label">Merchants w/ Data</div>
    </div>
    <div class="timeline-stat-card">
      <div class="ts-value">${fastest != null ? fastest + 'd' : '—'}</div>
      <div class="ts-label">Fastest Launch</div>
      <div class="ts-detail">${launchData.find(d => d.days === fastest)?.name || ''}</div>
    </div>
    <div class="timeline-stat-card">
      <div class="ts-value">${avg != null ? Math.round(avg) + 'd' : '—'}</div>
      <div class="ts-label">Average</div>
    </div>
    <div class="timeline-stat-card">
      <div class="ts-value">${median != null ? median + 'd' : '—'}</div>
      <div class="ts-label">Median</div>
    </div>
    <div class="timeline-stat-card">
      <div class="ts-value">${slowest != null ? slowest + 'd' : '—'}</div>
      <div class="ts-label">Slowest Launch</div>
      <div class="ts-detail">${launchData.find(d => d.days === slowest)?.name || ''}</div>
    </div>
  `;

  document.getElementById('launch-bars').innerHTML = launchData.map(d => {
    const pct = (d.days / maxDays * 100).toFixed(0);
    const colorClass = d.days <= 90 ? 'fast' : d.days <= 180 ? 'medium' : 'slow';
    return `
      <div class="launch-bar-row">
        <div class="launch-bar-label" title="${d.name}">${d.name}</div>
        <div class="launch-bar-track">
          <div class="launch-bar-fill ${colorClass}" style="width: ${Math.max(pct, 8)}%"></div>
        </div>
        <div class="launch-bar-days">${d.days}d</div>
        <div class="launch-bar-partner">${d.partner}</div>
      </div>`;
  }).join('');

  renderLaunchByPartnerChart(data);
}

function renderLaunchByPartnerChart(data) {
  const ctx = document.getElementById('launchByPartnerChart')?.getContext('2d');
  if (!ctx) return;

  const partnerLaunchData = data.partners
    .filter(p => p.launch_timeline_metrics?.avg_days_to_launch != null)
    .map(p => ({
      name: p.partner_name.replace('WPP_EMEA - ', ''),
      avg: p.launch_timeline_metrics.avg_days_to_launch,
      count: p.launch_timeline_metrics.merchants_with_launch_date
    }))
    .sort((a, b) => a.avg - b.avg);

  const colors = partnerLaunchData.map(p =>
    p.avg <= 120 ? '#008060' : p.avg <= 180 ? '#b98900' : '#d72c0d'
  );

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: partnerLaunchData.map(p => p.name),
      datasets: [{
        label: 'Avg Days to Launch',
        data: partnerLaunchData.map(p => Math.round(p.avg)),
        backgroundColor: colors,
        borderRadius: 4,
        barThickness: 36
      }]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: (ctx) => {
              const p = partnerLaunchData[ctx.dataIndex];
              return `Based on ${p.count} merchant${p.count > 1 ? 's' : ''} with launch data`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Days', font: { size: 11 } },
          beginAtZero: true,
          grid: { color: '#f0f0f0' }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 12, weight: '600' } }
        }
      }
    }
  });
}

// ---- Sales Rep View ----
function renderSalesRepView(data, sfPartners) {
  const reps = {};
  sfPartners.forEach(sf => {
    const repName = sf.sales_rep?.name || 'Unknown';
    if (!reps[repName]) {
      reps[repName] = {
        name: repName,
        email: sf.sales_rep?.email || '',
        role: sf.sales_rep?.role || 'Partner Solutions Engineer',
        partners: [],
        totalMerchants: 0,
        totalRecentMerchants: 0,
        totalGMV: 0
      };
    }
    const partnerData = data.partners.find(p => String(p.partner_id) === sf.shopify_partner_id);
    reps[repName].partners.push({
      name: sf.name,
      allTimeMerchants: sf.total_merchant_count_alltime,
      recentMerchants: partnerData?.recent_merchant_count || 0,
      gmv: partnerData?.merchants?.reduce((s, m) => s + (m.gmv_usd_l365d || 0), 0) || 0
    });
    reps[repName].totalMerchants += sf.total_merchant_count_alltime;
    reps[repName].totalRecentMerchants += (partnerData?.recent_merchant_count || 0);
    reps[repName].totalGMV += (partnerData?.merchants?.reduce((s, m) => s + (m.gmv_usd_l365d || 0), 0) || 0);
  });

  const container = document.getElementById('rep-cards');
  container.innerHTML = Object.values(reps).sort((a, b) => b.totalGMV - a.totalGMV).map(rep => `
    <div class="rep-card">
      <div class="rep-card-header">
        <div class="rep-name">${rep.name}</div>
        <div class="rep-role">${rep.role} • ${rep.email}</div>
      </div>
      <div class="rep-stats">
        <div class="rep-stat">
          <div class="rep-stat-value">${rep.partners.length}</div>
          <div class="rep-stat-label">Partners</div>
        </div>
        <div class="rep-stat">
          <div class="rep-stat-value">${rep.totalMerchants}</div>
          <div class="rep-stat-label">All-Time Merchants</div>
        </div>
        <div class="rep-stat">
          <div class="rep-stat-value">${fmt.currency(rep.totalGMV)}</div>
          <div class="rep-stat-label">Total GMV</div>
        </div>
      </div>
      <div class="rep-partner-list">
        ${rep.partners.sort((a, b) => b.gmv - a.gmv).map(p => `
          <div class="rep-partner-item">
            <div>
              <div class="rep-partner-name">${p.name}</div>
              <div class="rep-partner-merchants">${p.recentMerchants} recent • ${p.allTimeMerchants} all-time</div>
            </div>
            <div style="text-align: right; font-weight: 600; color: var(--shopify-green);">
              ${p.gmv > 0 ? fmt.currency(p.gmv) : '—'}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}


// ============================================
// ENHANCEMENT 1: ENRICHMENT DATA IN CARDS
// ============================================

function getPartnerTier(partnerName) {
  const tiers = {
    'FuseFabric': { tier: 1, label: 'Tier 1 — Invest Heavily', css: 'tier-1' },
    'Swanky UKI': { tier: 1, label: 'Tier 1 — Invest Heavily', css: 'tier-1' },
    'Vervaunt': { tier: 2, label: 'Tier 2 — Grow Strategically', css: 'tier-2' },
    'WPP_EMEA - Wunderman Thompson UKI': { tier: 2, label: 'Tier 2 — Grow Strategically', css: 'tier-2' },
    'CTI Digital': { tier: 3, label: 'Tier 3 — Monitor & Develop', css: 'tier-3' },
    'WPP_EMEA - VMLY&R UKI': { tier: 3, label: 'Tier 3 — Monitor & Develop', css: 'tier-3' },
    'KPS Digital Ltd': { tier: 4, label: 'Tier 4 — Reassess', css: 'tier-4' },
    'WPP_EMEA - AKQA UK': { tier: 4, label: 'Tier 4 — Reassess', css: 'tier-4' },
    'Intellias': { tier: 4, label: 'Tier 4 — Reassess', css: 'tier-4' },
  };
  return tiers[partnerName] || { tier: 0, label: 'Unclassified', css: 'tier-3' };
}

function getEnrichmentForPartner(partnerId) {
  if (typeof ENRICHMENT_DATA === 'undefined') return null;
  return ENRICHMENT_DATA.partners?.find(p => p.partner_id === partnerId) || null;
}

function buildEnrichmentHTML(enrichmentPartner) {
  if (!enrichmentPartner || !enrichmentPartner.web_enrichment) return '';
  const e = enrichmentPartner.web_enrichment;
  
  // Status note
  let statusNoteHTML = '';
  if (enrichmentPartner.recent_merchant_count === 0 && enrichmentPartner.partner_name !== 'KPS Digital Ltd') {
    statusNoteHTML = `<div class="enrichment-status-note danger">🔴 No recent Shopify merchant activity — ${e.competitive_positioning?.split('.').slice(-1)[0]?.trim() || 'not a Shopify-focused partner'}</div>`;
  } else if (enrichmentPartner.recent_merchant_count <= 1 && enrichmentPartner.partner_name !== 'FuseFabric') {
    if (enrichmentPartner.partner_name === 'KPS Digital Ltd') {
      statusNoteHTML = `<div class="enrichment-status-note warning">⚠️ 0 recent Shopify merchants — SAP-focused enterprise consultancy</div>`;
    } else if (enrichmentPartner.partner_name === 'WPP_EMEA - VMLY&R UKI') {
      statusNoteHTML = `<div class="enrichment-status-note warning">⚠️ Only 1 recent merchant — underperforming relative to scale (30,000+ employees)</div>`;
    }
  }

  const servicesHTML = (e.key_services || []).slice(0, 8).map(s => `<li>${s}</li>`).join('');
  const verticalsHTML = (e.industry_verticals || []).slice(0, 8).map(v => `<li>${v}</li>`).join('');
  const awardsHTML = (e.awards_certifications || []).map(a => `<span class="award-badge">🏆 ${a}</span>`).join('');
  const casesHTML = (e.case_studies || []).slice(0, 3).map(c => `<li>${c}</li>`).join('');

  return `
    <div class="enrichment-section">
      <div class="enrichment-header">
        <span style="font-size:1.2rem;">🔍</span>
        <h4>Web Research Intelligence</h4>
      </div>

      ${e.tagline ? `<div class="enrichment-tagline">"${e.tagline}"</div>` : ''}
      ${statusNoteHTML}
      ${e.usp_value_proposition ? `<div class="enrichment-usp"><strong>Value Proposition:</strong> ${e.usp_value_proposition}</div>` : ''}

      <div class="enrichment-meta">
        ${e.founded_year ? `<span class="enrichment-meta-item">📅 <strong>Founded:</strong> ${e.founded_year}</span>` : ''}
        ${e.company_size ? `<span class="enrichment-meta-item">👥 <strong>Size:</strong> ${e.company_size}</span>` : ''}
        ${e.headquarters ? `<span class="enrichment-meta-item">📍 <strong>HQ:</strong> ${e.headquarters}</span>` : ''}
        ${enrichmentPartner.website ? `<span class="enrichment-meta-item">🌐 <strong>Web:</strong> ${enrichmentPartner.website}</span>` : ''}
      </div>

      ${awardsHTML ? `<div class="enrichment-awards">${awardsHTML}</div>` : ''}

      <div class="enrichment-grid">
        ${servicesHTML ? `<div class="enrichment-box"><h5>Key Services</h5><ul>${servicesHTML}</ul></div>` : ''}
        ${verticalsHTML ? `<div class="enrichment-box"><h5>Industry Verticals</h5><ul>${verticalsHTML}</ul></div>` : ''}
      </div>

      ${casesHTML ? `<div class="enrichment-box" style="margin-bottom:12px;"><h5>Case Studies</h5><ul>${casesHTML}</ul></div>` : ''}

      ${e.competitive_positioning ? `<div class="enrichment-positioning"><strong>Strategic Positioning:</strong> ${e.competitive_positioning}</div>` : ''}
    </div>`;
}


// ---- Partner Detail Cards (Enhanced with Enrichment) ----
function renderPartnerCards(data, sfPartners) {
  const container = document.getElementById('partner-cards');

  container.innerHTML = data.partners.map(p => {
    const sf = sfPartners.find(s => s.shopify_partner_id === String(p.partner_id)) || {};
    const isActive = p.recent_merchant_count > 0;
    const totalGMV = p.merchants?.reduce((s, m) => s + (m.gmv_usd_l365d || 0), 0) || 0;
    const geo = p.geographic_focus ? Object.keys(p.geographic_focus).join(', ') : '—';
    const avgLaunch = p.launch_timeline_metrics?.avg_days_to_launch;
    const displayName = p.partner_name.replace('WPP_EMEA - ', '');
    const tier = getPartnerTier(p.partner_name);
    const enrichment = getEnrichmentForPartner(p.partner_id);

    // Top deals
    const dealsHTML = (p.top_3_deals_by_gmv || []).map(d => `
      <li class="deal-item">
        <div class="deal-name">${d.shop_name}</div>
        <div class="deal-meta">
          <span class="deal-gmv">GMV: ${fmt.currency(d.gmv_usd_l365d)}</span>
          ${d.deal_amount_usd ? ` • Deal: ${fmt.currency(d.deal_amount_usd)}` : ''}
          ${d.close_date ? ` • Closed: ${fmt.date(d.close_date)}` : ''}
          ${d.country_code ? ` • ${d.country_code}` : ''}
        </div>
      </li>
    `).join('');

    // Contacts
    const primary = sf.primary_contact;
    const additional = sf.additional_contacts || [];
    const contactsHTML = [
      ...(primary ? [primary] : []),
      ...additional
    ].map(c => `
      <div class="contact-item">
        <div class="contact-name">${c.name}</div>
        ${c.title ? `<div class="contact-title">${c.title}</div>` : ''}
        <div class="contact-email">${c.email}</div>
      </div>
    `).join('');

    // All merchants table
    const merchantsHTML = (p.merchants || [])
      .sort((a, b) => (b.gmv_usd_l365d || 0) - (a.gmv_usd_l365d || 0))
      .map(m => `
        <tr>
          <td>${m.shop_name}</td>
          <td>${m.country_code || '—'}</td>
          <td>${m.is_plus_shop ? '✓ Plus' : 'Standard'}</td>
          <td class="text-right">${m.gmv_usd_l365d != null ? fmt.currency(m.gmv_usd_l365d) : '—'}</td>
          <td class="text-right">${m.deal_amount_usd ? fmt.currency(m.deal_amount_usd) : '—'}</td>
          <td>${m.close_date ? fmt.date(m.close_date) : '—'}</td>
          <td>${m.launch_date ? fmt.date(m.launch_date) : '—'}</td>
          <td class="text-right">${m.days_to_launch != null ? m.days_to_launch + 'd' : '—'}</td>
        </tr>
      `).join('');

    // Enrichment section
    const enrichmentHTML = buildEnrichmentHTML(enrichment);

    return `
    <div class="partner-card" data-partner="${p.partner_id}">
      <div class="partner-card-header">
        <div>
          <div class="partner-card-title">${displayName}</div>
          ${sf.website ? `<div style="font-size:0.75rem;color:var(--shopify-gray-500);margin-top:2px;">${sf.website}</div>` : ''}
        </div>
        <div class="partner-card-badges">
          <span class="badge ${isActive ? 'badge-green' : 'badge-gray'}">${isActive ? 'Active' : 'Inactive'}</span>
          <span class="tier-badge ${tier.css}">${tier.label}</span>
        </div>
      </div>

      <div class="partner-card-metrics">
        <div class="metric-cell">
          <div class="metric-label">Recent Merchants</div>
          <div class="metric-value">${p.recent_merchant_count}</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">All-Time Merchants</div>
          <div class="metric-value">${p.all_time_merchants}</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">L365d GMV</div>
          <div class="metric-value ${totalGMV === 0 ? 'muted' : ''}">${totalGMV > 0 ? fmt.currency(totalGMV) : '—'}</div>
        </div>
        <div class="metric-cell">
          <div class="metric-label">Avg Time to Launch</div>
          <div class="metric-value ${avgLaunch == null ? 'muted' : ''}">${avgLaunch != null ? Math.round(avgLaunch) + 'd' : '—'}</div>
        </div>
      </div>

      ${dealsHTML ? `
      <div class="partner-card-body">
        <h4 style="font-size:0.82rem;font-weight:700;margin-bottom:10px;color:var(--shopify-dark);">Top Deals by GMV</h4>
        <ul class="deal-list">${dealsHTML}</ul>
      </div>` : ''}

      <div class="partner-card-footer">
        <div class="rep-info">
          <strong>PSM:</strong> ${sf.sales_rep?.name || '—'}
          ${sf.account_owner?.name ? ` • <strong>AO:</strong> ${sf.account_owner.name}` : ''}
        </div>
        <button class="expand-btn" onclick="toggleExpand(${p.partner_id})">
          View Details ▾
        </button>
      </div>

      <div class="partner-expanded" id="expanded-${p.partner_id}">
        ${sf.partner_since ? `<div style="font-size:0.78rem;color:var(--shopify-gray-500);margin-top:8px;">Partner since ${fmt.date(sf.partner_since)} • Geo: ${geo}</div>` : ''}

        ${enrichmentHTML}

        ${contactsHTML ? `<h4>Contacts</h4><div class="contact-grid">${contactsHTML}</div>` : ''}

        ${merchantsHTML ? `
        <h4>All Merchants (${p.recent_merchant_count})</h4>
        <div style="overflow-x:auto;">
          <table class="merchant-mini-table">
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Country</th>
                <th>Plan</th>
                <th class="text-right">L365d GMV</th>
                <th class="text-right">Deal Value</th>
                <th>Closed</th>
                <th>Launched</th>
                <th class="text-right">Days</th>
              </tr>
            </thead>
            <tbody>${merchantsHTML}</tbody>
          </table>
        </div>` : '<p style="font-size:0.82rem;color:var(--shopify-gray-500);padding:16px 0;">No merchant activity in the last 2 years.</p>'}
      </div>
    </div>`;
  }).join('');
}

function toggleExpand(partnerId) {
  const el = document.getElementById('expanded-' + partnerId);
  if (el) el.classList.toggle('show');
  const btn = el?.closest('.partner-card')?.querySelector('.expand-btn');
  if (btn) {
    btn.textContent = el.classList.contains('show') ? 'Hide Details ▴' : 'View Details ▾';
  }
}

// ---- Overview Charts ----
function renderOverviewCharts(data) {
  const activePartners = data.partners
    .filter(p => p.recent_merchant_count > 0)
    .sort((a, b) => b.recent_merchant_count - a.recent_merchant_count);

  const ctx1 = document.getElementById('merchantsByPartnerChart')?.getContext('2d');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: activePartners.map(p => p.partner_name.replace('WPP_EMEA - ', '')),
        datasets: [{
          label: 'Merchants (Last 2 Years)',
          data: activePartners.map(p => p.recent_merchant_count),
          backgroundColor: '#008060',
          borderRadius: 4,
          barThickness: 36
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 5 }, grid: { color: '#f0f0f0' } },
          x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' } } }
        }
      }
    });
  }

  const gmvPartners = activePartners
    .map(p => ({
      name: p.partner_name.replace('WPP_EMEA - ', ''),
      gmv: p.merchants?.reduce((s, m) => s + (m.gmv_usd_l365d || 0), 0) || 0
    }))
    .filter(p => p.gmv > 0)
    .sort((a, b) => b.gmv - a.gmv);

  const ctx2 = document.getElementById('gmvByPartnerChart')?.getContext('2d');
  if (ctx2) {
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: gmvPartners.map(p => p.name),
        datasets: [{
          label: 'L365d GMV (USD)',
          data: gmvPartners.map(p => p.gmv),
          backgroundColor: '#95bf47',
          borderRadius: 4,
          barThickness: 36
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => 'GMV: ' + fmt.currency(ctx.raw)
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { callback: (v) => fmt.currency(v) },
            grid: { color: '#f0f0f0' }
          },
          y: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' } } }
        }
      }
    });
  }
}

// ---- CSV Export ----
function exportTableCSV() {
  const headers = ['Partner', 'Status', 'Recent Merchants', 'All-Time Merchants', 'L365d GMV', 'Avg Contract Value', 'Avg Days to Launch', 'Geographic Focus', 'Sales Rep'];
  const rows = tableData.map(p => {
    const totalGMV = p.merchants ? p.merchants.reduce((s, m) => s + (m.gmv_usd_l365d || 0), 0) : 0;
    return [
      p.partner_name,
      p.recent_merchant_count > 0 ? 'Active' : 'Inactive',
      p.recent_merchant_count,
      p.all_time_merchants,
      totalGMV || '',
      p.average_contract_value_usd || '',
      p.launch_timeline_metrics?.avg_days_to_launch || '',
      p.geographic_focus ? Object.keys(p.geographic_focus).join('; ') : '',
      p.sf?.sales_rep?.name || ''
    ];
  });

  const csv = [headers, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'partner_intelligence_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}


// ============================================
// ENHANCEMENT 2: AI CHAT ENGINE
// ============================================

function askSuggestion(el) {
  const q = el.textContent.trim();
  document.getElementById('ai-chat-input').value = q;
  sendAIMessage();
}

function sendAIMessage() {
  const input = document.getElementById('ai-chat-input');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';

  // Add user bubble
  addChatMessage('user', q);

  // Show typing indicator
  const typingId = showTyping();

  // Process after small delay for UX
  setTimeout(() => {
    removeTyping(typingId);
    const response = processAIQuery(q);
    addChatMessage('system', response);
  }, 400 + Math.random() * 400);
}

function addChatMessage(role, html) {
  const container = document.getElementById('ai-chat-messages');
  const avatar = role === 'user' ? '👤' : '🤖';
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${role}`;
  msgDiv.innerHTML = `
    <div class="chat-avatar">${avatar}</div>
    <div class="chat-bubble">${role === 'user' ? `<p>${escapeHtml(html)}</p>` : html}</div>
  `;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const container = document.getElementById('ai-chat-messages');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'chat-msg system';
  div.innerHTML = `<div class="chat-avatar">🤖</div><div class="chat-bubble"><div class="chat-typing"><span></span><span></span><span></span></div></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ---- AI Query Processing Engine ----
function processAIQuery(query) {
  const q = query.toLowerCase().trim();
  const data = typeof MERCHANT_DATA !== 'undefined' ? MERCHANT_DATA : null;
  const enrichment = typeof ENRICHMENT_DATA !== 'undefined' ? ENRICHMENT_DATA : null;

  if (!data) return '<p>Data not loaded. Please refresh the page.</p>';

  // 1. Fastest launch
  if (q.includes('fastest') && (q.includes('launch') || q.includes('time'))) {
    return handleFastestLaunch(data);
  }

  // 2. Compare X vs Y
  if (q.includes('compare') || q.includes(' vs ') || q.includes('versus')) {
    return handleComparison(q, data, enrichment);
  }

  // 3. Tier / Recommendations
  if (q.includes('recommend') || q.includes('tier') || q.includes('invest') || q.includes('should we')) {
    return handleTierRecommendations(enrichment);
  }

  // 4. Inactive partners
  if (q.includes('inactive') || q.includes('no activity') || q.includes('zero merchant') || q.includes('not active')) {
    return handleInactivePartners(data, enrichment);
  }

  // 5. Top deals / biggest deals
  if (q.includes('top deal') || q.includes('biggest deal') || q.includes('largest deal') || q.includes('deal value') || q.includes('contract value')) {
    return handleTopDeals(data);
  }

  // 6. Enterprise / best for enterprise
  if (q.includes('enterprise') && (q.includes('best') || q.includes('partner') || q.includes('retailer'))) {
    return handleEnterprisePartner(data, enrichment);
  }

  // 7. Tell me about [partner] / partner name queries
  const partnerMatch = findPartnerInQuery(q, data, enrichment);
  if (partnerMatch) {
    return handlePartnerProfile(partnerMatch.name, data, enrichment);
  }

  // 8. Fashion / vertical queries
  if (q.includes('fashion') || q.includes('beauty') || q.includes('food') || q.includes('health') || q.includes('luxury') || q.includes('retail') || q.includes('automotive') || q.includes('nutrition')) {
    return handleVerticalQuery(q, enrichment);
  }

  // 9. GMV query
  if (q.includes('gmv') || q.includes('revenue') || q.includes('gross merchandise')) {
    return handleGMVQuery(data);
  }

  // 10. Geographic query
  if (q.includes('geograph') || q.includes('country') || q.includes('location') || q.includes('uk ') || q.includes('international')) {
    return handleGeoQuery(data);
  }

  // 11. WPP query
  if (q.includes('wpp') || q.includes('vml') || q.includes('wunderman') || q.includes('akqa')) {
    return handleWPPQuery(data, enrichment);
  }

  // 12. Summary / overview
  if (q.includes('summary') || q.includes('overview') || q.includes('overall') || q.includes('how many')) {
    return handleSummary(data);
  }

  // Fallback
  return `<p>I wasn't able to find a specific answer for that question. Here are some things I can help with:</p>
    <ul>
      <li><strong>Partner profiles</strong> — "Tell me about FuseFabric" or "Tell me about Swanky"</li>
      <li><strong>Comparisons</strong> — "Compare FuseFabric vs Swanky UKI"</li>
      <li><strong>Launch speed</strong> — "Which partner has the fastest time to launch?"</li>
      <li><strong>Top deals</strong> — "Show biggest deals by contract value"</li>
      <li><strong>Inactive partners</strong> — "Show me inactive partners"</li>
      <li><strong>Tier recommendations</strong> — "What are the tier recommendations?"</li>
      <li><strong>Industry matches</strong> — "Which partners work with fashion brands?"</li>
    </ul>
    <p>For deeper analysis, contact <strong>Shiv Patel</strong> (shiv.patel@shopify.com) or your Partner Intelligence Coordinator.</p>`;
}

function findPartnerInQuery(q, data, enrichment) {
  const names = [
    { key: 'fusefabric', name: 'FuseFabric' },
    { key: 'swanky', name: 'Swanky UKI' },
    { key: 'vervaunt', name: 'Vervaunt' },
    { key: 'cti digital', name: 'CTI Digital' },
    { key: 'cti', name: 'CTI Digital' },
    { key: 'kps', name: 'KPS Digital Ltd' },
    { key: 'vmly', name: 'WPP_EMEA - VMLY&R UKI' },
    { key: 'vml', name: 'WPP_EMEA - VMLY&R UKI' },
    { key: 'wunderman', name: 'WPP_EMEA - Wunderman Thompson UKI' },
    { key: 'akqa', name: 'WPP_EMEA - AKQA UK' },
    { key: 'intellias', name: 'Intellias' },
  ];
  
  // Match "tell me about", "about", or just partner name
  for (const n of names) {
    if (q.includes(n.key)) return n;
  }
  return null;
}

function handleFastestLaunch(data) {
  const partners = data.partners
    .filter(p => p.launch_timeline_metrics?.avg_days_to_launch != null)
    .sort((a, b) => a.launch_timeline_metrics.avg_days_to_launch - b.launch_timeline_metrics.avg_days_to_launch);

  let table = `<table class="chat-table">
    <tr><th>Partner</th><th>Avg Days</th><th>Median</th><th>Merchants w/ Data</th></tr>`;
  partners.forEach(p => {
    const lt = p.launch_timeline_metrics;
    table += `<tr>
      <td><strong>${p.partner_name.replace('WPP_EMEA - ','')}</strong></td>
      <td>${Math.round(lt.avg_days_to_launch)} days</td>
      <td>${lt.median_days_to_launch ? Math.round(lt.median_days_to_launch) + ' days' : '—'}</td>
      <td>${lt.merchants_with_launch_date}</td>
    </tr>`;
  });
  table += '</table>';

  // Individual fastest merchant
  const allLaunches = [];
  data.partners.forEach(p => {
    (p.merchants || []).forEach(m => {
      if (m.days_to_launch != null) {
        allLaunches.push({ name: m.shop_name, days: m.days_to_launch, partner: p.partner_name.replace('WPP_EMEA - ','') });
      }
    });
  });
  allLaunches.sort((a,b) => a.days - b.days);

  return `<p>🏆 <strong>FuseFabric</strong> has the fastest average time to launch at <span class="chat-highlight">121 days</span>, despite handling the largest enterprise deals!</p>
    ${table}
    <p style="margin-top:10px;"><strong>Top 5 fastest individual merchants:</strong></p>
    <ol>${allLaunches.slice(0,5).map(m => `<li><strong>${m.name}</strong> — ${m.days} days (${m.partner})</li>`).join('')}</ol>
    <p style="margin-top:8px;font-size:0.82rem;color:#6d7175;">Note: FuseFabric launched Escentual ($46.9M deal) in just 33 days — a remarkable achievement for enterprise scale.</p>`;
}

function handleComparison(q, data, enrichment) {
  // Extract two partner names
  const names = [
    { key: 'fusefabric', name: 'FuseFabric' },
    { key: 'swanky', name: 'Swanky UKI' },
    { key: 'vervaunt', name: 'Vervaunt' },
    { key: 'cti', name: 'CTI Digital' },
    { key: 'kps', name: 'KPS Digital Ltd' },
    { key: 'wunderman', name: 'WPP_EMEA - Wunderman Thompson UKI' },
    { key: 'vmly', name: 'WPP_EMEA - VMLY&R UKI' },
    { key: 'akqa', name: 'WPP_EMEA - AKQA UK' },
    { key: 'intellias', name: 'Intellias' },
  ];

  const matched = names.filter(n => q.includes(n.key));
  if (matched.length < 2) {
    return '<p>Please specify two partners to compare, e.g., "Compare FuseFabric vs Swanky UKI"</p>';
  }

  const [p1Data, p2Data] = matched.slice(0, 2).map(m => data.partners.find(p => p.partner_name === m.name));
  if (!p1Data || !p2Data) return '<p>Could not find both partners in the dataset.</p>';

  const p1Name = p1Data.partner_name.replace('WPP_EMEA - ', '');
  const p2Name = p2Data.partner_name.replace('WPP_EMEA - ', '');
  const p1GMV = p1Data.merchants?.reduce((s,m) => s + (m.gmv_usd_l365d||0), 0) || 0;
  const p2GMV = p2Data.merchants?.reduce((s,m) => s + (m.gmv_usd_l365d||0), 0) || 0;
  const p1Tier = getPartnerTier(p1Data.partner_name);
  const p2Tier = getPartnerTier(p2Data.partner_name);

  return `<p>📊 <strong>Head-to-Head Comparison</strong></p>
    <table class="chat-table">
      <tr><th>Metric</th><th>${p1Name}</th><th>${p2Name}</th></tr>
      <tr><td>Strategic Tier</td><td><span class="chat-tier-${p1Tier.tier}">${p1Tier.label}</span></td><td><span class="chat-tier-${p2Tier.tier}">${p2Tier.label}</span></td></tr>
      <tr><td>Recent Merchants</td><td>${p1Data.recent_merchant_count}</td><td>${p2Data.recent_merchant_count}</td></tr>
      <tr><td>All-Time Merchants</td><td>${p1Data.all_time_merchants}</td><td>${p2Data.all_time_merchants}</td></tr>
      <tr><td>L365d GMV</td><td>${fmt.currency(p1GMV)}</td><td>${fmt.currency(p2GMV)}</td></tr>
      <tr><td>Avg Contract Value</td><td>${p1Data.average_contract_value_usd ? fmt.currency(p1Data.average_contract_value_usd) : '—'}</td><td>${p2Data.average_contract_value_usd ? fmt.currency(p2Data.average_contract_value_usd) : '—'}</td></tr>
      <tr><td>Avg Time to Launch</td><td>${p1Data.launch_timeline_metrics?.avg_days_to_launch ? Math.round(p1Data.launch_timeline_metrics.avg_days_to_launch) + 'd' : '—'}</td><td>${p2Data.launch_timeline_metrics?.avg_days_to_launch ? Math.round(p2Data.launch_timeline_metrics.avg_days_to_launch) + 'd' : '—'}</td></tr>
      <tr><td>Geographic Reach</td><td>${p1Data.geographic_focus ? Object.keys(p1Data.geographic_focus).length + ' countries' : '—'}</td><td>${p2Data.geographic_focus ? Object.keys(p2Data.geographic_focus).length + ' countries' : '—'}</td></tr>
    </table>`;
}

function handleTierRecommendations(enrichment) {
  if (!enrichment?.strategic_recommendations) return '<p>Strategic recommendation data not available.</p>';
  const rec = enrichment.strategic_recommendations;

  let html = '<p>📋 <strong>Strategic Tier Recommendations</strong></p>';

  html += '<p style="margin-top:10px;"><span class="chat-tier-1">🟢 TIER 1 — Invest Heavily</span></p><ul>';
  rec.tier_1_invest_heavily.forEach(t => {
    html += `<li><strong>${t.partner}</strong>: ${t.rationale}<br><em>Action: ${t.action}</em></li>`;
  });
  html += '</ul>';

  html += '<p><span class="chat-tier-2">🔵 TIER 2 — Grow Strategically</span></p><ul>';
  rec.tier_2_grow_strategically.forEach(t => {
    html += `<li><strong>${t.partner.replace('WPP_EMEA - ','')}</strong>: ${t.rationale}<br><em>Action: ${t.action}</em></li>`;
  });
  html += '</ul>';

  html += '<p><span class="chat-tier-3">🟡 TIER 3 — Monitor & Develop</span></p><ul>';
  rec.tier_3_monitor_and_develop.forEach(t => {
    html += `<li><strong>${t.partner.replace('WPP_EMEA - ','')}</strong>: ${t.rationale}<br><em>Action: ${t.action}</em></li>`;
  });
  html += '</ul>';

  html += '<p><span class="chat-tier-4">🔴 TIER 4 — Reassess</span></p><ul>';
  rec.tier_4_reassess.forEach(t => {
    html += `<li><strong>${t.partner.replace('WPP_EMEA - ','')}</strong>: ${t.rationale}<br><em>Action: ${t.action}</em></li>`;
  });
  html += '</ul>';

  return html;
}

function handleInactivePartners(data, enrichment) {
  const inactive = data.partners.filter(p => p.recent_merchant_count === 0);
  let html = `<p>🔴 <strong>${inactive.length} inactive partners</strong> (zero merchants in 2024–2026):</p>`;
  html += '<table class="chat-table"><tr><th>Partner</th><th>All-Time Merchants</th><th>Reason</th><th>Recommendation</th></tr>';

  inactive.forEach(p => {
    const en = enrichment?.partners?.find(e => e.partner_id === p.partner_id);
    let reason = 'Unknown';
    let recommendation = 'Review';
    if (p.partner_name.includes('AKQA')) {
      reason = 'Creative/innovation agency — not a commerce implementation partner';
      recommendation = 'Deprioritize unless dedicated commerce practice built';
    } else if (p.partner_name.includes('KPS')) {
      reason = 'SAP Gold Partner — Shopify is secondary focus';
      recommendation = 'Strategic conversation about Shopify commitment';
    } else if (p.partner_name.includes('Intellias')) {
      reason = 'Software engineering services — automotive/fintech focus';
      recommendation = 'Low priority — monitor only';
    }
    html += `<tr><td><strong>${p.partner_name.replace('WPP_EMEA - ','')}</strong></td><td>${p.all_time_merchants}</td><td>${reason}</td><td>${recommendation}</td></tr>`;
  });
  html += '</table>';
  html += '<p style="margin-top:8px;">All three inactive partners are classified as <span class="chat-tier-4">Tier 4 — Reassess</span>.</p>';
  return html;
}

function handleTopDeals(data) {
  const allMerchants = [];
  data.partners.forEach(p => {
    (p.merchants || []).forEach(m => {
      if (m.deal_amount_usd && m.deal_amount_usd > 0) {
        allMerchants.push({ ...m, partnerName: p.partner_name.replace('WPP_EMEA - ','') });
      }
    });
  });
  allMerchants.sort((a, b) => (b.deal_amount_usd || 0) - (a.deal_amount_usd || 0));
  const top = allMerchants.slice(0, 8);

  let html = '<p>🏆 <strong>Top Deals by Contract Value</strong></p>';
  html += '<table class="chat-table"><tr><th>#</th><th>Merchant</th><th>Partner</th><th>Deal Value</th><th>GMV L365d</th><th>Launch Days</th></tr>';
  top.forEach((m, i) => {
    html += `<tr>
      <td>${i+1}</td>
      <td><strong>${m.shop_name}</strong></td>
      <td>${m.partnerName}</td>
      <td>${fmt.currency(m.deal_amount_usd)}</td>
      <td>${m.gmv_usd_l365d ? fmt.currency(m.gmv_usd_l365d) : '—'}</td>
      <td>${m.days_to_launch != null ? m.days_to_launch + 'd' : '—'}</td>
    </tr>`;
  });
  html += '</table>';
  html += `<p style="margin-top:8px;">The largest deal is <strong>JD Sports / Size?</strong> at <span class="chat-highlight">$69.5M</span>, handled by FuseFabric. The top 3 deals are all FuseFabric or Wunderman Thompson.</p>`;
  return html;
}

function handleEnterprisePartner(data, enrichment) {
  return `<p>🏢 <strong>Best Partners for Enterprise Retailers</strong></p>
    <p>Based on deal sizes, launch capability, and enterprise credentials:</p>
    <table class="chat-table">
      <tr><th>Rank</th><th>Partner</th><th>Avg Deal Value</th><th>Key Enterprise Clients</th><th>Avg Launch Time</th></tr>
      <tr><td>🥇</td><td><strong>FuseFabric</strong></td><td>${fmt.currency(31031221.78)}</td><td>JD Sports, Fenwick, Escentual, Boden, Pepco</td><td>121 days</td></tr>
      <tr><td>🥈</td><td><strong>Wunderman Thompson</strong></td><td>${fmt.currency(33305270.83)}</td><td>Glanbia Body&amp;Fit, Optimum Nutrition</td><td>167 days</td></tr>
      <tr><td>🥉</td><td><strong>Swanky UKI</strong></td><td>${fmt.currency(3218013.3)}</td><td>Computer Lounge, Cakesmiths, WeightWorld</td><td>216 days</td></tr>
    </table>
    <p style="margin-top:8px;"><strong>Top recommendation:</strong> <span class="chat-highlight">FuseFabric</span> — Shopify Platinum Partner, founded by two former global CTOs, Deloitte Digital alliance, UK eCommerce Agency of the Year. Fastest launches despite handling the largest deals. Ideal for complex enterprise migrations with ERP/OMS/PIM integrations.</p>`;
}

function handlePartnerProfile(partnerName, data, enrichment) {
  const p = data.partners.find(d => d.partner_name === partnerName);
  if (!p) return `<p>Could not find partner "${partnerName}" in the data.</p>`;

  const en = enrichment?.partners?.find(e => e.partner_id === p.partner_id);
  const tier = getPartnerTier(partnerName);
  const displayName = partnerName.replace('WPP_EMEA - ', '');
  const totalGMV = p.merchants?.reduce((s,m) => s + (m.gmv_usd_l365d||0), 0) || 0;
  const we = en?.web_enrichment;

  let html = `<p>📋 <strong>${displayName}</strong> <span class="tier-badge ${tier.css}" style="font-size:0.7rem;vertical-align:middle;">${tier.label}</span></p>`;

  if (we?.tagline) html += `<p><em>"${we.tagline}"</em></p>`;

  html += `<table class="chat-table">
    <tr><td><strong>Recent Merchants</strong></td><td>${p.recent_merchant_count}</td></tr>
    <tr><td><strong>All-Time Merchants</strong></td><td>${p.all_time_merchants}</td></tr>
    <tr><td><strong>L365d GMV</strong></td><td>${totalGMV > 0 ? fmt.currency(totalGMV) : '—'}</td></tr>
    <tr><td><strong>Avg Contract Value</strong></td><td>${p.average_contract_value_usd ? fmt.currency(p.average_contract_value_usd) : '—'}</td></tr>
    <tr><td><strong>Avg Time to Launch</strong></td><td>${p.launch_timeline_metrics?.avg_days_to_launch ? Math.round(p.launch_timeline_metrics.avg_days_to_launch) + ' days' : '—'}</td></tr>
    ${we?.founded_year ? `<tr><td><strong>Founded</strong></td><td>${we.founded_year}</td></tr>` : ''}
    ${we?.company_size ? `<tr><td><strong>Size</strong></td><td>${we.company_size}</td></tr>` : ''}
    ${we?.headquarters ? `<tr><td><strong>HQ</strong></td><td>${we.headquarters}</td></tr>` : ''}
  </table>`;

  if (we?.usp_value_proposition) {
    html += `<p style="margin-top:8px;"><strong>USP:</strong> ${we.usp_value_proposition}</p>`;
  }

  if (we?.key_services?.length) {
    html += `<p style="margin-top:8px;"><strong>Key Services:</strong> ${we.key_services.slice(0, 6).join(', ')}</p>`;
  }

  if (we?.industry_verticals?.length) {
    html += `<p><strong>Industry Verticals:</strong> ${we.industry_verticals.slice(0, 6).join(', ')}</p>`;
  }

  if (p.top_3_deals_by_gmv?.length) {
    html += '<p style="margin-top:8px;"><strong>Top Deals:</strong></p><ul>';
    p.top_3_deals_by_gmv.forEach(d => {
      html += `<li><strong>${d.shop_name}</strong> — GMV: ${fmt.currency(d.gmv_usd_l365d)}${d.deal_amount_usd ? ', Deal: ' + fmt.currency(d.deal_amount_usd) : ''}</li>`;
    });
    html += '</ul>';
  }

  if (we?.competitive_positioning) {
    html += `<p style="margin-top:8px;"><strong>Strategic Positioning:</strong> ${we.competitive_positioning}</p>`;
  }

  return html;
}

function handleVerticalQuery(q, enrichment) {
  if (!enrichment?.partners) return '<p>Enrichment data not available.</p>';

  const verticalKeywords = {
    'fashion': ['fashion', 'apparel', 'clothing'],
    'beauty': ['beauty', 'cosmetic', 'fragrance'],
    'food': ['food', 'beverage', 'f&b'],
    'health': ['health', 'wellness', 'nutrition'],
    'luxury': ['luxury', 'premium', 'heritage'],
    'retail': ['retail', 'department', 'ecommerce'],
    'automotive': ['automotive', 'car'],
    'enterprise': ['enterprise'],
  };

  let matchedVertical = null;
  for (const [name, keywords] of Object.entries(verticalKeywords)) {
    if (keywords.some(k => q.includes(k))) { matchedVertical = name; break; }
  }

  if (!matchedVertical) return '<p>Please specify an industry vertical (e.g., fashion, beauty, health, food, luxury, enterprise, retail).</p>';

  const matches = [];
  enrichment.partners.forEach(ep => {
    const verticals = (ep.web_enrichment?.industry_verticals || []).join(' ').toLowerCase();
    if (verticalKeywords[matchedVertical].some(k => verticals.includes(k))) {
      matches.push({
        name: ep.partner_name.replace('WPP_EMEA - ', ''),
        verticals: ep.web_enrichment.industry_verticals,
        merchants: ep.recent_merchant_count,
        tier: getPartnerTier(ep.partner_name)
      });
    }
  });

  if (matches.length === 0) return `<p>No partners found with strong <strong>${matchedVertical}</strong> vertical expertise.</p>`;

  let html = `<p>🏷️ <strong>Partners with ${matchedVertical.charAt(0).toUpperCase() + matchedVertical.slice(1)} Expertise</strong></p>`;
  html += '<table class="chat-table"><tr><th>Partner</th><th>Tier</th><th>Recent Merchants</th><th>Relevant Verticals</th></tr>';
  matches.sort((a,b) => a.tier.tier - b.tier.tier);
  matches.forEach(m => {
    html += `<tr><td><strong>${m.name}</strong></td><td><span class="chat-tier-${m.tier.tier}">${m.tier.label}</span></td><td>${m.merchants}</td><td>${m.verticals.slice(0,3).join(', ')}</td></tr>`;
  });
  html += '</table>';
  return html;
}

function handleGMVQuery(data) {
  const gmvPartners = data.partners
    .map(p => ({
      name: p.partner_name.replace('WPP_EMEA - ',''),
      gmv: p.merchants?.reduce((s,m) => s + (m.gmv_usd_l365d||0), 0) || 0,
      merchants: p.recent_merchant_count
    }))
    .filter(p => p.gmv > 0)
    .sort((a,b) => b.gmv - a.gmv);

  let html = `<p>💰 <strong>L365d GMV by Partner</strong></p>
    <p>Total across all partners: <span class="chat-highlight">${fmt.currency(data.overall_summary.total_gmv_l365d_usd)}</span></p>`;
  html += '<table class="chat-table"><tr><th>Partner</th><th>L365d GMV</th><th>Merchants</th><th>Avg GMV/Merchant</th></tr>';
  gmvPartners.forEach(p => {
    html += `<tr><td><strong>${p.name}</strong></td><td>${fmt.currency(p.gmv)}</td><td>${p.merchants}</td><td>${fmt.currency(p.gmv / p.merchants)}</td></tr>`;
  });
  html += '</table>';
  return html;
}

function handleGeoQuery(data) {
  const breakdown = data.overall_summary.country_breakdown;
  const sorted = Object.entries(breakdown).sort((a,b) => b[1] - a[1]);

  let html = `<p>🌍 <strong>Geographic Distribution</strong> — ${data.overall_summary.total_merchants} merchants across ${sorted.length} countries</p>`;
  html += '<table class="chat-table"><tr><th>Country</th><th>Merchants</th><th>Share</th></tr>';
  sorted.forEach(([code, count]) => {
    html += `<tr><td>${countryNames[code] || code}</td><td>${count}</td><td>${(count/data.overall_summary.total_merchants*100).toFixed(0)}%</td></tr>`;
  });
  html += '</table>';
  html += `<p style="margin-top:8px;">The UK dominates with 57% of merchants. <strong>Swanky UKI</strong> has the broadest international reach (9 countries).</p>`;
  return html;
}

function handleWPPQuery(data, enrichment) {
  const wppPartners = data.partners.filter(p => p.partner_name.includes('WPP') || p.partner_name.includes('AKQA'));

  let html = '<p>🏢 <strong>WPP Agency Partners Analysis</strong></p>';
  html += '<table class="chat-table"><tr><th>Entity</th><th>Recent</th><th>All-Time</th><th>GMV</th><th>Status</th></tr>';
  wppPartners.forEach(p => {
    const gmv = p.merchants?.reduce((s,m) => s + (m.gmv_usd_l365d||0), 0) || 0;
    const tier = getPartnerTier(p.partner_name);
    html += `<tr><td><strong>${p.partner_name.replace('WPP_EMEA - ','')}</strong></td><td>${p.recent_merchant_count}</td><td>${p.all_time_merchants}</td><td>${gmv > 0 ? fmt.currency(gmv) : '—'}</td><td><span class="chat-tier-${tier.tier}">${tier.label}</span></td></tr>`;
  });
  html += '</table>';
  html += `<p style="margin-top:8px;"><strong>Key insight:</strong> <strong>Wunderman Thompson UKI</strong> is the strongest WPP performer with $66M in Glanbia deals. VMLY&R has only 1 merchant. AKQA has zero Shopify activity — they are a creative/design agency, not a commerce partner.</p>
    <p><strong>Post-merger risk:</strong> VML merger (VMLY&R + WT) may dilute Shopify capability. Recommend clarifying Shopify ownership within VML.</p>`;
  return html;
}

function handleSummary(data) {
  const s = data.overall_summary;
  return `<p>📊 <strong>Portfolio Summary</strong> (Last 2 Years: Feb 2024 – Feb 2026)</p>
    <table class="chat-table">
      <tr><td><strong>Total Partners</strong></td><td>9 (6 active, 3 inactive)</td></tr>
      <tr><td><strong>Total Merchants</strong></td><td>${s.total_merchants}</td></tr>
      <tr><td><strong>Total L365d GMV</strong></td><td>${fmt.currency(s.total_gmv_l365d_usd)}</td></tr>
      <tr><td><strong>Avg GMV/Merchant</strong></td><td>${fmt.currency(s.avg_gmv_per_merchant_l365d_usd)}</td></tr>
      <tr><td><strong>Avg Time to Launch</strong></td><td>${Math.round(s.avg_days_to_launch)} days (median: ${Math.round(s.median_days_to_launch)})</td></tr>
      <tr><td><strong>Plus Shop Rate</strong></td><td>${s.plus_shop_pct}%</td></tr>
      <tr><td><strong>Primary Market</strong></td><td>UK (${s.country_breakdown.GB} of ${s.total_merchants} merchants)</td></tr>
      <tr><td><strong>Countries Covered</strong></td><td>${Object.keys(s.country_breakdown).length}</td></tr>
    </table>
    <p style="margin-top:8px;"><strong>Top 3 partners by activity:</strong> Swanky UKI (29 merchants), Vervaunt (8), FuseFabric (5)</p>
    <p><strong>Top 3 by GMV:</strong> Swanky UKI ($62.4M), FuseFabric ($54.5M), Wunderman Thompson ($29M)</p>`;
}


// ---- Initialize ----
function initDashboard(merchantData, sfData) {
  document.getElementById('lastUpdated').textContent = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  renderKPIs(merchantData);
  renderPartnerTable(merchantData.partners, sfData.partners);
  initTableSort();
  renderTopDeals(merchantData);
  renderGeoDistribution(merchantData);
  renderLaunchTimeline(merchantData);
  renderSalesRepView(merchantData, sfData.partners);
  renderPartnerCards(merchantData, sfData.partners);
  renderOverviewCharts(merchantData);
  initNavigation();
  initAIChat();

  document.getElementById('table-search')?.addEventListener('input', updateTableSort);
  document.getElementById('filter-rep')?.addEventListener('change', updateTableSort);
  document.getElementById('filter-status')?.addEventListener('change', updateTableSort);
  document.getElementById('export-csv')?.addEventListener('click', exportTableCSV);
}

function initAIChat() {
  const input = document.getElementById('ai-chat-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAIMessage();
      }
    });
  }
}
