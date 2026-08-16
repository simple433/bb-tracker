/**
 * Field Call Tracker - KPI Aggregations & Dashboard Summary Engine
 */

class FieldCallDashboard {
  constructor() {
    this.statusChartRef = null;
    this.init();
  }

  init() {
    const renderFn = () => {
      if (window.appStore && window.appStore.calls) {
        this.updateDashboard(window.appStore.calls, window.appStore.settings);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderFn);
    } else {
      renderFn();
    }

    // Subscribe to store updates
    if (window.appStore) {
      window.appStore.subscribe((calls, settings) => {
        this.updateDashboard(calls, settings);
      });
    }
  }

  updateDashboard(calls, settings) {
    const totalCalls = calls.length;
    const completedCalls = calls.filter(c => c.status === 'Completed').length;
    const inProgressCalls = calls.filter(c => c.status === 'In Progress').length;
    const notStartedCalls = calls.filter(c => c.status === 'Not Started').length;
    const incompleteCalls = calls.filter(c => c.status === 'Incomplete').length;

    // Total Expense & Distance (Calculated STRICTLY for COMPLETED calls only)
    const completedCallItems = calls.filter(c => c.status === 'Completed' && c.conveyanceCost !== null && c.conveyanceCost !== undefined && parseFloat(c.conveyanceCost) >= 0);
    const totalDistance = completedCallItems.reduce((acc, c) => acc + (parseFloat(c.distanceKm) || 0), 0);
    const totalConveyance = completedCallItems.reduce((acc, c) => acc + (parseFloat(c.conveyanceCost) || 0), 0);

    // Average Ticket Age
    const avgAge = totalCalls > 0 
      ? Math.round(calls.reduce((acc, c) => acc + (parseInt(c.ageDays) || 0), 0) / totalCalls)
      : 0;

    // Update Dom Elements
    this.setElementText('kpiTotalCalls', totalCalls);
    this.setElementText('kpiCompleted', completedCalls);
    this.setElementText('kpiCompletedSubtext', `${totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0}% completion rate`);

    this.setElementText('kpiInProgress', inProgressCalls);
    this.setElementText('kpiNotStarted', notStartedCalls);
    this.setElementText('kpiIncomplete', incompleteCalls);

    this.setElementText('kpiConveyance', `₹${totalConveyance.toLocaleString('en-IN')}`);
    this.setElementText('kpiConveyanceSubtext', `${totalDistance.toLocaleString('en-IN')} total km traveled`);

    this.setElementText('kpiAvgAge', `${avgAge} days`);

    // Live vs Down Schools Metrics (CCC Portal ReportData)
    const downCalls = calls.filter(c => (c.status && c.status.toLowerCase().includes('down')) || (c.category && c.category.includes('DOWN')) || (c.issue && c.issue.includes('DOWN')));
    const downCount = downCalls.length;
    const liveCount = totalCalls - downCount;
    const livePercent = totalCalls > 0 ? ((liveCount / totalCalls) * 100).toFixed(1) : '100';
    const downPercent = totalCalls > 0 ? ((downCount / totalCalls) * 100).toFixed(1) : '0';

    // Separated Breakdown: HiTech Labs vs Smart Boards
    const hitechCalls = calls.filter(c => (c.category && c.category.includes('HIGH')) || (c.issue && (c.issue.toLowerCase().includes('hitech') || c.issue.toLowerCase().includes('lab'))));
    const hitechDownCount = hitechCalls.filter(c => (c.status && c.status.toLowerCase().includes('down')) || (c.issue && c.issue.includes('DOWN'))).length;

    const smartBoardCalls = calls.filter(c => !hitechCalls.includes(c));
    const smartBoardDownCount = downCount - hitechDownCount;

    this.setElementText('countAllLabs', totalCalls);
    this.setElementText('countLiveLabs', liveCount);
    this.setElementText('countDownLabs', downCount);
    this.setElementText('labLiveCountDisplay', `${liveCount} (${livePercent}%)`);
    this.setElementText('labDownCountDisplay', `${downCount} (${downPercent}%)`);

    this.setElementText('hitechLabCountDisplay', `🖥️ ${hitechCalls.length} Total • ${hitechDownCount} Down`);
    this.setElementText('smartBoardCountDisplay', `📺 ${smartBoardCalls.length} Total • ${Math.max(0, smartBoardDownCount)} Down`);

    // 1. Populate Block Progress Table (Compact)
    const tableBody = document.getElementById('blockSummaryTableBody');
    if (tableBody) {
      const blocks = ['Keezhaiyur', 'Nagapattinam', 'Kelvelur', 'Thirumarugal', 'Thalainayar', 'Vedaranyam'];
      let tableHTML = '';
      blocks.forEach(b => {
        const bCalls = calls.filter(c => (c.block || '').trim().toLowerCase() === b.toLowerCase());
        const bComp = bCalls.filter(c => c.status === 'Completed').length;
        const percent = bCalls.length > 0 ? Math.round((bComp / bCalls.length) * 100) : 0;
        
        tableHTML += `
          <tr>
            <td style="font-weight: 700;">${b}</td>
            <td style="text-align: center; font-weight: 600;">${bCalls.length}</td>
            <td style="text-align: center; font-weight: 600; color: var(--status-completed-text);">${bComp}</td>
            <td>
              <div class="progress-bar-container" style="width: 70px; height: 6px; margin-right: 0.35rem;">
                <div class="progress-bar-fill" style="width: ${percent}%; background: ${percent === 100 ? '#10b981' : '#2563eb'}"></div>
              </div>
              <span style="font-weight: 700; font-size: 0.75rem;">${percent}%</span>
            </td>
          </tr>
        `;
      });
      tableBody.innerHTML = tableHTML;
    }

    // 2. Populate Ticket Category Summary Table
    const categoryTableBody = document.getElementById('categorySummaryTableBody') || document.getElementById('techSummaryTableBody');
    if (categoryTableBody) {
      const catMap = {};
      calls.forEach(c => {
        let cat = (c.category || 'TICKETING TOOL TICKET').trim().toUpperCase();

        if (!catMap[cat]) {
          catMap[cat] = { name: cat, total: 0, completed: 0 };
        }
        catMap[cat].total += 1;
        if (c.status === 'Completed') {
          catMap[cat].completed += 1;
        }
      });

      const catList = Object.values(catMap).sort((a, b) => b.total - a.total);

      let catHTML = '';
      catList.forEach(c => {
        const rate = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
        let pillColor = 'var(--status-pending-text)';
        let pillBg = 'var(--status-pending-bg)';
        if (rate >= 75) {
          pillColor = 'var(--status-completed-text)';
          pillBg = 'var(--status-completed-bg)';
        } else if (rate >= 40) {
          pillColor = 'var(--status-progress-text)';
          pillBg = 'var(--status-progress-bg)';
        } else {
          pillColor = 'var(--status-incomplete-text)';
          pillBg = 'var(--status-incomplete-bg)';
        }

        catHTML += `
          <tr>
            <td style="font-weight: 700; font-size: 0.73rem; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.name}">
              ${c.name}
            </td>
            <td style="text-align: center; font-weight: 600;">${c.total}</td>
            <td style="text-align: center; font-weight: 600; color: var(--status-completed-text);">${c.completed}</td>
            <td style="text-align: center;">
              <span class="badge" style="background: ${pillBg}; color: ${pillColor}; font-weight: 800; padding: 0.15rem 0.4rem; font-size: 0.72rem;">
                ${rate}%
              </span>
            </td>
          </tr>
        `;
      });

      categoryTableBody.innerHTML = catHTML;
    }

    // 2. Render/Update Chart.js Doughnut Status Chart
    const ctx = document.getElementById('statusChart');
    if (ctx) {
      if (typeof Chart !== 'undefined') {
        const chartData = [completedCalls, inProgressCalls, notStartedCalls, incompleteCalls];
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#cbd5e1' : '#475569';
        const borderColor = isDark ? '#131b2e' : '#ffffff';
        
        if (this.statusChartRef) {
          // Update existing chart instance
          this.statusChartRef.data.datasets[0].data = chartData;
          this.statusChartRef.data.datasets[0].borderColor = borderColor;
          this.statusChartRef.options.plugins.legend.labels.color = textColor;
          this.statusChartRef.update();
        } else {
          // Initialize new Chart instance
          this.statusChartRef = new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ['Completed', 'In Progress', 'Not Started', 'Incomplete'],
              datasets: [{
                data: chartData,
                backgroundColor: [
                  '#10b981', // Completed
                  '#f59e0b', // In Progress
                  '#6366f1', // Not Started
                  '#f43f5e'  // Incomplete
                ],
                borderWidth: 2,
                borderColor: borderColor
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    color: textColor,
                    font: {
                      family: 'Plus Jakarta Sans',
                      weight: 'bold',
                      size: 11
                    }
                  }
                }
              },
              cutout: '65%'
            }
          });
        }
      } else {
        // Fallback SVG Doughnut Chart rendering when Chart.js CDN is unavailable
        const total = totalCalls || 1;
        const pComp = Math.round((completedCalls / total) * 100);
        const pProg = Math.round((inProgressCalls / total) * 100);
        const pNot = Math.round((notStartedCalls / total) * 100);
        const parent = ctx.parentNode;
        if (parent) {
          parent.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-around; width: 100%; height: 100%; min-height: 200px;">
              <svg viewBox="0 0 36 36" style="width: 140px; height: 140px; transform: rotate(-90deg);">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#6366f1" stroke-width="4.2" stroke-dasharray="${pNot}, 100" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" stroke-width="4.2" stroke-dasharray="${pComp}, 100" stroke-dashoffset="${-pNot}" />
              </svg>
              <div style="font-size: 0.78rem; font-weight: 700; display: flex; flex-direction: column; gap: 0.45rem;">
                <div style="color: #10b981;">🟢 Completed: ${completedCalls} (${pComp}%)</div>
                <div style="color: #f59e0b;">🟠 In Progress: ${inProgressCalls} (${pProg}%)</div>
                <div style="color: #6366f1;">🔵 Not Started: ${notStartedCalls} (${pNot}%)</div>
                <div style="color: #f43f5e;">🔴 Incomplete: ${incompleteCalls}</div>
              </div>
            </div>
          `;
        }
      }
    }
  }

  setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}

// Global Dashboard Instance
window.dashboard = new FieldCallDashboard();
