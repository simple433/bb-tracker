/**
 * Field Call Tracker - Table Rendering, Filtering, Sorting & Drawer Controller
 */

class FieldCallTracker {
  constructor() {
    this.tableBody = null;
    this.searchQuery = '';
    this.filterDistrict = 'ALL';
    this.filterBlock = 'ALL';
    this.filterStatus = 'ALL';
    this.filterCategory = 'ALL';
    this.filterZone = 'ALL';
    this.sortColumn = 'id';
    this.sortDirection = 'asc'; // 'asc' or 'desc'

    this.activeEditId = null;
    this.filterLabMode = 'ALL';
  }

  filterLabStatus(type) {
    this.filterLabMode = type; // 'ALL', 'LIVE', 'DOWN'
    const btnAll = document.getElementById('filterAllLabsBtn');
    const btnLive = document.getElementById('filterLiveLabsBtn');
    const btnDown = document.getElementById('filterDownLabsBtn');

    if (btnAll) btnAll.className = type === 'ALL' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
    if (btnLive) btnLive.className = type === 'LIVE' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
    if (btnDown) btnDown.className = type === 'DOWN' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';

    if (type === 'LIVE') {
      this.filterStatus = 'Completed';
    } else if (type === 'DOWN') {
      this.filterStatus = 'Not Started';
    } else {
      this.filterStatus = 'ALL';
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.value = this.filterStatus;

    this.render();
    this.scrollToTable();
  }

  init() {
    this.tableBody = document.getElementById('tableBody');

    try { this.setupEventListeners(); } catch(e) { console.error('[tracker] setupEventListeners error:', e); }
    try { this.render(); } catch(e) { console.error('[tracker] render error:', e); }

    // Subscribe to state updates to automatically re-render the grid
    if (window.appStore) {
      window.appStore.subscribe(() => {
        try { this.render(); } catch(e) { console.error('[tracker] subscribe render error:', e); }
      });
    }
  }

  setupEventListeners() {
    // Search Input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    const districtFilter = document.getElementById('districtFilter');
    if (districtFilter) {
      districtFilter.addEventListener('change', (e) => {
        this.filterDistrict = e.target.value;
        this.render();
      });
      this.setupCustomDownwardDropdown('districtFilter');
    }

    // Filter Selects
    const blockFilter = document.getElementById('blockFilter');
    if (blockFilter) {
      blockFilter.addEventListener('change', (e) => {
        this.filterBlock = e.target.value;
        this.render();
      });
      this.setupCustomDownwardDropdown('blockFilter');
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.render();
      });
      this.setupCustomDownwardDropdown('statusFilter');
    }

    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filterCategory = e.target.value;
        this.render();
      });
      this.setupCustomDownwardDropdown('categoryFilter');
    }

    const zoneFilter = document.getElementById('zoneFilter');
    if (zoneFilter) {
      zoneFilter.addEventListener('change', (e) => {
        this.filterZone = e.target.value;
        this.render();
      });
      this.setupCustomDownwardDropdown('zoneFilter');
    }

    // Reset Filters Button
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.filterBlock = 'ALL';
        this.filterStatus = 'ALL';
        this.filterCategory = 'ALL';
        this.filterZone = 'ALL';

        if (searchInput) searchInput.value = '';
        if (blockFilter) blockFilter.value = 'ALL';
        if (statusFilter) statusFilter.value = 'ALL';
        if (categoryFilter) categoryFilter.value = 'ALL';
        if (zoneFilter) zoneFilter.value = 'ALL';

        this.render();
      });
    }

    // KPI Cards Click Filters
    const cardTotal = document.getElementById('kpiCardTotal');
    const cardCompleted = document.getElementById('kpiCardCompleted');
    const cardInProgress = document.getElementById('kpiCardInProgress');
    const cardNotStarted = document.getElementById('kpiCardNotStarted');
    const cardConveyance = document.getElementById('kpiCardConveyance');
    const cardAvgAge = document.getElementById('kpiCardAvgAge');

    if (cardTotal && statusFilter) {
      cardTotal.addEventListener('click', () => {
        statusFilter.value = 'ALL';
        this.filterStatus = 'ALL';
        this.render();
        this.scrollToTable();
      });
    }

    if (cardCompleted && statusFilter) {
      cardCompleted.addEventListener('click', () => {
        statusFilter.value = 'Completed';
        this.filterStatus = 'Completed';
        this.render();
        this.scrollToTable();
      });
    }

    if (cardInProgress && statusFilter) {
      cardInProgress.addEventListener('click', () => {
        statusFilter.value = 'In Progress';
        this.filterStatus = 'In Progress';
        this.render();
        this.scrollToTable();
      });
    }

    if (cardNotStarted && statusFilter) {
      cardNotStarted.addEventListener('click', () => {
        statusFilter.value = 'Not Started';
        this.filterStatus = 'Not Started';
        this.render();
        this.scrollToTable();
      });
    }

    if (cardConveyance && statusFilter) {
      cardConveyance.addEventListener('click', () => {
        statusFilter.value = 'Completed';
        this.filterStatus = 'Completed';
        this.render();
        this.scrollToTable();
      });
    }

    if (cardAvgAge) {
      cardAvgAge.addEventListener('click', () => {
        this.sortColumn = 'ageDays';
        this.sortDirection = 'desc';
        this.render();
        this.scrollToTable();
      });
    }

    // Table Headers Sorting
    const thElements = document.querySelectorAll('.data-table th[data-sort]');
    thElements.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (this.sortColumn === col) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = col;
          this.sortDirection = 'asc';
        }
        this.render();
      });
    });

    // Drawer Forms & Events
    this.setupDrawerEvents();
  }

  setupDrawerEvents() {
    const editDrawerOverlay = document.getElementById('editDrawerOverlay');
    const closeEditDrawer = document.getElementById('closeEditDrawer');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editCallForm = document.getElementById('editCallForm');

    const closeDrawerFn = () => {
      if (editDrawerOverlay) editDrawerOverlay.classList.remove('active');
    };

    if (closeEditDrawer) closeEditDrawer.addEventListener('click', closeDrawerFn);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeDrawerFn);

    // Live Auto-calculate conveyance in edit form
    const editDistanceInput = document.getElementById('editDistanceKm');
    const editConveyanceInput = document.getElementById('editConveyanceCost');
    if (editDistanceInput && editConveyanceInput) {
      editDistanceInput.addEventListener('input', (e) => {
        const dist = parseFloat(e.target.value);
        if (!isNaN(dist) && dist >= 0) {
          const rate = window.appStore.settings.ratePerKm || 5;
          editConveyanceInput.value = `₹${(dist * rate).toFixed(0)}`;
        } else {
          editConveyanceInput.value = '';
        }
      });
    }



    // HM Signed Sheet File Input Handler
    const hmSignedInput = document.getElementById('editHmSignedSheetInput');
    const hmPreviewContainer = document.getElementById('hmSignedSheetPreviewContainer');
    const hmThumbnail = document.getElementById('hmSignedSheetThumbnail');
    const removeHmBtn = document.getElementById('removeHmSignedSheetBtn');
    const viewHmBtn = document.getElementById('viewHmSignedSheetBtn');

    if (hmSignedInput) {
      hmSignedInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            this.activeHmSignedSheet = evt.target.result;
            if (hmThumbnail) hmThumbnail.src = this.activeHmSignedSheet;
            if (hmPreviewContainer) hmPreviewContainer.style.display = 'flex';
            const fileNameEl = document.getElementById('hmSignedFileName');
            if (fileNameEl) fileNameEl.textContent = file.name;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (removeHmBtn) {
      removeHmBtn.addEventListener('click', () => {
        this.activeHmSignedSheet = '';
        if (hmSignedInput) hmSignedInput.value = '';
        if (hmPreviewContainer) hmPreviewContainer.style.display = 'none';
      });
    }

    if (viewHmBtn) {
      viewHmBtn.addEventListener('click', () => {
        if (this.activeHmSignedSheet) {
          const viewOverlay = document.getElementById('viewHmSheetOverlay');
          const fullImg = document.getElementById('viewHmSheetFullImage');
          if (fullImg) fullImg.src = this.activeHmSignedSheet;
          if (viewOverlay) viewOverlay.classList.add('active');
        }
      });
    }

    // Multi-Photo Site Completion / Status Photo File Listener
    this.activeSitePhotos = [];
    const sitePhotoInput = document.getElementById('editSitePhotoInput');

    if (sitePhotoInput) {
      sitePhotoInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files && files.length > 0) {
          let loadedCount = 0;
          files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (evt) => {
              this.activeSitePhotos.push(evt.target.result);
              loadedCount++;
              if (loadedCount === files.length) {
                this.renderSitePhotosGrid();
                sitePhotoInput.value = ''; // Reset input to allow adding more
              }
            };
            reader.readAsDataURL(file);
          });
        }
      });
    }

    // Delete Call Button Listener
    const deleteCallBtn = document.getElementById('deleteCallBtn');
    if (deleteCallBtn) {
      deleteCallBtn.addEventListener('click', () => {
        if (!this.activeEditId) return;
        const call = window.appStore.getCallById(this.activeEditId);
        const name = call ? call.schoolName : 'this call';
        if (confirm(`⚠️ ARE YOU SURE YOU WANT TO DELETE THIS CALL?\n\n"${name}" will be permanently removed.`)) {
          window.appStore.deleteCall(this.activeEditId);
          closeDrawerFn();
          this.render();
        }
      });
    }

    // View HM Sheet Overlay Close
    const closeViewHmOverlay = () => {
      const viewOverlay = document.getElementById('viewHmSheetOverlay');
      if (viewOverlay) viewOverlay.classList.remove('active');
    };
    const closeViewHmBtn1 = document.getElementById('closeViewHmSheet');
    const closeViewHmBtn2 = document.getElementById('closeViewHmSheetBtn');
    if (closeViewHmBtn1) closeViewHmBtn1.addEventListener('click', closeViewHmOverlay);
    if (closeViewHmBtn2) closeViewHmBtn2.addEventListener('click', closeViewHmOverlay);

    // Handle Edit Form Submit
    if (editCallForm) {
      editCallForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!this.activeEditId) return;

        const adminEngSelect = document.getElementById('editAssignedEngineerSelect');
        const reassignedEng = (adminEngSelect && adminEngSelect.value) ? adminEngSelect.value : document.getElementById('editVisitedBy').value;

        const updatedData = {
          status: document.getElementById('editStatus').value,
          distanceKm: document.getElementById('editDistanceKm').value,
          dateClosed: document.getElementById('editDateClosed').value,
          visitedBy: reassignedEng,
          actionTaken: document.getElementById('editActionTaken').value,
          materialsUsed: document.getElementById('editMaterialsUsed').value,
          remark: document.getElementById('editRemark') ? document.getElementById('editRemark').value : '',
          ownCashSpent: document.getElementById('editOwnCashSpent') ? document.getElementById('editOwnCashSpent').value : 0,
          ownCashReason: document.getElementById('editOwnCashReason') ? document.getElementById('editOwnCashReason').value : '',
          addlIssues: document.getElementById('editAddlIssues') ? document.getElementById('editAddlIssues').value : '',
          missingMaterials: document.getElementById('editMissingMaterials') ? document.getElementById('editMissingMaterials').value : '',
          escalationFlag: document.getElementById('editEscalationFlag') ? document.getElementById('editEscalationFlag').value : 'NONE',
          reasonIncomplete: document.getElementById('editReasonIncomplete').value,
          hmName: document.getElementById('editHmName') ? document.getElementById('editHmName').value : '',
          hmSignedSheet: this.activeHmSignedSheet || '',
          sitePhoto: (this.activeSitePhotos && this.activeSitePhotos.length > 0) ? this.activeSitePhotos[0] : '',
          sitePhotos: this.activeSitePhotos || []
        };

        window.appStore.updateCall(this.activeEditId, updatedData);
        closeDrawerFn();
      });
    }

    // Add Call Modal
    const addCallBtn = document.getElementById('addCallBtn');
    const addCallModalOverlay = document.getElementById('addCallModalOverlay');
    const closeAddModal = document.getElementById('closeAddModal');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const addCallForm = document.getElementById('addCallForm');

    if (addCallBtn && addCallModalOverlay) {
      addCallBtn.addEventListener('click', () => {
        addCallModalOverlay.classList.add('active');
      });
    }

    const closeAddFn = () => {
      if (addCallModalOverlay) addCallModalOverlay.classList.remove('active');
      if (addCallForm) addCallForm.reset();
    };

    if (closeAddModal) closeAddModal.addEventListener('click', closeAddFn);
    if (cancelAddBtn) cancelAddBtn.addEventListener('click', closeAddFn);

    if (addCallForm) {
      addCallForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newCallData = {
          udise: document.getElementById('addUdise').value,
          schoolName: document.getElementById('addSchoolName').value,
          block: document.getElementById('addBlock').value,
          issue: document.getElementById('addIssue').value,
          category: document.getElementById('addCategory').value,
          contactNo: document.getElementById('addContactNo').value,
          zone611001: document.getElementById('addZone').value,
          status: document.getElementById('addStatus').value,
          distanceKm: document.getElementById('addDistanceKm').value,
          visitedBy: document.getElementById('addVisitedBy').value,
          actionTaken: document.getElementById('addActionTaken') ? document.getElementById('addActionTaken').value : '',
          materialsUsed: document.getElementById('addMaterialsUsed') ? document.getElementById('addMaterialsUsed').value : '',
          ownCashSpent: document.getElementById('addOwnCashSpent') ? document.getElementById('addOwnCashSpent').value : 0,
          ownCashReason: document.getElementById('addOwnCashReason') ? document.getElementById('addOwnCashReason').value : '',
        };

        window.appStore.addCall(newCallData);
        closeAddFn();
      });
    }

    // Auth Modal Triggers & Form Listeners
    const switchUserBtn = document.getElementById('switchUserBtn');
    const authModalOverlay = document.getElementById('authModalOverlay');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const closeAuthBtn = document.getElementById('closeAuthBtn');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabSignupBtn = document.getElementById('tabSignupBtn');
    const tabHeadBtn = document.getElementById('tabHeadBtn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const demoEngineerBtn = document.getElementById('demoEngineerBtn');

    if (switchUserBtn && authModalOverlay) {
      switchUserBtn.addEventListener('click', () => {
        authModalOverlay.classList.add('active');
      });
    }

    const closeAuthFn = () => {
      if (authModalOverlay) authModalOverlay.classList.remove('active');
    };
    if (closeAuthModal) closeAuthModal.addEventListener('click', closeAuthFn);
    if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuthFn);

    if (tabLoginBtn && tabSignupBtn && loginForm && signupForm) {
      tabLoginBtn.addEventListener('click', () => {
        tabLoginBtn.className = 'btn btn-sm btn-primary';
        tabSignupBtn.className = 'btn btn-sm btn-outline';
        if (tabHeadBtn) tabHeadBtn.className = 'btn btn-sm btn-outline';
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
      });

      tabSignupBtn.addEventListener('click', () => {
        tabSignupBtn.className = 'btn btn-sm btn-primary';
        tabLoginBtn.className = 'btn btn-sm btn-outline';
        if (tabHeadBtn) tabHeadBtn.className = 'btn btn-sm btn-outline';
        signupForm.style.display = 'block';
        loginForm.style.display = 'none';
      });

      if (tabHeadBtn) {
        tabHeadBtn.addEventListener('click', () => {
          try {
            window.authStore.login('reportinghead@kssmart.co', 'admin123');
            this.updateUserProfileUI();
            closeAuthFn();
            alert('👔 Logged in as Reporting Head (Master Multi-District Admin)');
          } catch (err) {
            alert(err.message);
          }
        });
      }
    }

    if (demoEngineerBtn) {
      demoEngineerBtn.addEventListener('click', () => {
        try {
          window.authStore.login('mohamadshameer@kssmart.co', 'ks123');
          this.updateUserProfileUI();
          closeAuthFn();
          alert('👷 Logged in as Field Engineer: Mohamad Shameer');
        } catch (err) {
          alert(err.message);
        }
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;
        try {
          const user = window.authStore.login(email, pass);
          this.updateUserProfileUI();
          if (typeof window.updateUserHeaderUI === 'function') window.updateUserHeaderUI();
          if (user.homeBaseLocation) {
            localStorage.setItem('fieldTracker_homeBase', user.homeBaseLocation);
            const homeInput = document.getElementById('routeHomeBaseInput');
            if (homeInput) homeInput.value = user.homeBaseLocation;
          }
          closeAuthFn();
          alert(`✅ Welcome, ${user.name}!\nAssigned District: ${user.district || 'Nagapattinam'}`);
        } catch (err) {
          alert(err.message);
        }
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const contact = document.getElementById('signupContact').value;
        const empId = document.getElementById('signupEmpId').value;
        const district = document.getElementById('signupDistrict').value;
        const homeBase = document.getElementById('signupHomeBase') ? document.getElementById('signupHomeBase').value : '';
        const pass = document.getElementById('signupPassword').value;

        try {
          const user = window.authStore.signup(name, email, contact, empId, district, pass, 'FIELD_ENGINEER', homeBase);
          this.updateUserProfileUI();
          if (typeof window.updateUserHeaderUI === 'function') window.updateUserHeaderUI();
          if (homeBase) {
            localStorage.setItem('fieldTracker_homeBase', homeBase);
            const homeInput = document.getElementById('routeHomeBaseInput');
            if (homeInput) homeInput.value = homeBase;
          }
          closeAuthFn();
          alert(`🎉 Account Registered Successfully!\n\nWelcome ${user.name} (Emp ID: ${user.empId})\nAssigned District: ${user.district}`);
        } catch (err) {
          alert(err.message);
        }
      });
    }

    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
      resetPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;
        const pass1 = document.getElementById('resetNewPassword').value;
        const pass2 = document.getElementById('resetConfirmPassword').value;

        if (pass1 !== pass2) {
          alert('⚠️ Passwords do not match! Please check and re-enter.');
          return;
        }

        try {
          const user = window.authStore.resetPassword(email, pass1);
          this.updateUserProfileUI();
          if (typeof window.updateUserHeaderUI === 'function') window.updateUserHeaderUI();
          closeAuthFn();
          alert(`🔑 Password Updated Successfully!\n\nWelcome back, ${user.name} (${user.district || 'Nagapattinam'}).`);
        } catch (err) {
          alert(err.message);
        }
      });
    }

    this.updateUserProfileUI();
  }

  updateUserProfileUI() {
    const user = window.authStore ? window.authStore.currentUser : null;
    const nameEl = document.getElementById('userNameDisplay');
    const roleEl = document.getElementById('userRoleDisplay');
    const badgeEl = document.getElementById('userDistrictBadge');

    if (user) {
      if (nameEl) nameEl.textContent = user.name;
      if (roleEl) {
        if (user.role === 'REPORTING_HEAD') {
          roleEl.textContent = `👔 Reporting Head (${user.empId})`;
          roleEl.style.color = '#8b5cf6';
        } else {
          roleEl.textContent = `Field Engineer (${user.empId})`;
          roleEl.style.color = 'var(--text-muted)';
        }
      }
      if (badgeEl) badgeEl.textContent = user.district || 'Nagapattinam';
    }
  }

  getFilteredAndSortedCalls() {
    let list = [...window.appStore.calls];

    // Search Filter
    if (this.searchQuery) {
      list = list.filter(c => 
        (c.schoolName && c.schoolName.toLowerCase().includes(this.searchQuery)) ||
        (c.udise && c.udise.toLowerCase().includes(this.searchQuery)) ||
        (c.issue && c.issue.toLowerCase().includes(this.searchQuery)) ||
        (c.contactNo && c.contactNo.toLowerCase().includes(this.searchQuery)) ||
        (c.visitedBy && c.visitedBy.toLowerCase().includes(this.searchQuery))
      );
    }

    // Select Filters
    // District Filter (Statewide vs Specific District)
    if (this.filterDistrict && this.filterDistrict !== 'ALL') {
      list = list.filter(c => (c.district && c.district.toLowerCase() === this.filterDistrict.toLowerCase()) || (!c.district && this.filterDistrict === 'Nagapattinam'));
    }

    if (this.filterBlock !== 'ALL') {
      list = list.filter(c => c.block === this.filterBlock);
    }
    if (this.filterStatus !== 'ALL') {
      if (this.filterStatus === 'TODAY') {
        const todayStr = new Date().toISOString().split('T')[0];
        list = list.filter(c => c.ticketRaisedOn === todayStr || c.category === 'CCC PORTAL COMPLAINT');
      } else {
        list = list.filter(c => c.status === this.filterStatus);
      }
    }
    if (this.filterCategory !== 'ALL') {
      list = list.filter(c => c.category === this.filterCategory);
    }
    if (this.filterZone !== 'ALL') {
      list = list.filter(c => c.zone611001 === this.filterZone);
    }

    // Sorting
    list.sort((a, b) => {
      let valA = a[this.sortColumn];
      let valB = b[this.sortColumn];

      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return this.sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  openEditDrawer(callId) {
    try {
      let call = window.appStore ? window.appStore.getCallById(callId) : null;
      if (!call && window.INITIAL_FIELD_CALLS) {
        call = window.INITIAL_FIELD_CALLS.find(c => String(c.id) === String(callId));
      }
      if (!call) {
        console.error('Call not found for ID:', callId);
        return;
      }

      this.activeEditId = call.id;

      const setV = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined && val !== null ? val : '';
      };
      const setT = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt !== undefined && txt !== null ? txt : '';
      };

      setT('editDrawerTitle', `Call #${call.id} - ${call.schoolName}`);
      setV('editStatus', call.status || 'Not Started');
      setV('editDistanceKm', call.distanceKm !== null && call.distanceKm !== undefined ? call.distanceKm : '');
      
      const rate = (window.appStore && window.appStore.settings) ? (window.appStore.settings.ratePerKm || 5) : 5;
      const conveyance = (call.distanceKm !== null && call.distanceKm !== undefined && call.distanceKm >= 0) ? `₹${(call.distanceKm * rate).toFixed(0)}` : '';
      setV('editConveyanceCost', conveyance);

      setV('editDateClosed', call.dateClosed || '');
      setV('editVisitedBy', call.visitedBy || '');
      setV('editActionTaken', call.actionTaken || '');
      setV('editMaterialsUsed', call.materialsUsed || '');
      setV('editRemark', call.remark || 'All equipments working fine');
      setV('editOwnCashSpent', (call.ownCashSpent !== undefined && call.ownCashSpent !== null) ? call.ownCashSpent : '');
      setV('editOwnCashReason', call.ownCashReason || '');
      setV('editAddlIssues', call.addlIssues || '');
      setV('editMissingMaterials', call.missingMaterials || '');
      setV('editEscalationFlag', call.escalationFlag || 'NONE');
      setV('editHmName', call.hmName || '');
      setV('editReasonIncomplete', call.reasonIncomplete || '');

      // Admin Reassign Permission Block for Reporting Head
      const adminBlock = document.getElementById('adminReassignCallBlock');
      const adminEngSelect = document.getElementById('editAssignedEngineerSelect');
      const isHead = window.authStore ? window.authStore.isReportingHead() : false;

      if (adminBlock && adminEngSelect) {
        if (isHead) {
          adminBlock.style.display = 'block';
          const engineers = window.authStore ? window.authStore.getAllEngineers() : [];
          adminEngSelect.innerHTML = `<option value="">-- Keep Current (${call.visitedBy || 'Unassigned'}) --</option>`;
          engineers.forEach(eng => {
            const opt = document.createElement('option');
            opt.value = eng.name;
            opt.textContent = `👷 ${eng.name} (${eng.district})`;
            if (call.visitedBy && call.visitedBy.toLowerCase() === eng.name.toLowerCase()) {
              opt.selected = true;
            }
            adminEngSelect.appendChild(opt);
          });
        } else {
          adminBlock.style.display = 'none';
        }
      }

      // HM Signed Sheet Preview loading
      this.activeHmSignedSheet = call.hmSignedSheet || '';
      const hmPreviewContainer = document.getElementById('hmSignedSheetPreviewContainer');
      const hmThumbnail = document.getElementById('hmSignedSheetThumbnail');
      if (this.activeHmSignedSheet && hmPreviewContainer && hmThumbnail) {
        hmThumbnail.src = this.activeHmSignedSheet;
        hmPreviewContainer.style.display = 'flex';
      } else if (hmPreviewContainer) {
        hmPreviewContainer.style.display = 'none';
      }

      // Multi-Photo Site Completion / Status Photo Preview loading
      if (Array.isArray(call.sitePhotos) && call.sitePhotos.length > 0) {
        this.activeSitePhotos = [...call.sitePhotos];
      } else if (call.sitePhoto) {
        this.activeSitePhotos = [call.sitePhoto];
      } else {
        this.activeSitePhotos = [];
      }
      this.renderSitePhotosGrid();

      const overlay = document.getElementById('editDrawerOverlay');
      if (overlay) {
        overlay.classList.add('active');
      } else {
        console.error('editDrawerOverlay element not found in HTML.');
      }
    } catch(err) {
      console.error('Error in openEditDrawer:', err);
    }
  }

  renderSitePhotosGrid() {
    const gridContainer = document.getElementById('sitePhotosGridContainer');
    const photosList = document.getElementById('sitePhotosList');
    const headerAddBtn = document.getElementById('addMoreSitePhotosHeaderBtn');

    if (!gridContainer || !photosList) return;

    if (!this.activeSitePhotos || this.activeSitePhotos.length === 0) {
      gridContainer.style.display = 'none';
      if (headerAddBtn) headerAddBtn.style.display = 'none';
      return;
    }

    gridContainer.style.display = 'flex';
    if (headerAddBtn) headerAddBtn.style.display = 'inline-flex';

    photosList.innerHTML = this.activeSitePhotos.map((photoData, idx) => `
      <div style="display: flex; align-items: center; gap: 0.75rem; background: var(--bg-main); padding: 0.45rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <img src="${photoData}" alt="Photo ${idx + 1}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); flex-shrink: 0;">
        <div style="flex: 1; overflow: hidden;">
          <div style="font-size: 0.78rem; font-weight: 700; color: #0284c7;"><i class="fas fa-camera"></i> Photo #${idx + 1}</div>
          <div style="font-size: 0.68rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">Site completion image</div>
        </div>
        <div style="display: flex; gap: 0.3rem;">
          <button type="button" onclick="window.tracker.viewActiveSitePhoto(${idx})" class="btn btn-sm btn-outline" style="font-size: 0.7rem; padding: 0.2rem 0.45rem;" title="View Photo">
            <i class="fas fa-eye"></i> View
          </button>
          <button type="button" onclick="window.tracker.removeActiveSitePhoto(${idx})" class="btn btn-sm btn-outline" style="font-size: 0.7rem; padding: 0.2rem 0.45rem; color: var(--danger); border-color: var(--danger);" title="Remove Photo">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  removeActiveSitePhoto(index) {
    if (this.activeSitePhotos && this.activeSitePhotos[index] !== undefined) {
      this.activeSitePhotos.splice(index, 1);
      this.renderSitePhotosGrid();
    }
  }

  viewActiveSitePhoto(index) {
    this.currentViewerPhotos = [...this.activeSitePhotos];
    this.currentViewerPhotoIndex = index;
    this.showSitePhotoModal();
  }

  setupCustomDownwardDropdown(selectId) {
    const originalSelect = document.getElementById(selectId);
    if (!originalSelect) return;

    // Hide original select visually but keep it active in DOM
    originalSelect.style.display = 'none';

    // Remove old custom container if re-initializing
    const oldContainer = document.getElementById(`${selectId}_customContainer`);
    if (oldContainer) oldContainer.remove();

    const container = document.createElement('div');
    container.id = `${selectId}_customContainer`;
    container.className = 'custom-dropdown-container';

    const trigger = document.createElement('div');
    trigger.className = 'custom-dropdown-trigger';
    
    const getTriggerText = () => {
      if (!originalSelect || !originalSelect.options || originalSelect.options.length === 0) return '';
      const idx = originalSelect.selectedIndex >= 0 ? originalSelect.selectedIndex : 0;
      const selectedOpt = originalSelect.options[idx];
      return selectedOpt ? selectedOpt.textContent : (originalSelect.value || '');
    };

    trigger.innerHTML = `<span class="trigger-label">${getTriggerText()}</span> <i class="fas fa-chevron-down chevron"></i>`;

    const menu = document.createElement('div');
    menu.className = 'custom-dropdown-menu';

    // Show quick search for district select (38 items)
    const isDistrict = selectId === 'districtFilter';
    let searchInput = null;

    if (isDistrict) {
      const searchWrapper = document.createElement('div');
      searchWrapper.className = 'custom-dropdown-search-wrapper';
      searchWrapper.style.cssText = 'position: relative; padding: 0.35rem 0.5rem; background: var(--bg-main); border-radius: 10px; margin-bottom: 0.5rem; border: 1.5px solid var(--border-color); display: flex; align-items: center; box-shadow: inset 0 1px 3px rgba(0,0,0,0.03);';
      searchWrapper.innerHTML = `
        <i class="fas fa-search" style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); font-size: 0.85rem; color: var(--primary);"></i>
        <input type="text" class="custom-dropdown-search" placeholder="Type district to auto-filter (e.g. Nagapattinam, N)..." onclick="event.stopPropagation()" style="width: 100%; padding: 0.45rem 0.6rem 0.45rem 2.0rem; font-size: 0.84rem; font-weight: 600; border: none; background: transparent; color: var(--text-primary); outline: none; box-sizing: border-box;">
      `;
      menu.appendChild(searchWrapper);
      searchInput = searchWrapper.querySelector('.custom-dropdown-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          renderItems(e.target.value);
        });
      }
    }

    const listContainer = document.createElement('div');
    listContainer.className = 'custom-dropdown-items-list';
    menu.appendChild(listContainer);

    const renderItems = (filterText = '') => {
      listContainer.innerHTML = '';
      const options = Array.from(originalSelect.options);
      const query = filterText.toLowerCase().trim();

      options.forEach(opt => {
        if (query && !opt.textContent.toLowerCase().includes(query)) return;

        const item = document.createElement('div');
        item.className = `custom-dropdown-item ${opt.selected ? 'selected' : ''}`;
        item.innerHTML = `
          <span>${opt.textContent}</span>
          ${opt.selected ? '<i class="fas fa-check" style="font-size:0.75rem; color:var(--primary);"></i>' : ''}
        `;

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          originalSelect.value = opt.value;
          trigger.querySelector('.trigger-label').textContent = opt.textContent;
          container.classList.remove('open');
          
          // Trigger standard change event on original select
          const event = new Event('change', { bubbles: true });
          originalSelect.dispatchEvent(event);
          renderItems();
        });

        listContainer.appendChild(item);
      });
    };

    renderItems();

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderItems(e.target.value);
      });
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-dropdown-container.open').forEach(c => {
        if (c !== container) c.classList.remove('open');
      });
      container.classList.toggle('open');
      if (container.classList.contains('open') && searchInput) {
        setTimeout(() => searchInput.focus(), 100);
      }
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        container.classList.remove('open');
      }
    });

    container.appendChild(trigger);
    container.appendChild(menu);
    originalSelect.parentNode.insertBefore(container, originalSelect.nextSibling);

    // Sync label if select is updated programmatically
    originalSelect.addEventListener('change', () => {
      trigger.querySelector('.trigger-label').textContent = getTriggerText();
      renderItems();
    });
  }

  toggleDistrictSearchMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('downwardDistrictSearchMenu');
    if (!menu) return;

    const isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
      this.populateDistrictSearchResults('');
      const input = document.getElementById('districtSearchInputBox');
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
      }
    }
  }

  populateDistrictSearchResults(filterText = '') {
    const list = document.getElementById('districtSearchResultsList');
    const select = document.getElementById('districtFilter');
    if (!list || !select) return;

    const query = filterText.toLowerCase().trim();
    const options = Array.from(select.options);

    list.innerHTML = options.filter(opt => !query || opt.textContent.toLowerCase().includes(query)).map(opt => {
      const isSel = opt.selected;
      return `
        <div onclick="window.tracker.selectDistrictSearchResult('${opt.value}')" style="padding: 0.45rem 0.65rem; border-radius: 8px; font-size: 0.8rem; font-weight: ${isSel ? '800' : '600'}; background: ${isSel ? 'var(--primary-light)' : 'var(--bg-main)'}; color: ${isSel ? 'var(--primary)' : 'var(--text-primary)'}; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: background 0.15s ease;" class="district-search-item">
          <span>${opt.textContent}</span>
          ${isSel ? '<i class="fas fa-check" style="font-size:0.75rem;"></i>' : ''}
        </div>
      `;
    }).join('');
  }

  filterDistrictSearchResults() {
    const input = document.getElementById('districtSearchInputBox');
    this.populateDistrictSearchResults(input ? input.value : '');
  }

  selectDistrictSearchResult(value) {
    const select = document.getElementById('districtFilter');
    if (select) {
      select.value = value;
      const event = new Event('change', { bubbles: true });
      select.dispatchEvent(event);
    }
    const menu = document.getElementById('downwardDistrictSearchMenu');
    if (menu) menu.style.display = 'none';
  }

  viewHmSheet(callId) {
    const call = window.appStore.getCallById(callId);
    if (call && call.hmSignedSheet) {
      const viewOverlay = document.getElementById('viewHmSheetOverlay');
      const fullImg = document.getElementById('viewHmSheetFullImage');
      const titleEl = document.getElementById('viewHmSheetTitle');
      if (titleEl) titleEl.innerHTML = `<i class="fas fa-file-signature" style="color: var(--success);"></i> ${call.schoolName} - HM Signed Sheet`;
      if (fullImg) fullImg.src = call.hmSignedSheet;
      if (viewOverlay) viewOverlay.classList.add('active');
    }
  }

  viewSitePhoto(callId, photoIndex = 0) {
    const call = window.appStore.getCallById(callId);
    if (!call) return;

    let photos = [];
    if (Array.isArray(call.sitePhotos) && call.sitePhotos.length > 0) {
      photos = [...call.sitePhotos];
    } else if (call.sitePhoto) {
      photos = [call.sitePhoto];
    }

    if (photos.length === 0) return;

    this.currentViewerPhotos = photos;
    this.currentViewerPhotoIndex = photoIndex >= 0 && photoIndex < photos.length ? photoIndex : 0;
    this.showSitePhotoModal();
  }

  showSitePhotoModal() {
    const viewOverlay = document.getElementById('viewSitePhotoOverlay');
    const fullImg = document.getElementById('viewSitePhotoFullImage');
    const badgeEl = document.getElementById('sitePhotoIndexBadge');
    const prevBtn = document.getElementById('prevSitePhotoBtn');
    const nextBtn = document.getElementById('nextSitePhotoBtn');
    const thumbnailsStrip = document.getElementById('sitePhotoThumbnailsStrip');

    if (!viewOverlay || !fullImg) return;

    const total = this.currentViewerPhotos.length;
    const current = this.currentViewerPhotoIndex;

    fullImg.src = this.currentViewerPhotos[current] || '';
    if (badgeEl) badgeEl.textContent = `${current + 1} / ${total}`;

    if (prevBtn) prevBtn.style.display = total > 1 ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = total > 1 ? 'flex' : 'none';

    if (thumbnailsStrip) {
      if (total > 1) {
        thumbnailsStrip.innerHTML = this.currentViewerPhotos.map((p, i) => `
          <img src="${p}" onclick="window.tracker.currentViewerPhotoIndex=${i}; window.tracker.showSitePhotoModal();" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px; cursor: pointer; border: ${i === current ? '2px solid #0284c7' : '1px solid var(--border-color)'}; opacity: ${i === current ? '1' : '0.6'};">
        `).join('');
      } else {
        thumbnailsStrip.innerHTML = '';
      }
    }

    viewOverlay.classList.add('active');
  }

  navigateSitePhoto(direction) {
    if (!this.currentViewerPhotos || this.currentViewerPhotos.length <= 1) return;
    const total = this.currentViewerPhotos.length;
    this.currentViewerPhotoIndex = (this.currentViewerPhotoIndex + direction + total) % total;
    this.showSitePhotoModal();
  }

  openCccSchoolDashboard(callId) {
    const call = window.appStore.getCallById(callId);
    if (!call) return;
    window.activeCccSchool = call;

    const isDown = (call.status && call.status.toLowerCase().includes('down')) || (call.issue && call.issue.includes('DOWN')) || call.status === 'Not Started';
    const asset = window.IPPingEngine ? window.IPPingEngine.getSchoolAssetDetails(call.udise, call.district, call.schoolName, isDown) : {
      schoolName: call.schoolName, udise: call.udise, district: call.district || 'ARIYALUR',
      routerIp: '10.203.242.1', upsIp: '10.203.242.10', cameraIp: '10.203.242.5'
    };

    const titleEl = document.getElementById('cccSchoolNameDisplay');
    const subEl = document.getElementById('cccSchoolSubtitle');
    const nameEl = document.getElementById('modalSchoolHeaderName');
    const tagEl = document.getElementById('modalOfflineTag');

    if (titleEl) titleEl.textContent = `${asset.schoolName} (${call.category || 'HiTech Lab'})`;
    if (subEl) subEl.textContent = `District: ${asset.district} | Block: ${call.block || 'T.Palur'} | UDISE: ${asset.udise}`;
    if (nameEl) nameEl.textContent = asset.schoolName;
    if (tagEl) {
      tagEl.textContent = isDown ? 'Offline ❌' : 'Live 🟢';
      tagEl.style.background = isDown ? '#ef4444' : '#10b981';
    }

    const setT = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setT('modalDistrict', asset.district);
    setT('modalEduDistrict', `${asset.district} (DEE)`);
    setT('modalBlock', call.block || 'T.Palur');
    setT('modalLabId', `${asset.udise}_HL01`);
    setT('modalAdminName', `${asset.udise}_admin`);
    setT('modalAdminContact', call.contactNo || '7598031537');

    setT('modalCompTotal', `Total : ${asset.computers ? asset.computers.total : 10}`);
    setT('modalCompLive', `Live ${isDown ? 0 : (asset.computers ? asset.computers.total : 10)}`);

    setT('modalRouterIp', asset.routerIp);
    setT('modalRouterStatus', isDown ? 'Down ⬇️' : 'Live ⬆️');

    setT('modalUpsIp', asset.upsIp);
    setT('modalUpsStatus', isDown ? 'Down ⬇️' : 'Live ⬆️');

    setT('modalCameraIp', asset.cameraIp);
    setT('modalCameraStatus', isDown ? 'Down ⬇️' : 'Live ⬆️');

    setT('modalPendingTicketsCount', isDown ? 9 : 0);

    const modal = document.getElementById('cccSchoolDashboardOverlay');
    if (modal) modal.classList.add('active');
  }

  getStatusBadgeHTML(status) {
    switch (status) {
      case 'Completed':
        return `<span class="badge badge-status-completed"><i class="fas fa-check-circle"></i> Completed</span>`;
      case 'In Progress':
        return `<span class="badge badge-status-progress"><i class="fas fa-spinner fa-spin"></i> In Progress</span>`;
      case 'Incomplete':
        return `<span class="badge badge-status-incomplete"><i class="fas fa-exclamation-triangle"></i> Incomplete</span>`;
      case 'Cancelled':
        return `<span class="badge" style="background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid #ef4444;"><i class="fas fa-ban"></i> Cancelled</span>`;
      default:
        return `<span class="badge badge-status-pending"><i class="fas fa-clock"></i> Not Started</span>`;
    }
  }

  getZoneBadgeHTML(zone) {
    if (zone === 'YES') {
      return `<span class="badge badge-zone-yes">611001 Zone</span>`;
    }
    return `<span class="badge badge-zone-no">Outer Zone</span>`;
  }

  scrollToTable() {
    const tableCard = document.querySelector('.table-card');
    if (tableCard) {
      tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  render() {
    if (!this.tableBody) return;

    // Sync User Role Header UI
    const isHead = window.authStore ? window.authStore.isReportingHead() : false;
    const user = window.authStore ? window.authStore.currentUser : null;
    const banner = document.getElementById('reportingHeadAdminBanner');
    if (banner) banner.style.display = isHead ? 'block' : 'none';

    const userRoleEl = document.getElementById('userRoleDisplay');
    const userNameEl = document.getElementById('userNameDisplay');
    if (userNameEl && user) userNameEl.textContent = user.name;
    if (userRoleEl && user) {
      userRoleEl.textContent = isHead ? '👑 Reporting Head (Statewide Admin)' : `Field Engineer (${user.district || 'Nagapattinam'})`;
    }

    const filteredCalls = this.getFilteredAndSortedCalls();
    
    // Update Counter Element
    const totalCountEl = document.getElementById('totalCountBadge');
    if (totalCountEl) {
      totalCountEl.textContent = `${filteredCalls.length} / ${window.appStore.calls.length} calls showing`;
    }

    // Update Engineer Daily Operations Target Banner
    const completedCount = window.appStore.calls.filter(c => c.status === 'Completed').length;
    const targetCountEl = document.getElementById('targetCountDisplay');
    const targetProgressEl = document.getElementById('targetProgressBar');
    const targetStatusEl = document.getElementById('targetStatusText');
    const homeBaseEl = document.getElementById('engineerHomeBaseDisplay');

    if (homeBaseEl && user) {
      homeBaseEl.textContent = user.homeBaseLocation || `${user.district || 'Nagapattinam'} Base (609703)`;
    }

    if (targetCountEl) {
      targetCountEl.textContent = `${completedCount} / 3 Calls`;
    }
    if (targetProgressEl) {
      const pct = Math.min(100, Math.round((completedCount / 3) * 100));
      targetProgressEl.style.width = `${pct}%`;
    }
    if (targetStatusEl) {
      if (completedCount >= 3) {
        targetStatusEl.innerHTML = `<strong style="color: var(--success);">🎉 Daily target achieved (${completedCount}/3 completed)!</strong>`;
      } else {
        const rem = 3 - completedCount;
        targetStatusEl.textContent = `⚠️ ${rem} call(s) remaining to reach daily target of 3`;
      }
    }

    if (filteredCalls.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
            No matching field calls found. Try clearing your filters.
          </td>
        </tr>
      `;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const rowsHTML = filteredCalls.map(c => {
      const distStr = (c.distanceKm !== null && c.distanceKm !== undefined && c.distanceKm !== '' && String(c.distanceKm) !== 'undefined') ? `${c.distanceKm} km` : '-';
      const costStr = c.conveyanceCost !== null && c.conveyanceCost !== '' && String(c.conveyanceCost) !== 'undefined' ? `₹${c.conveyanceCost}` : '-';

      const isTodayCall = c.ticketRaisedOn === todayStr && (parseInt(c.ageDays) === 0);
      const todayBadgeHTML = isTodayCall 
        ? `<span class="badge" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: #ffffff; font-weight: 800; font-size: 0.65rem; padding: 0.15rem 0.45rem; border-radius: 4px; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);" title="Complaint registered today!"><i class="fas fa-fire"></i> NEW TODAY</span>`
        : '';

      const hmBadgeHTML = c.hmSignedSheet 
        ? `<div style="margin-top:0.25rem;"><span class="badge" style="background:#10b981; color:#fff; cursor:pointer;" onclick="window.tracker.viewHmSheet(${c.id})" title="Click to view HM Signed Report Sheet"><i class="fas fa-file-signature"></i> HM Signed</span></div>` 
        : (c.status === 'Completed' ? `<div style="margin-top:0.25rem;"><span class="badge" style="background:var(--bg-main); border:1px solid var(--border-color); color:var(--danger);" title="Missing HM Signed Report Sheet"><i class="fas fa-exclamation-triangle"></i> Missing HM Sign</span></div>` : '');

      const pCount = (Array.isArray(c.sitePhotos) && c.sitePhotos.length > 0) ? c.sitePhotos.length : (c.sitePhoto ? 1 : 0);
      const sitePhotoBadgeHTML = pCount > 0 
        ? `<div style="margin-top:0.25rem;"><span class="badge" style="background:#0284c7; color:#fff; cursor:pointer;" onclick="window.tracker.viewSitePhoto(${c.id})" title="Click to view ${pCount} On-Site Photo(s)"><i class="fas fa-camera"></i> ${pCount > 1 ? `${pCount} Photos` : 'Site Photo'}</span></div>` 
        : '';

      let escalationBadgeHTML = '';
      if (c.escalationFlag === 'INSTALLATION_PENDING') {
        escalationBadgeHTML = `<div style="margin-top:0.25rem;"><span class="badge" style="background:#f59e0b; color:#ffffff;" title="Installation Team action required (UPS/Wiring)"><i class="fas fa-boxes"></i> Installation Pending</span></div>`;
      } else if (c.escalationFlag === 'MATERIAL_REQUIRED' || (c.missingMaterials && c.missingMaterials.trim())) {
        escalationBadgeHTML = `<div style="margin-top:0.25rem;"><span class="badge" style="background:#d97706; color:#ffffff;" title="Materials / Spares needed from vendor"><i class="fas fa-shopping-cart"></i> Material Needed</span></div>`;
      } else if (c.escalationFlag === 'VENDOR_REPLACEMENT') {
        escalationBadgeHTML = `<div style="margin-top:0.25rem;"><span class="badge" style="background:#ef4444; color:#ffffff;" title="Vendor replacement required"><i class="fas fa-exclamation-triangle"></i> Vendor Replace</span></div>`;
      } else if (c.addlIssues && c.addlIssues.trim()) {
        escalationBadgeHTML = `<div style="margin-top:0.25rem;"><span class="badge" style="background:#8b5cf6; color:#ffffff;" title="Additional on-site issues reported"><i class="fas fa-search-plus"></i> Addl Issue Found</span></div>`;
      }

      const rowStyle = isTodayCall ? 'style="background: rgba(239, 68, 68, 0.04); border-left: 3px solid #ef4444;"' : '';

      return `
        <tr data-id="${c.id}" ${rowStyle}>
          <td class="font-mono" style="font-weight: 700;">#${c.id}</td>
          <td>
            <div style="font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
              <span>${c.schoolName}</span>
              ${todayBadgeHTML}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
              UDISE: <a href="${window.getStackSchoolsDirectUrl ? window.getStackSchoolsDirectUrl(c.udise, c.schoolName) : 'https://stackschools.com/'}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); font-weight: 700; text-decoration: underline;" title="Open direct school profile on StackSchools.com">${c.udise} <i class="fas fa-external-link-alt" style="font-size: 0.65rem; margin-left: 2px;"></i></a>
            </div>
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.2rem;">
              ${hmBadgeHTML}
              ${sitePhotoBadgeHTML}
              ${escalationBadgeHTML}
            </div>
          </td>
          <td>
            <span class="badge" style="background: rgba(79, 70, 229, 0.1); color: #4f46e5; border: 1px solid rgba(79, 70, 229, 0.2); font-weight: 800;">${c.district || 'Nagapattinam'}</span>
            <div style="margin-top: 0.2rem;"><span class="badge" style="background: var(--bg-main); border: 1px solid var(--border-color);">${c.block}</span></div>
          </td>
          <td style="max-width: 220px; font-size: 0.82rem; color: var(--text-secondary);">${c.issue || '-'}</td>
          <td><span style="font-size: 0.75rem; color: var(--text-muted);">${c.category}</span></td>
          <td class="font-mono">${c.contactNo || '-'}</td>
          <td class="font-mono" style="font-weight: 600;">${c.ageDays} d</td>
          <td>${this.getStatusBadgeHTML(c.status)}</td>
          <td class="font-mono" style="font-weight: 600;">${distStr}</td>
          <td class="font-mono" style="font-weight: 700; color: var(--primary);">${costStr}</td>
          <td>
            <button class="btn btn-outline btn-sm edit-btn" data-id="${c.id}" onclick="window.openLogCallDrawer ? window.openLogCallDrawer(${c.id}) : (window.tracker && window.tracker.openEditDrawer(${c.id}))" title="Edit Call Log">
              <i class="fas fa-edit"></i> Log Call
            </button>
          </td>
        </tr>
      `;
    }).join('');

    this.tableBody.innerHTML = rowsHTML;

    // Attach Event Listeners to Edit Buttons
    const editBtns = this.tableBody.querySelectorAll('.edit-btn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        this.openEditDrawer(id);
      });
    });
  }
}

// Global Tracker Instance
window.tracker = new FieldCallTracker();
