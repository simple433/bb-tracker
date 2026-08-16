/**
 * KS Smart Solutions - Weekly Call Assignment Import Module
 * Supports Excel (.xlsx, .xls, .csv) & OCR Image Recognition (Screenshots / Scans)
 */

class WeeklyCallImporter {
  constructor() {
    this.parsedCalls = [];
    this.init();
  }

  init() {
    const importCallsBtn = document.getElementById('importCallsBtn');
    const importModalOverlay = document.getElementById('importModalOverlay');
    const closeImportModal = document.getElementById('closeImportModal');
    const closeImportBtn = document.getElementById('closeImportBtn');
    const confirmImportBtn = document.getElementById('confirmImportBtn');

    if (importCallsBtn && importModalOverlay) {
      importCallsBtn.addEventListener('click', () => {
        importModalOverlay.classList.add('active');
      });
    }

    const closeFn = () => {
      if (importModalOverlay) importModalOverlay.classList.remove('active');
      this.resetPreview();
    };

    if (closeImportModal) closeImportModal.addEventListener('click', closeFn);
    if (closeImportBtn) closeImportBtn.addEventListener('click', closeFn);

    // Tab switching: Excel vs OCR
    const tabExcelBtn = document.getElementById('tabExcelBtn');
    const tabOcrBtn = document.getElementById('tabOcrBtn');
    const excelSection = document.getElementById('excelImportSection');
    const ocrSection = document.getElementById('ocrImportSection');

    if (tabExcelBtn && tabOcrBtn && excelSection && ocrSection) {
      tabExcelBtn.addEventListener('click', () => {
        tabExcelBtn.className = 'btn btn-sm btn-primary';
        tabOcrBtn.className = 'btn btn-sm btn-outline';
        excelSection.style.display = 'block';
        ocrSection.style.display = 'none';
      });

      tabOcrBtn.addEventListener('click', () => {
        tabOcrBtn.className = 'btn btn-sm btn-primary';
        tabExcelBtn.className = 'btn btn-sm btn-outline';
        ocrSection.style.display = 'block';
        excelSection.style.display = 'none';
      });
    }

    // Excel File Input Listener
    const excelFileInput = document.getElementById('excelFileInput');
    if (excelFileInput) {
      excelFileInput.addEventListener('change', (e) => this.handleExcelFile(e));
    }

    // OCR Image File Input Listener
    const ocrFileInput = document.getElementById('ocrFileInput');
    if (ocrFileInput) {
      ocrFileInput.addEventListener('change', (e) => this.handleOcrImage(e));
    }

    // Confirm Import Button
    if (confirmImportBtn) {
      confirmImportBtn.addEventListener('click', () => this.confirmImport());
    }
  }

  resetPreview() {
    this.parsedCalls = [];
    const previewContainer = document.getElementById('importPreviewContainer');
    const confirmBtn = document.getElementById('confirmImportBtn');
    const statusText = document.getElementById('importStatusText');
    const excelInput = document.getElementById('excelFileInput');
    const ocrInput = document.getElementById('ocrFileInput');

    if (previewContainer) previewContainer.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';
    if (statusText) statusText.textContent = '';
    if (excelInput) excelInput.value = '';
    if (ocrInput) ocrInput.value = '';
  }

  async handleExcelFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const statusText = document.getElementById('importStatusText');
    if (statusText) statusText.textContent = '⏳ Reading Excel spreadsheet...';

    try {
      const data = await file.arrayBuffer();
      let workbook;

      if (typeof XLSX !== 'undefined') {
        workbook = XLSX.read(data, { type: 'array' });
        
        let bestRows = [];
        let maxValidUdiseCount = -1;

        // Multi-Sheet Smart Parser: Iterate through all sheets in the Excel workbook
        workbook.SheetNames.forEach(sheetName => {
          const lowerName = sheetName.toLowerCase();
          // Skip overview/dashboard summary sheets if multiple sheets exist
          if (workbook.SheetNames.length > 1 && (lowerName.includes('dashboard') || lowerName.includes('summary') || lowerName.includes('overview') || lowerName.includes('kpi'))) {
            return;
          }

          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet || !worksheet['!ref']) return;

          // 1. Convert to Array-of-Arrays to auto-detect header row index (bypassing Title Banners in Row 1)
          const aoaRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (!Array.isArray(aoaRows) || aoaRows.length === 0) return;

          // Find row index that contains column headers
          let headerRowIdx = 0;
          for (let i = 0; i < Math.min(10, aoaRows.length); i++) {
            const rowArr = aoaRows[i];
            if (Array.isArray(rowArr)) {
              const lineStr = rowArr.join(' ').toLowerCase();
              if (lineStr.includes('school') || lineStr.includes('udise') || lineStr.includes('issue') || lineStr.includes('description') || lineStr.includes('block') || lineStr.includes('ticket')) {
                headerRowIdx = i;
                break;
              }
            }
          }

          // 2. Parse sheet starting from the detected header row index
          const jsonRows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIdx, defval: '' });
          const candidateCalls = this.extractCallsFromRows(jsonRows);

          // Score sheet by count of valid 11-digit UDISE codes starting with 33
          const validUdiseCount = candidateCalls.filter(c => c.udise && String(c.udise).match(/^33\d{9}$/)).length;

          if (validUdiseCount > maxValidUdiseCount || (validUdiseCount === maxValidUdiseCount && candidateCalls.length > bestRows.length)) {
            maxValidUdiseCount = validUdiseCount;
            bestRows = candidateCalls;
          }
        });

        this.applyParsedCalls(bestRows);
      } else {
        throw new Error('Excel parser library (XLSX) is not loaded.');
      }
    } catch (err) {
      console.error('Excel Import Error:', err);
      if (statusText) statusText.textContent = `❌ Failed to read Excel file: ${err.message}`;
    }
  }

  isDuplicateCall(newCall) {
    const existingCalls = window.appStore.calls || [];
    const cleanUdise = (newCall.udise || '').trim();
    const cleanIssue = (newCall.issue || '').trim().toLowerCase();
    const cleanSchool = (newCall.schoolName || '').trim().toLowerCase();

    return existingCalls.some(existing => {
      const existUdise = (existing.udise || '').trim();
      const existIssue = (existing.issue || '').trim().toLowerCase();
      const existSchool = (existing.schoolName || '').trim().toLowerCase();

      // De-duplication rule: Same UDISE Code + matching issue OR same UDISE Code + same school name
      if (cleanUdise && cleanUdise !== '33190000000' && existUdise === cleanUdise) {
        if (cleanIssue && existIssue && (cleanIssue.includes(existIssue) || existIssue.includes(cleanIssue))) {
          return true;
        }
        if (cleanSchool && existSchool && cleanSchool === existSchool) {
          return true;
        }
      }
      return false;
    });
  }

  extractCallsFromRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    
    const candidateCalls = [];
    rows.forEach((row, idx) => {
      if (!row || typeof row !== 'object') return;

      // Smart Column Matching
      const getVal = (possibleKeys) => {
        for (const key of possibleKeys) {
          for (const rowKey in row) {
            const cleanKey = String(rowKey).toLowerCase().replace(/[^a-z0-9]/g, '');
            const targetKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanKey === targetKey) {
              return String(row[rowKey]).trim();
            }
          }
        }
        return '';
      };

      const schoolName = getVal(['schoolname', 'school', 'nameofschool', 'institution', 'school_name', 'name_of_school', 'schoolname_tamil']);
      const labId = getVal(['labid', 'lab_id', 'lab']);
      let udise = getVal(['udise', 'udisecode', 'udiseno', 'code', 'emis', 'schoolid', 'school_id', 'udise_code', 'udise_number']);
      
      // Extract UDISE code from LAB ID (e.g. 33320100101_HL01 -> 33320100101)
      if ((!udise || udise === '33190000000') && labId) {
        const match = labId.match(/\d{11}/);
        if (match) udise = match[0];
        else udise = labId.split('_')[0];
      }

      // Regex fallback: Search for 11-digit UDISE code starting with 33 anywhere in row cells
      if (!udise) {
        for (const val of Object.values(row)) {
          const str = String(val);
          const match = str.match(/\b33\d{9}\b/);
          if (match) {
            udise = match[0];
            break;
          }
        }
      }

      const block = getVal(['block', 'blockname', 'block_name', 'taluk']);
      const district = getVal(['district', 'districtname', 'district_name']);
      const schoolType = getVal(['schooltype', 'school_type', 'labtype']);
      const ticketId = getVal(['ticketid', 'ticketno', 'ticket_id', 'complaintno', 'id']);
      const rawIssue = getVal([
        'issue', 'issuedescription', 'issue_description', 'problem', 'problemdescription', 
        'problem_description', 'complaint', 'complaintdescription', 'complaint_description',
        'description', 'remarks', 'remark', 'title', 'details', 'actiontaken', 'summary', 'reason',
        'call_description', 'calldescription', 'ticket_description', 'ticketdescription'
      ]);

      const downStatus = getVal(['status', 'callstatus', 'ticketstatus', 'labstatus']);
      const contactNo = getVal(['contact', 'contactno', 'phone', 'mobile', 'contact_no', 'mobile_no', 'phone_number']);
      const zone = getVal(['zone', '611001zone', 'cityzone']) || 'NO';
      const visitedBy = getVal(['visitedby', 'fieldengineer', 'technician', 'engineer', 'assigned_to']) || '';
      const rawCategory = getVal(['category', 'callcategory', 'ticketcategory', 'categorytype', 'category_type', 'call_category']);
      const rawAge = getVal(['age', 'agedays', 'ticketage', 'days', 'age_days', 'duration']);
      const rawDate = getVal(['ticketraisedon', 'date', 'createddate', 'ticketdate', 'raisedon', 'ticket_raised_on', 'created_at', 'date_raised', 'raised_date', 'datetime', 'call_date']);

      let finalAgeDays = null;
      let finalTicketRaisedOn = '';

      if (rawAge !== '') {
        const pAge = parseInt(String(rawAge).replace(/[^0-9]/g, ''));
        if (!isNaN(pAge) && pAge >= 0 && pAge < 3650) {
          finalAgeDays = pAge;
          try {
            const d = new Date();
            d.setDate(d.getDate() - pAge);
            if (!isNaN(d.getTime())) {
              finalTicketRaisedOn = d.toISOString().split('T')[0];
            }
          } catch(e) {}
        }
      }

      if (!finalTicketRaisedOn && rawDate !== '') {
        try {
          let parsedDate = null;
          const strDate = String(rawDate).trim();
          if (typeof rawDate === 'number' || (!isNaN(Number(strDate)) && strDate !== '')) {
            const num = Number(rawDate);
            if (num > 30000 && num < 60000) {
              parsedDate = new Date((num - (25567 + 2)) * 86400 * 1000);
            }
          } else if (strDate.includes('/')) {
            const parts = strDate.split('/');
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                parsedDate = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
              } else {
                parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              }
            }
          }
          if (!parsedDate || isNaN(parsedDate.getTime())) {
            parsedDate = new Date(rawDate);
          }

          if (parsedDate && !isNaN(parsedDate.getTime())) {
            finalTicketRaisedOn = parsedDate.toISOString().split('T')[0];
            const diffMs = Math.abs(new Date() - parsedDate);
            finalAgeDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          }
        } catch(e) {}
      }

      if (!finalTicketRaisedOn) {
        finalTicketRaisedOn = new Date().toISOString().split('T')[0];
      }
      if (finalAgeDays === null || isNaN(finalAgeDays)) {
        finalAgeDays = 1;
      }

      // Format clean issue description: Use exact real description from Excel if present!
      let issueText = '';
      if (rawIssue && rawIssue.trim() !== '') {
        if (ticketId && !rawIssue.includes(ticketId)) {
          issueText = `Ticket #${ticketId}: ${rawIssue.trim()}`;
        } else {
          issueText = rawIssue.trim();
        }
      } else if (ticketId) {
        issueText = `CCC Ticket #${ticketId}: Complaint Registered`;
      } else if (labId) {
        issueText = `🔴 DOWN SCHOOL REPORT: ${schoolType || 'Lab'} is DOWN (Lab ID: ${labId}). Immediate Field Rectification Required.`;
      } else {
        issueText = 'General Inspection / Maintenance';
      }

      // Footer/Legend detection: Skip Excel instructions or notes rows at bottom of sheet
      // Footer/Legend/Summary Header detection: Skip non-ticket rows
      const combinedStr = `${schoolName} ${rawIssue} ${udise} ${block}`.toLowerCase();
      if (combinedStr.includes('legend:') || 
          combinedStr.includes('columns are grouped') || 
          combinedStr.includes('conveyance cost auto-calculates') || 
          combinedStr.includes('distances are measured') || 
          combinedStr.includes('yellow cell') || 
          combinedStr.includes('row height is fixed') ||
          combinedStr.includes('block breakdown') ||
          combinedStr.includes('category breakdown') ||
          combinedStr.includes('overall completion') ||
          combinedStr.includes('closure tracker')) {
        return;
      }

      // Filter out non-school text labels
      const isHeaderOrSummary = (str) => {
        if (!str) return false;
        const s = str.toLowerCase();
        return s.includes('total calls') || s.includes('settings') || s.includes('overview') || s.includes('% done') || s.includes('completed') && s.includes('incomplete');
      };

      if (isHeaderOrSummary(schoolName) || isHeaderOrSummary(udise)) {
        return;
      }

      // Must have an explicit UDISE code or explicit school name from Excel
      if (!udise && (!schoolName || schoolName.trim() === '')) {
        return;
      }

      const hasValidUdise = udise && String(udise).match(/\b33\d{9}\b|\d{11}/);
      const hasValidSchool = schoolName && schoolName.trim().length > 3 && !isHeaderOrSummary(schoolName) && !schoolName.toLowerCase().includes('legend');

      const isDownReport = downStatus ? downStatus.toUpperCase().includes('DOWN') : (labId && !ticketId);
      const categoryText = rawCategory ? rawCategory : 'TICKETING TOOL TICKET';

      if (hasValidUdise || hasValidSchool) {
        const item = {
          udise: udise || '33190000000',
          schoolName: schoolName.trim(),
          block: block || 'Nagapattinam',
          district: district || 'Nagapattinam',
          issue: issueText,
          category: categoryText,
          contactNo: contactNo || '',
          zone611001: zone.toUpperCase().startsWith('Y') ? 'YES' : 'NO',
          status: isDownReport ? '🔴 Down / Awaiting Visit' : 'Not Started',
          ticketRaisedOn: finalTicketRaisedOn || new Date().toISOString().split('T')[0],
          ageDays: finalAgeDays !== null ? finalAgeDays : 1,
          distanceKm: null,
          visitedBy: visitedBy
        };

        candidateCalls.push(item);
      }
    });

    return candidateCalls;
  }

  applyParsedCalls(candidateCalls) {
    const statusText = document.getElementById('importStatusText');
    if (!candidateCalls || candidateCalls.length === 0) {
      this.parsedCalls = [];
      if (statusText) statusText.textContent = '⚠️ No valid call records found in any sheet of the Excel workbook.';
      this.renderPreviewTable();
      return;
    }

    this.parsedCalls = candidateCalls.map(c => {
      c.isDuplicate = this.isDuplicateCall(c);
      return c;
    });

    const newCount = this.parsedCalls.filter(c => !c.isDuplicate).length;
    const dupCount = this.parsedCalls.length - newCount;

    if (statusText) {
      statusText.textContent = `✅ Found ${this.parsedCalls.length} call tickets in Excel (${newCount} New Tickets, ${dupCount} Existing Duplicates Skipped).`;
    }
    this.renderPreviewTable();
  }

  async handleOcrImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const statusText = document.getElementById('importStatusText');
    if (statusText) statusText.textContent = '🔍 Scanning image with OCR engine (Tesseract)... Please wait 5-10 seconds.';

    try {
      if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract OCR library is not loaded. Please connect to the internet.');
      }

      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text' && statusText) {
            statusText.textContent = `🔍 Scanning image OCR text... ${Math.round(m.progress * 100)}%`;
          }
        }
      });

      const text = result.data.text;
      this.parseOcrText(text);
    } catch (err) {
      console.error('OCR Error:', err);
      if (statusText) statusText.textContent = `❌ OCR Recognition failed: ${err.message}`;
    }
  }

  parseOcrText(rawText) {
    const statusText = document.getElementById('importStatusText');
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 5);

    this.parsedCalls = [];
    let currentCall = null;

    lines.forEach((line) => {
      // Find 11-digit UDISE pattern (e.g. 33190100101)
      const udiseMatch = line.match(/\b(33\d{9})\b/);
      
      if (udiseMatch) {
        if (currentCall && (currentCall.schoolName || currentCall.udise)) {
          currentCall.isDuplicate = this.isDuplicateCall(currentCall);
          this.parsedCalls.push(currentCall);
        }

        const udiseCode = udiseMatch[1];
        const cleanLine = line.replace(udiseCode, '').trim();

        currentCall = {
          udise: udiseCode,
          schoolName: cleanLine || 'PUPS SCHOOL',
          block: 'Nagapattinam',
          issue: 'Assigned Call via OCR',
          category: 'HELPLINE TICKET',
          contactNo: '',
          zone611001: 'NO',
          status: 'Not Started',
          distanceKm: null,
          visitedBy: ''
        };
      } else if (currentCall) {
        if (!currentCall.schoolName || currentCall.schoolName === 'PUPS SCHOOL') {
          currentCall.schoolName = line.substring(0, 40);
        } else {
          currentCall.issue += ' ' + line.substring(0, 50);
        }
      }
    });

    if (currentCall && (currentCall.schoolName || currentCall.udise)) {
      currentCall.isDuplicate = this.isDuplicateCall(currentCall);
      this.parsedCalls.push(currentCall);
    }

    const newCount = this.parsedCalls.filter(c => !c.isDuplicate).length;
    const dupCount = this.parsedCalls.length - newCount;

    if (this.parsedCalls.length > 0) {
      if (statusText) statusText.textContent = `✅ OCR scanned ${this.parsedCalls.length} call tickets (${newCount} New Tickets, ${dupCount} Existing Duplicates Skipped).`;
      this.renderPreviewTable();
    } else {
      if (statusText) statusText.textContent = '⚠️ OCR finished scanning but could not detect 11-digit UDISE codes. Please use Excel import or enter manually.';
    }
  }

  renderPreviewTable() {
    const previewContainer = document.getElementById('importPreviewContainer');
    const previewBody = document.getElementById('importPreviewBody');
    const confirmBtn = document.getElementById('confirmImportBtn');

    if (!previewBody) return;

    const newCallsCount = this.parsedCalls.filter(c => !c.isDuplicate).length;

    let html = '';
    this.parsedCalls.forEach((c, idx) => {
      const rowStyle = c.isDuplicate ? 'opacity: 0.55; background: rgba(239, 68, 68, 0.05);' : '';
      const statusBadge = c.isDuplicate ?
        `<span class="badge" style="font-size: 0.65rem; background: var(--status-incomplete-bg); color: var(--status-incomplete-text);"><i class="fas fa-ban"></i> Existing (Will Skip)</span>` :
        `<span class="badge" style="font-size: 0.65rem; background: var(--status-completed-bg); color: var(--status-completed-text);"><i class="fas fa-check"></i> New Ticket</span>`;

      html += `
        <tr style="${rowStyle}">
          <td>${idx + 1}</td>
          <td style="font-weight: 700;">${c.schoolName}</td>
          <td class="font-mono">${c.udise}</td>
          <td>${c.block}</td>
          <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.issue}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    });

    previewBody.innerHTML = html;
    if (previewContainer) previewContainer.style.display = 'block';
    if (confirmBtn) {
      confirmBtn.style.display = 'inline-flex';
      confirmBtn.disabled = newCallsCount === 0;
      confirmBtn.innerHTML = `<i class="fas fa-file-import"></i> Confirm & Import ${newCallsCount} New Call(s)`;
    }
  }

  confirmImport() {
    const newCallsToImport = this.parsedCalls.filter(c => !c.isDuplicate);
    const skippedCount = this.parsedCalls.length - newCallsToImport.length;

    if (newCallsToImport.length === 0) {
      alert('⚠️ All calls in this file already exist in your tracker database! No duplicate entries were added.');
      return;
    }

    let addedCount = 0;
    newCallsToImport.forEach(callData => {
      const cleanData = { ...callData };
      delete cleanData.isDuplicate;
      window.appStore.addCall(cleanData);
      addedCount++;
    });

    let msg = `🎉 Successfully imported ${addedCount} new call ticket(s) into your tracker!`;
    if (skippedCount > 0) {
      msg += `\n\nℹ️ Note: ${skippedCount} existing duplicate call(s) were automatically skipped to avoid double entries.`;
    }
    alert(msg);

    const importModalOverlay = document.getElementById('importModalOverlay');
    if (importModalOverlay) importModalOverlay.classList.remove('active');
    this.resetPreview();
  }
}

// Global Importer Instance
window.importer = new WeeklyCallImporter();
