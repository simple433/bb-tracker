/**
 * Field Call Tracker - Core Application State & Storage
 */

const STORAGE_KEY = 'NAGAPATTINAM_FIELD_CALLS_V1';
const SETTINGS_KEY = 'NAGAPATTINAM_TRACKER_SETTINGS_V1';

const defaultSettings = {
  ratePerKm: 5,
  basePincode: '609703',
  theme: 'light'
};

class AppStore {
  constructor() {
    this.calls = [];
    this.settings = { ...defaultSettings };
    this.listeners = [];
    this.init();
  }

  init() {
    // Load Settings
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        this.settings = { ...defaultSettings, ...JSON.parse(savedSettings) };
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }

    // Apply Theme
    document.documentElement.setAttribute('data-theme', this.settings.theme);

    // Load Data
    const isExplicitlyReset = localStorage.getItem('FIELD_TRACKER_WAS_RESET') === 'true';
    const savedCalls = localStorage.getItem(STORAGE_KEY);
    let loadedCalls = null;
    if (savedCalls !== null && savedCalls.trim() !== '') {
      try {
        const parsed = JSON.parse(savedCalls);
        if (Array.isArray(parsed)) {
          loadedCalls = parsed;
        }
      } catch (e) {
        console.error('Error parsing stored calls:', e);
      }
    }

    if (loadedCalls !== null) {
      this.calls = loadedCalls;
    } else if (isExplicitlyReset) {
      this.calls = [];
    } else {
      const initialData = window.INITIAL_FIELD_CALLS || [];
      this.calls = JSON.parse(JSON.stringify(initialData));
      this.saveCalls();
    }

    // Auto-enrich calls with district, block, and IP Address if missing
    this.calls.forEach((c) => {
      if (!c.district) {
        c.district = 'Ariyalur';
      }
      if (!c.block) {
        if (window.INITIAL_FIELD_CALLS) {
          const match = window.INITIAL_FIELD_CALLS.find(initC => String(initC.udise) === String(c.udise));
          if (match && match.block) c.block = match.block;
        }
        if (!c.block && window.udiseGeoEngine) {
          c.block = window.udiseGeoEngine.getBlock(c.udise);
        }
        if (!c.block) c.block = 'Ariyalur';
      }
      if (!c.ipAddress && window.IPPingEngine) {
        c.ipAddress = window.IPPingEngine.getLabIP(c.udise, c.district);
      }
    });

    // Auto-clean any duplicate calls
    this.cleanDuplicateCalls();
  }

  saveCalls() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.calls));
    this.notify();
  }

  resetAllData(mode) {
    localStorage.setItem('FIELD_TRACKER_WAS_RESET', 'true');
    if (mode === 'EMPTY') {
      this.calls = [];
    } else {
      const initialData = window.INITIAL_FIELD_CALLS || [];
      this.calls = JSON.parse(JSON.stringify(initialData));
    }
    this.saveCalls();
    this.notify();
  }

  saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    document.documentElement.setAttribute('data-theme', this.settings.theme);
    this.notify();
  }

  toggleTheme() {
    this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
    this.saveSettings();
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.calls, this.settings));
  }

  // Alias used by ipPingEngine.js
  notifySubscribers() {
    this.notify();
  }

  // Record Mutation Methods
  getCallById(id) {
    if (id === undefined || id === null) return null;
    return this.calls ? (this.calls.find(c => String(c.id) === String(id) || (Number(id) > 0 && Number(c.id) === Number(id))) || null) : null;
  }

  updateCall(id, updatedFields) {
    const idx = this.calls.findIndex(c => String(c.id) === String(id));
    if (idx !== -1) {
      const currentCall = this.calls[idx];
      
      // Auto-calculate conveyance cost ONLY when distance is manually provided by engineer
      if ('distanceKm' in updatedFields) {
        const dist = parseFloat(updatedFields.distanceKm);
        if (!isNaN(dist) && dist >= 0) {
          updatedFields.distanceKm = dist;
          updatedFields.conveyanceCost = dist * (this.settings.ratePerKm || 5);
          updatedFields.isManualInput = true;
        } else {
          updatedFields.distanceKm = null;
          updatedFields.conveyanceCost = null;
          updatedFields.isManualInput = false;
        }
      }

      // Auto-set Date Closed when status is set to Completed
      if (updatedFields.status === 'Completed') {
        if (!updatedFields.dateClosed && !currentCall.dateClosed) {
          updatedFields.dateClosed = new Date().toISOString().split('T')[0];
        }
      } else {
        updatedFields.dateClosed = '';
      }

      // Handle ownCashSpent numeric parsing
      if ('ownCashSpent' in updatedFields) {
        const cash = parseFloat(updatedFields.ownCashSpent);
        updatedFields.ownCashSpent = (!isNaN(cash) && cash >= 0) ? cash : 0;
      }

      this.calls[idx] = { ...currentCall, ...updatedFields };
      this.saveCalls();
      return true;
    }
    return false;
  }

  addCall(newCallData) {
    const nextId = this.calls.length > 0 ? Math.max(...this.calls.map(c => Number(c.id) || 0)) + 1 : 1;
    
    // Auto-calculate age from raised date or use explicitly provided ageDays
    let ageDays = (newCallData.ageDays !== undefined && newCallData.ageDays !== null) ? parseInt(newCallData.ageDays) : 0;
    if (isNaN(ageDays) || ageDays < 0) ageDays = 0;

    if (newCallData.ticketRaisedOn) {
      const raisedDate = new Date(newCallData.ticketRaisedOn);
      if (!isNaN(raisedDate.getTime())) {
        const today = new Date();
        const diffTime = Math.abs(today - raisedDate);
        const calculatedAge = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (calculatedAge > 0) ageDays = calculatedAge;
      }
    }

    const isManual = newCallData.isManualInput === true;
    const dist = isManual ? parseFloat(newCallData.distanceKm) : null;
    const conveyanceCost = (isManual && !isNaN(dist) && dist >= 0) ? dist * (this.settings.ratePerKm || 5) : null;
    const ownCash = parseFloat(newCallData.ownCashSpent);

    const fullCall = {
      id: nextId,
      udise: newCallData.udise || '',
      block: newCallData.block || 'Nagapattinam',
      schoolName: newCallData.schoolName || '',
      issue: newCallData.issue || '',
      category: newCallData.category || 'TICKETING TOOL TICKET',
      aiName: newCallData.aiName || '',
      contactNo: newCallData.contactNo || '',
      zone611001: newCallData.zone611001 || 'NO',
      ticketRaisedOn: newCallData.ticketRaisedOn || new Date().toISOString().split('T')[0],
      ageDays: ageDays,
      status: newCallData.status || 'Not Started',
      distanceKm: dist,
      conveyanceCost: conveyanceCost,
      isManualInput: isManual,
      dateClosed: newCallData.status === 'Completed' ? new Date().toISOString().split('T')[0] : '',
      reasonIncomplete: newCallData.reasonIncomplete || '',
      actionTaken: newCallData.actionTaken || '',
      materialsUsed: newCallData.materialsUsed || '',
      ownCashSpent: (!isNaN(ownCash) && ownCash >= 0) ? ownCash : 0,
      ownCashReason: newCallData.ownCashReason || '',
      hmName: newCallData.hmName || '',
      hmSignedSheet: newCallData.hmSignedSheet || '',
      visitedBy: newCallData.visitedBy || ''
    };

    this.calls.unshift(fullCall);
    this.saveCalls();
    return fullCall;
  }

  cleanDuplicateCalls() {
    const seenMap = new Map();
    const cleanList = [];

    this.calls.forEach(c => {
      const udiseStr = String(c.udise || '').trim();
      const issueCore = (c.issue || '').toLowerCase().replace(/#ccc-\d+/g, '').trim();
      const key = `${udiseStr}_${c.schoolName}_${issueCore}`;

      if (!seenMap.has(key)) {
        seenMap.set(key, true);
        cleanList.push(c);
      }
    });

    if (cleanList.length !== this.calls.length) {
      this.calls = cleanList;
      this.saveCalls();
    }
  }

  batchIngestPortalCalls(newCallsArray) {
    if (!Array.isArray(newCallsArray) || newCallsArray.length === 0) return 0;
    
    let addedCount = 0;
    newCallsArray.forEach(rawCall => {
      const udiseStr = String(rawCall.udise || '').trim();
      const rawIssue = String(rawCall.issue || '').trim();
      const ticketMatch = rawCall.issue ? rawCall.issue.match(/#CCC-\d+/i) : null;
      const ticketId = ticketMatch ? ticketMatch[0].toUpperCase() : null;

      const isDuplicate = this.calls.some(c => {
        const cUdise = String(c.udise || '').trim();
        if (cUdise !== udiseStr) return false;

        // 1. Exact ticket ID match (#CCC-XXXX)
        if (ticketId && c.issue && c.issue.toUpperCase().includes(ticketId)) return true;

        // 2. Exact issue & school match
        if (c.issue && c.issue.trim().toLowerCase() === rawIssue.toLowerCase()) {
          return true;
        }

        return false;
      });

      if (!isDuplicate) {
        const nextId = this.calls.length > 0 ? Math.max(...this.calls.map(c => Number(c.id) || 0)) + 1 : 1;
        const dist = rawCall.isManualInput ? parseFloat(rawCall.distanceKm) : null;
        const conveyanceCost = (!isNaN(dist) && dist !== null && dist >= 0) ? dist * (this.settings.ratePerKm || 5) : null;
        
        const fullCall = {
          id: nextId,
          udise: rawCall.udise || '',
          block: rawCall.block || 'Nagapattinam',
          district: rawCall.district || 'Nagapattinam',
          schoolName: rawCall.schoolName || '',
          issue: rawCall.issue || 'CCC Portal Complaint Registered',
          category: rawCall.category || 'CCC PORTAL COMPLAINT',
          contactNo: rawCall.contactNo || '',
          zone611001: rawCall.zone611001 || 'NO',
          ticketRaisedOn: rawCall.ticketRaisedOn || new Date().toISOString().split('T')[0],
          ageDays: 1,
          status: 'Not Started',
          distanceKm: dist,
          conveyanceCost: conveyanceCost,
          dateClosed: '',
          actionTaken: '',
          materialsUsed: '',
          ownCashSpent: 0,
          ownCashReason: '',
          visitedBy: rawCall.visitedBy || '',
          isPortalSynced: true,
          isNewToday: true
        };
        this.calls.unshift(fullCall);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      this.saveCalls();
    }
    return addedCount;
  }

  deleteCall(id) {
    this.calls = this.calls.filter(c => String(c.id) !== String(id) && (isNaN(Number(id)) || Number(c.id) !== Number(id)));
    if (this.calls.length === 0) {
      localStorage.setItem('FIELD_TRACKER_WAS_RESET', 'true');
    }
    this.saveCalls();
  }

  deleteAllCalls() {
    localStorage.setItem('FIELD_TRACKER_WAS_RESET', 'true');
    this.calls = [];
    this.saveCalls();
  }

  resetToInitial() {
    localStorage.removeItem('FIELD_TRACKER_WAS_RESET');
    this.calls = JSON.parse(JSON.stringify(window.INITIAL_FIELD_CALLS || []));
    this.saveCalls();
  }
}

// Global App Instance
window.appStore = new AppStore();
