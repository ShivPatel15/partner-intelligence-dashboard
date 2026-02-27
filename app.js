/* ============================================
   Shopify Partner Intelligence Dashboard
   Interactive JavaScript Module
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

  const container = document.getElementById('partner-table-body');
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

  // Update sort indicators
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

  // Sort by deal amount, fallback to GMV
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

  // Render a doughnut chart for regions
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
  // Collect all merchants with launch data
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

  // Summary stats
  const allDays = launchData.map(d => d.days);
  const fastest = allDays.length ? Math.min(...allDays) : null;
  const slowest = allDays.length ? Math.max(...allDays) : null;
  const avg = allDays.length ? (allDays.reduce((s, d) => s + d, 0) / allDays.length) : null;
  const median = allDays.length ? allDays.sort((a, b) => a - b)[Math.floor(allDays.length / 2)] : null;

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

  // Individual merchant bars
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

  // Chart: Average time to launch by partner
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

// ---- Partner Detail Cards ----
function renderPartnerCards(data, sfPartners) {
  const container = document.getElementById('partner-cards');

  container.innerHTML = data.partners.map(p => {
    const sf = sfPartners.find(s => s.shopify_partner_id === String(p.partner_id)) || {};
    const isActive = p.recent_merchant_count > 0;
    const totalGMV = p.merchants?.reduce((s, m) => s + (m.gmv_usd_l365d || 0), 0) || 0;
    const geo = p.geographic_focus ? Object.keys(p.geographic_focus).join(', ') : '—';
    const avgLaunch = p.launch_timeline_metrics?.avg_days_to_launch;
    const displayName = p.partner_name.replace('WPP_EMEA - ', '');

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

    return `
    <div class="partner-card" data-partner="${p.partner_id}">
      <div class="partner-card-header">
        <div>
          <div class="partner-card-title">${displayName}</div>
          ${sf.website ? `<div style="font-size:0.75rem;color:var(--shopify-gray-500);margin-top:2px;">${sf.website}</div>` : ''}
        </div>
        <div class="partner-card-badges">
          <span class="badge ${isActive ? 'badge-green' : 'badge-gray'}">${isActive ? 'Active' : 'Inactive'}</span>
          <span class="badge badge-blue">Enterprise</span>
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
  // Merchant count by partner (bar chart)
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

  // GMV by partner (horizontal bar)
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

// ---- Initialize ----
function initDashboard(merchantData, sfData) {
  // Set last updated
  document.getElementById('lastUpdated').textContent = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Render all sections
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

  // Event listeners
  document.getElementById('table-search')?.addEventListener('input', updateTableSort);
  document.getElementById('filter-rep')?.addEventListener('change', updateTableSort);
  document.getElementById('filter-status')?.addEventListener('change', updateTableSort);
  document.getElementById('export-csv')?.addEventListener('click', exportTableCSV);
}
