// ============================================================================
// API CONFIGURATION
// ============================================================================
const API_CONFIG = {
  baseURL: 'http://127.0.0.1:3001',
  timeout: 5000,
  endpoints: {
    wines: '/wines',
    tastingNotes: '/tastingNotes'
  }
};

// ============================================================================
// API HELPER FUNCTIONS
// ============================================================================
const api = {
  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Verbinding verbroken. Probeer later opnieuw.');
      }
      throw error;
    }
  },

  async get(endpoint) {
    try {
      const response = await this.fetchWithTimeout(`${API_CONFIG.baseURL}${endpoint}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Niet gevonden');
        if (response.status >= 500) throw new Error('Serverfout, probeer later opnieuw');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Kan geen verbinding maken met database op localhost:3001. Controleer of JSON Server draait.');
      }
      throw error;
    }
  },

  async post(endpoint, data) {
    try {
      const response = await this.fetchWithTimeout(`${API_CONFIG.baseURL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        if (response.status >= 500) throw new Error('Serverfout, probeer later opnieuw');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Kan geen verbinding maken met database');
      }
      throw error;
    }
  },

  async put(endpoint, data) {
    try {
      const response = await this.fetchWithTimeout(`${API_CONFIG.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Wijn niet gevonden');
        if (response.status >= 500) throw new Error('Serverfout, probeer later opnieuw');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Kan geen verbinding maken met database');
      }
      throw error;
    }
  },

  async delete(endpoint) {
    try {
      const response = await this.fetchWithTimeout(`${API_CONFIG.baseURL}${endpoint}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Niet gevonden');
        if (response.status >= 500) throw new Error('Serverfout, probeer later opnieuw');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return true;
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Kan geen verbinding maken met database');
      }
      throw error;
    }
  }
};

// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================
const appState = {
  wines: [],
  tastingNotes: [],
  isLoading: false,
  isConnected: false,
  currentView: 'collection',
  currentWineId: null,
  currentTastingId: null,
  editingWineId: null,
  currentStockFilter: 'all',
  viewHistory: []
};

// Helper: Show/hide loading overlay
function showLoadingOverlay(message = 'Laden...') {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div id="loadingMessage">${message}</div>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    document.getElementById('loadingMessage').textContent = message;
    overlay.style.display = 'flex';
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Helper: Update connection status
function updateConnectionStatus(connected) {
  appState.isConnected = connected;
  const statusEl = document.getElementById('connectionStatus');
  if (statusEl) {
    statusEl.className = connected ? 'connection-status connected' : 'connection-status disconnected';
    statusEl.querySelector('.status-text').textContent = connected ? 'Verbonden' : 'Niet verbonden';
  }
}

// Helper: Deep copy object
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  maxBottles: 999,
  minBottles: 0,
  colorOptions: {
    "Wit": ["Limoen groen", "Stro geel", "Goud", "Amber"],
    "Rosé": ["Roze", "Zalmroze", "Oranje"],
    "Rood": ["Paars", "Robijn", "Granaat rood"]
  },
  colorEmojis: {
    'Limoen groen': '🟢',
    'Stro geel': '🟡',
    'Goud': '🟠',
    'Amber': '🟤',
    'Roze': '🌸',
    'Zalmroze': '🐟',
    'Oranje': '🟠',
    'Paars': '🟣',
    'Robijn': '🔴',
    'Granaat rood': '🍷'
  }
};

// ============================================================================
// APP OBJECT - MAIN APPLICATION LOGIC
// ============================================================================
const app = {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  init: async function() {
    console.log('Initializing Wine Cellar App...');
    await this.loadDataFromAPI();
  },

  async loadDataFromAPI() {
    showLoadingOverlay('Laden van wijnen en proefnotities...');
    
    try {
      const [wines, tastingNotes] = await Promise.all([
        api.get(API_CONFIG.endpoints.wines),
        api.get(API_CONFIG.endpoints.tastingNotes)
      ]);
      
      appState.wines = wines || [];
      appState.tastingNotes = tastingNotes || [];
      
      updateConnectionStatus(true);
      this.showCollection();
      this.showToast('Data succesvol geladen', 'success');
      
    } catch (error) {
      console.error('Failed to load data:', error);
      updateConnectionStatus(false);
      
      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--color-surface); padding: var(--space-32); border-radius: var(--radius-lg); border: 2px solid var(--color-error); box-shadow: var(--shadow-lg); max-width: 500px; z-index: 10000; text-align: center;';
      errorDiv.innerHTML = `
        <h2 style="color: var(--color-error); margin-bottom: var(--space-16);">⚠️ Kan niet verbinden met database</h2>
        <p style="margin-bottom: var(--space-16); color: var(--color-text);">${error.message}</p>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-16);">Zorg ervoor dat JSON Server draait op localhost:3001</p>
        <div style="background: var(--color-secondary); padding: var(--space-16); border-radius: var(--radius-base); margin-bottom: var(--space-16); text-align: left;">
          <strong>Setup instructies:</strong><br>
          1. Maak een db.json bestand in je projectmap<br>
          2. Start JSON Server: <code style="background: var(--color-surface); padding: 2px 6px; border-radius: 4px;">json-server --watch db.json --port 3001</code>
        </div>
        <button class="btn btn--primary" onclick="location.reload()">Opnieuw proberen</button>
      `;
      document.body.appendChild(errorDiv);
      
      this.showToast(error.message, 'error');
    } finally {
      hideLoadingOverlay();
    }
  },

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  getWineStatus: function(wine) {
    return wine.aantal_flessen > 0 ? 'In voorraad' : 'Uit voorraad';
  },

  getFilteredWines: function() {
    let filtered = [...appState.wines];
    
    if (appState.currentStockFilter === 'in_stock') {
      filtered = filtered.filter(w => w.aantal_flessen > 0);
    } else if (appState.currentStockFilter === 'out_of_stock') {
      filtered = filtered.filter(w => w.aantal_flessen === 0);
    }
    
    return filtered;
  },

  getWineById: function(id) {
    return appState.wines.find(w => w.id === id);
  },

  getTastingById: function(id) {
    return appState.tastingNotes.find(t => t.id === id);
  },

  getTastingsForWine: function(wineId) {
    return appState.tastingNotes.filter(t => t.wine_id === wineId);
  },

  // ============================================================================
  // VIEW MANAGEMENT
  // ============================================================================
  showCollection: function() {
    appState.currentView = 'collection';
    appState.currentWineId = null;
    appState.currentTastingId = null;
    appState.editingWineId = null;
    this.hideAllViews();
    document.getElementById('collectionView').style.display = 'block';
    this.renderWines();
  },

  showWineForm: function(wineId = null) {
    appState.currentView = 'wineForm';
    this.hideAllViews();
    document.getElementById('wineFormView').style.display = 'block';
    
    if (wineId) {
      appState.editingWineId = wineId;
      const wine = this.getWineById(wineId);
      if (!wine) {
        this.showToast('Wijn niet gevonden');
        this.showCollection();
        return;
      }
      document.getElementById('wineFormTitle').textContent = 'Wijn Bewerken';
      document.getElementById('wineId').value = wine.id;
      document.getElementById('wineNaam').value = wine.naam;
      document.getElementById('wineWijnhuis').value = wine.wijnhuis;
      document.getElementById('wineVintage').value = wine.vintage;
      document.getElementById('wineStreek').value = wine.streek;
      document.getElementById('wineDruif').value = wine.druif;
      document.getElementById('wineKleur').value = wine.kleur || '';
      document.getElementById('wineLocatie').value = wine.locatie;
      document.getElementById('wineAantalFlessen').value = wine.aantal_flessen;
    } else {
      appState.editingWineId = null;
      document.getElementById('wineFormTitle').textContent = 'Nieuwe Wijn';
      document.getElementById('wineForm').reset();
      document.getElementById('wineId').value = '';
      document.getElementById('wineAantalFlessen').value = 1;
    }
  },

  showWineDetail: function(wineId) {
    appState.currentView = 'wineDetail';
    appState.currentWineId = wineId;
    appState.currentTastingId = null;
    this.hideAllViews();
    document.getElementById('wineDetailView').style.display = 'block';
    this.renderWineDetail();
  },

  showTastingForm: function(tastingId = null) {
    appState.currentView = 'tastingForm';
    this.hideAllViews();
    document.getElementById('tastingFormView').style.display = 'block';
    
    const today = new Date().toISOString().split('T')[0];
    
    if (tastingId) {
      appState.currentTastingId = tastingId;
      const tasting = this.getTastingById(tastingId);
      if (!tasting) {
        this.showToast('Proefnotitie niet gevonden');
        this.showWineDetail(appState.currentWineId);
        return;
      }
      appState.currentWineId = tasting.wine_id;
      this.populateTastingForm(tasting);
    } else {
      appState.currentTastingId = null;
      document.getElementById('tastingForm').reset();
      document.getElementById('tastingId').value = '';
      document.getElementById('tastingDatum').value = today;
      document.getElementById('tastingWineId').value = appState.currentWineId;
      document.getElementById('colorOptionsGroup').style.display = 'none';
      document.getElementById('manualStarsGroup').style.display = 'none';
      document.getElementById('manualReason1Group').style.display = 'none';
      document.getElementById('manualReason2Group').style.display = 'none';
      document.getElementById('manualReason3Group').style.display = 'none';
      
      // Pre-select wine type based on wine's kleur if available
      const wine = this.getWineById(appState.currentWineId);
      if (wine && wine.kleur) {
        setTimeout(() => {
          const wijntype = document.querySelector(`input[name="wijntype"][value="${wine.kleur}"]`);
          if (wijntype) {
            wijntype.checked = true;
            this.updateColorOptions();
          }
        }, 50);
      }
      
      const starPreview = document.getElementById('starPreview');
      if (starPreview) starPreview.innerHTML = '';
      const starExplanation = document.getElementById('starExplanation');
      if (starExplanation) {
        starExplanation.innerHTML = '<p style="color: var(--color-text-secondary); text-align: center;">Vul het formulier in om de sterren te berekenen</p>';
      }
    }
  },

  showTastingDetail: function(tastingId) {
    appState.currentView = 'tastingDetail';
    appState.currentTastingId = tastingId;
    const tasting = this.getTastingById(tastingId);
    if (!tasting) {
      this.showToast('Proefnotitie niet gevonden');
      this.showWineDetail(appState.currentWineId);
      return;
    }
    appState.currentWineId = tasting.wine_id;
    this.hideAllViews();
    document.getElementById('tastingDetailView').style.display = 'block';
    this.renderTastingDetail();
  },

  hideAllViews: function() {
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.style.display = 'none');
  },

  // ============================================================================
  // WINE OPERATIONS
  // ============================================================================
  saveWine: async function(event) {
    event.preventDefault();
    
    const naam = document.getElementById('wineNaam').value.trim();
    const wijnhuis = document.getElementById('wineWijnhuis').value.trim();
    const vintage = parseInt(document.getElementById('wineVintage').value);
    const streek = document.getElementById('wineStreek').value.trim();
    const druif = document.getElementById('wineDruif').value.trim();
    const kleur = document.getElementById('wineKleur').value;
    const locatie = document.getElementById('wineLocatie').value;
    const aantal_flessen = parseInt(document.getElementById('wineAantalFlessen').value);
    
    if (!naam || !wijnhuis || !vintage || !streek || !druif || !kleur || !locatie) {
      this.showToast('Vul alle verplichte velden in');
      return;
    }
    
    if (aantal_flessen < CONFIG.minBottles || aantal_flessen > CONFIG.maxBottles) {
      this.showToast(`Aantal flessen moet tussen ${CONFIG.minBottles} en ${CONFIG.maxBottles} zijn`);
      return;
    }
    
    const wineData = { naam, wijnhuis, vintage, streek, druif, kleur, locatie, aantal_flessen };

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    try {
      if (appState.editingWineId) {
        const updatedWine = await api.put(`${API_CONFIG.endpoints.wines}/${appState.editingWineId}`, {
          ...wineData,
          id: appState.editingWineId
        });
        
        const wineIndex = appState.wines.findIndex(w => w.id === appState.editingWineId);
        if (wineIndex !== -1) {
          appState.wines[wineIndex] = updatedWine;
        }
        
        this.showToast('Wijn bijgewerkt', 'success');
      } else {
        const newWine = await api.post(API_CONFIG.endpoints.wines, wineData);
        appState.wines.push(newWine);
        this.showToast('Wijn toegevoegd', 'success');
      }

      this.showCollection();
      
    } catch (error) {
      console.error('Failed to save wine:', error);
      this.showToast(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  },

  editWine: function() {
    if (!appState.currentWineId) {
      this.showToast('Geen wijn geselecteerd');
      return;
    }
    this.showWineForm(appState.currentWineId);
  },

  deleteWine: async function() {
    if (!appState.currentWineId) {
      this.showToast('Geen wijn geselecteerd');
      return;
    }
    
    const wine = this.getWineById(appState.currentWineId);
    if (!wine) {
      this.showToast('Wijn niet gevonden');
      this.showCollection();
      return;
    }
    
    const tastingCount = this.getTastingsForWine(appState.currentWineId).length;
    const confirmMessage = tastingCount > 0 
      ? `Weet je zeker dat je "${wine.naam}" wilt verwijderen? Alle ${tastingCount} proefnotitie(s) worden ook verwijderd.`
      : `Weet je zeker dat je "${wine.naam}" wilt verwijderen?`;
    
    if (confirm(confirmMessage)) {
      showLoadingOverlay('Wijn verwijderen...');
      
      try {
        // Delete wine
        await api.delete(`${API_CONFIG.endpoints.wines}/${appState.currentWineId}`);
        
        // Delete associated tasting notes
        const tastingsToDelete = this.getTastingsForWine(appState.currentWineId);
        await Promise.all(
          tastingsToDelete.map(t => api.delete(`${API_CONFIG.endpoints.tastingNotes}/${t.id}`))
        );
        
        // Update local state
        appState.wines = appState.wines.filter(w => w.id !== appState.currentWineId);
        appState.tastingNotes = appState.tastingNotes.filter(t => t.wine_id !== appState.currentWineId);
        
        this.showToast('Wijn verwijderd', 'success');
        this.showCollection();
        
      } catch (error) {
        console.error('Failed to delete wine:', error);
        this.showToast(error.message, 'error');
      } finally {
        hideLoadingOverlay();
      }
    }
  },

  // ============================================================================
  // INVENTORY MANAGEMENT
  // ============================================================================
  drinkBottle: async function() {
    if (!appState.currentWineId) return;
    
    const wine = this.getWineById(appState.currentWineId);
    if (!wine) return;
    
    if (wine.aantal_flessen <= 0) {
      this.showToast('Geen flessen meer op voorraad');
      return;
    }
    
    const newCount = Math.max(0, wine.aantal_flessen - 1);
    
    try {
      const updatedWine = await api.put(`${API_CONFIG.endpoints.wines}/${wine.id}`, {
        ...wine,
        aantal_flessen: newCount
      });
      
      wine.aantal_flessen = updatedWine.aantal_flessen;
      
      const statusMsg = wine.aantal_flessen === 0 
        ? 'Fles gedronken, aantal bijgewerkt' 
        : `Fles gedronken! Nog ${wine.aantal_flessen} fles${wine.aantal_flessen !== 1 ? 'sen' : ''} over`;
      this.showToast(statusMsg, 'success');
      this.renderWineDetail();
      
    } catch (error) {
      console.error('Failed to update bottle count:', error);
      this.showToast(error.message, 'error');
    }
  },

  updateBottleCount: async function(change) {
    if (!appState.currentWineId) return;
    
    const wine = this.getWineById(appState.currentWineId);
    if (!wine) return;
    
    const newCount = wine.aantal_flessen + change;
    
    if (newCount < CONFIG.minBottles) {
      this.showToast('Aantal flessen kan niet negatief zijn');
      return;
    }
    
    if (newCount > CONFIG.maxBottles) {
      this.showToast(`Maximum aantal flessen is ${CONFIG.maxBottles}`);
      return;
    }
    
    try {
      const updatedWine = await api.put(`${API_CONFIG.endpoints.wines}/${wine.id}`, {
        ...wine,
        aantal_flessen: newCount
      });
      
      wine.aantal_flessen = updatedWine.aantal_flessen;
      this.showToast(`Aantal flessen bijgewerkt: ${newCount}`, 'success');
      this.renderWineDetail();
      
    } catch (error) {
      console.error('Failed to update bottle count:', error);
      this.showToast(error.message, 'error');
    }
  },

  setStockFilter: function(filter) {
    appState.currentStockFilter = filter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
    
    this.renderWines();
  },

  // ============================================================================
  // STAR CALCULATION (AUTOMATIC)
  // ============================================================================
  calculateAutoStars: function() {
    let halfStars = 0;
    const reasons = [];

    // Afdronk: 0.5 stars (1 half) for Medium, 1.0 stars (2 halves) for Hoog
    const afdronk = document.querySelector('input[name="afdronk"]:checked')?.value;
    if (afdronk === 'Medium') {
      halfStars += 1;
      reasons.push({ text: 'Medium afdronk (+0.5 ster)', earned: true });
    } else if (afdronk === 'Hoog') {
      halfStars += 2;
      reasons.push({ text: 'Hoge afdronk (+1.0 ster)', earned: true });
    } else {
      reasons.push({ text: 'Afdronk laag (0 sterren)', earned: false });
    }

    // Count ALL aromas (primair + secundair + tertiair) - not just primary
    const primaryAromas = document.querySelectorAll('input[name="geur_primair"]:checked');
    const secundairAromas = document.querySelectorAll('input[name="geur_secundair"]:checked');
    const tertiairAromas = document.querySelectorAll('input[name="geur_tertiair"]:checked');
    const totalAromas = primaryAromas.length + secundairAromas.length + tertiairAromas.length;
    
    if (totalAromas >= 3) {
      halfStars += 1;
      reasons.push({ text: `Minimaal 3 aroma's in totaal (${totalAromas} geselecteerd: ${primaryAromas.length} primair, ${secundairAromas.length} secundair, ${tertiairAromas.length} tertiair) (+0.5 ster)`, earned: true });
    } else {
      reasons.push({ text: `Minimaal 3 aroma's in totaal (${totalAromas} geselecteerd)`, earned: false });
    }

    const geurintensiteit = document.querySelector('input[name="geurintensiteit"]:checked')?.value;
    if (geurintensiteit === 'Medium') {
      halfStars += 1;
      reasons.push({ text: 'Medium geurintensiteit (+0.5 ster)', earned: true });
    } else {
      reasons.push({ text: 'Medium geurintensiteit (0 sterren)', earned: false });
    }

    return { halfStars, reasons };
  },

  // ============================================================================
  // STAR CALCULATION UPDATE & DISPLAY
  // ============================================================================
  updateStarCalculation: function() {
    const { halfStars, reasons } = this.calculateAutoStars();
    
    const manual1 = document.querySelector('input[name="manual_star_1"]')?.checked || false;
    const manual2 = document.querySelector('input[name="manual_star_2"]')?.checked || false;
    const manual3 = document.querySelector('input[name="manual_star_3"]')?.checked || false;
    const manualCount = (manual1 ? 2 : 0) + (manual2 ? 2 : 0) + (manual3 ? 2 : 0);
    const totalHalfStars = halfStars + manualCount;
    
    const starPreview = document.getElementById('starPreview');
    if (starPreview) {
      starPreview.innerHTML = this.renderStars(totalHalfStars);
    }

    const starExplanation = document.getElementById('starExplanation');
    if (starExplanation) {
      let html = '<strong>Automatische sterren (max 4 halve sterren / 2 hele sterren):</strong><ul>';
      reasons.forEach(reason => {
        const className = reason.earned ? 'earned' : '';
        const icon = reason.earned ? '✅' : '❌';
        html += `<li class="${className}">${icon} ${reason.text}</li>`;
      });
      html += '</ul>';
      html += `<strong>Automatisch totaal: ${halfStars} halve ster${halfStars !== 1 ? 'ren' : ''} = ${this.formatStarCount(halfStars)}</strong><br><small style="color: var(--color-text-secondary);">Max 4 halve sterren automatisch (2 hele sterren)</small>`;
      
      if (manualCount > 0) {
        html += `<br><strong style="color: var(--color-warning);">+ Handmatig: ${manualCount} halve ster${manualCount !== 1 ? 'ren' : ''} (${manualCount/2} hele ster${manualCount !== 2 ? 'ren' : ''})</strong>`;
        html += `<br><strong>Eindtotaal: ${this.formatStarCount(totalHalfStars)} (max 5 sterren)</strong>`;
      }
      
      starExplanation.innerHTML = html;
    }

    const manualStarsGroup = document.getElementById('manualStarsGroup');
    if (manualStarsGroup && halfStars > 0) {
      manualStarsGroup.style.display = 'block';
    }

    const reason1Group = document.getElementById('manualReason1Group');
    const reason2Group = document.getElementById('manualReason2Group');
    const reason3Group = document.getElementById('manualReason3Group');
    
    if (reason1Group) reason1Group.style.display = manual1 ? 'block' : 'none';
    if (reason2Group) reason2Group.style.display = manual2 ? 'block' : 'none';
    if (reason3Group) reason3Group.style.display = manual3 ? 'block' : 'none';
  },

  renderStars: function(halfStars, showAutoManualSplit = false, autoStars = 0) {
    const fullStars = Math.floor(halfStars / 2);
    const hasHalfStar = halfStars % 2 === 1;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let html = '';
    
    if (showAutoManualSplit) {
      const autoFullStars = Math.floor(autoStars / 2);
      const autoHasHalf = autoStars % 2 === 1;
      
      html += '<span class="auto-stars">';
      for (let i = 0; i < autoFullStars; i++) {
        html += '★';
      }
      if (autoHasHalf) {
        html += '½★';
      }
      html += '</span>';
      
      const manualStars = halfStars - autoStars;
      const manualFullStars = Math.floor(manualStars / 2);
      const manualHasHalf = manualStars % 2 === 1;
      
      if (manualStars > 0) {
        html += '<span class="manual-stars">';
        for (let i = 0; i < manualFullStars; i++) {
          html += '★';
        }
        if (manualHasHalf) {
          html += '½★';
        }
        html += '</span>';
      }
      
      for (let i = 0; i < emptyStars; i++) {
        html += '☆';
      }
    } else {
      for (let i = 0; i < fullStars; i++) {
        html += '★';
      }
      
      if (hasHalfStar) {
        html += '½★';
      }
      
      for (let i = 0; i < emptyStars; i++) {
        html += '☆';
      }
    }
    
    return html;
  },

  formatStarCount: function(halfStars) {
    const fullStars = Math.floor(halfStars / 2);
    const hasHalf = halfStars % 2 === 1;
    
    if (hasHalf) {
      return `${fullStars}½ ster${fullStars > 0 || hasHalf ? 'ren' : ''}`;
    } else {
      return `${fullStars} ster${fullStars !== 1 ? 'ren' : ''}`;
    }
  },

  // ============================================================================
  // TASTING NOTE OPERATIONS
  // ============================================================================
  saveTastingNote: async function(event) {
    event.preventDefault();
    
    if (!appState.currentWineId) {
      this.showToast('Geen wijn geselecteerd');
      return;
    }
    
    const formData = new FormData(event.target);
    
    const wijntype = formData.get('wijntype');
    const kleur = formData.get('kleur');
    const intensiteit = formData.get('intensiteit');
    const geurintensiteit = formData.get('geurintensiteit');
    const droog = formData.get('droog');
    const tannines = formData.get('tannines');
    const zuur = formData.get('zuur');
    const alcohol = formData.get('alcohol');
    const body = formData.get('body');
    const afdronk = formData.get('afdronk');
    
    if (!wijntype || !kleur || !intensiteit || !geurintensiteit || !droog || !tannines || !zuur || !alcohol || !body || !afdronk) {
      this.showToast('Vul alle verplichte velden in');
      return;
    }
    
    const { halfStars } = this.calculateAutoStars();
    
    const manualHalfStars = (formData.get('manual_star_1') ? 2 : 0) + 
                            (formData.get('manual_star_2') ? 2 : 0) + 
                            (formData.get('manual_star_3') ? 2 : 0);
    
    const manualStarReasons = [];
    if (formData.get('manual_star_1')) {
      const reason1 = document.getElementById('manualReason1')?.value?.trim() || '';
      if (!reason1) {
        this.showToast('Geef een reden op voor handmatige ster 1');
        document.getElementById('manualReason1')?.focus();
        return;
      }
      manualStarReasons.push(reason1);
    }
    if (formData.get('manual_star_2')) {
      const reason2 = document.getElementById('manualReason2')?.value?.trim() || '';
      if (!reason2) {
        this.showToast('Geef een reden op voor handmatige ster 2');
        document.getElementById('manualReason2')?.focus();
        return;
      }
      manualStarReasons.push(reason2);
    }
    if (formData.get('manual_star_3')) {
      const reason3 = document.getElementById('manualReason3')?.value?.trim() || '';
      if (!reason3) {
        this.showToast('Geef een reden op voor handmatige ster 3');
        document.getElementById('manualReason3')?.focus();
        return;
      }
      manualStarReasons.push(reason3);
    }
    
    const tastingData = {
      wine_id: appState.currentWineId,
      datum: document.getElementById('tastingDatum').value,
      wijntype: wijntype,
      kleur: kleur,
      intensiteit: intensiteit,
      geurintensiteit: geurintensiteit,
      geur_primair: formData.getAll('geur_primair'),
      geur_secundair: formData.getAll('geur_secundair'),
      geur_tertiair: formData.getAll('geur_tertiair'),
      droog: droog,
      tannines: tannines,
      zuur: zuur,
      alcohol: alcohol,
      body: body,
      afdronk: afdronk,
      automatic_stars: halfStars,
      manual_stars: manualHalfStars,
      manual_star_reasons: manualStarReasons,
      notities: document.getElementById('tastingNotities').value.trim()
    };

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    try {
      if (appState.currentTastingId) {
        const updatedTasting = await api.put(
          `${API_CONFIG.endpoints.tastingNotes}/${appState.currentTastingId}`,
          { ...tastingData, id: appState.currentTastingId }
        );
        
        const tastingIndex = appState.tastingNotes.findIndex(t => t.id === appState.currentTastingId);
        if (tastingIndex !== -1) {
          appState.tastingNotes[tastingIndex] = updatedTasting;
        }
        
        this.showToast('Proefnotitie bijgewerkt', 'success');
      } else {
        const newTasting = await api.post(API_CONFIG.endpoints.tastingNotes, tastingData);
        appState.tastingNotes.push(newTasting);
        this.showToast('Proefnotitie opgeslagen', 'success');
      }

      this.showWineDetail(appState.currentWineId);
      
    } catch (error) {
      console.error('Failed to save tasting note:', error);
      this.showToast(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  },

  deleteTastingNote: async function() {
    if (!appState.currentTastingId) {
      this.showToast('Geen proefnotitie geselecteerd');
      return;
    }
    
    const tasting = this.getTastingById(appState.currentTastingId);
    if (!tasting) {
      this.showToast('Proefnotitie niet gevonden');
      return;
    }
    
    if (confirm('Weet je zeker dat je deze proefnotitie wilt verwijderen?')) {
      showLoadingOverlay('Proefnotitie verwijderen...');
      
      try {
        await api.delete(`${API_CONFIG.endpoints.tastingNotes}/${appState.currentTastingId}`);
        
        appState.tastingNotes = appState.tastingNotes.filter(t => t.id !== appState.currentTastingId);
        this.showToast('Proefnotitie verwijderd', 'success');
        this.showWineDetail(tasting.wine_id);
        
      } catch (error) {
        console.error('Failed to delete tasting note:', error);
        this.showToast(error.message, 'error');
      } finally {
        hideLoadingOverlay();
      }
    }
  },

  backFromTastingForm: function() {
    if (appState.currentWineId) {
      this.showWineDetail(appState.currentWineId);
    } else {
      this.showCollection();
    }
  },

  backToWineDetail: function() {
    if (appState.currentWineId) {
      this.showWineDetail(appState.currentWineId);
    } else {
      this.showCollection();
    }
  },

  // ============================================================================
  // RENDERING FUNCTIONS
  // ============================================================================
  renderWines: function(filteredWines = null) {
    const wineGrid = document.getElementById('wineGrid');
    if (!wineGrid) return;
    
    const winesToRender = filteredWines || this.getFilteredWines();

    if (winesToRender.length === 0) {
      wineGrid.innerHTML = '<div class="empty-state">Geen wijnen gevonden</div>';
      return;
    }

    wineGrid.innerHTML = winesToRender.map(wine => {
      const status = this.getWineStatus(wine);
      const isOutOfStock = wine.aantal_flessen === 0;
      const cardClass = isOutOfStock ? 'wine-card wine-card--out-of-stock' : 'wine-card';
      const tastingCount = this.getTastingsForWine(wine.id).length;
      const kleurBadge = wine.kleur ? `<span class="kleur-badge kleur-badge--${wine.kleur.toLowerCase()}">${wine.kleur}</span>` : '';
      
      return `
        <div class="${cardClass}" onclick="app.showWineDetail(${wine.id})">
          <div class="wine-card-header">
            <h3>${wine.naam}</h3>
            ${isOutOfStock ? '<span class="stock-icon out-of-stock">📭</span>' : '<span class="stock-icon in-stock">🍷</span>'}
          </div>
          <p><strong>${wine.wijnhuis}</strong></p>
          <p>${wine.vintage} • ${wine.streek}</p>
          <p>${wine.druif}</p>
          <div class="wine-card-footer">
            ${kleurBadge}
            <span class="location-badge">${wine.locatie}</span>
            <span class="stock-badge ${isOutOfStock ? 'stock-badge--out' : 'stock-badge--in'}">
              ${wine.aantal_flessen} fles${wine.aantal_flessen !== 1 ? 'sen' : ''} • ${status}
            </span>
          </div>
          ${tastingCount > 0 ? `<p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-8);">📝 ${tastingCount} proefnotitie${tastingCount !== 1 ? 's' : ''}</p>` : ''}
        </div>
      `;
    }).join('');
  },

  renderWineDetail: function() {
    if (!appState.currentWineId) return;
    
    const wine = this.getWineById(appState.currentWineId);
    if (!wine) {
      this.showToast('Wijn niet gevonden');
      this.showCollection();
      return;
    }

    document.getElementById('wineDetailName').textContent = wine.naam;
    
    const status = this.getWineStatus(wine);
    const isOutOfStock = wine.aantal_flessen === 0;
    
    document.getElementById('wineDetailInfo').innerHTML = `
      <div class="bottle-count-section">
        <div class="bottle-count-display">
          <span class="bottle-icon">${isOutOfStock ? '📭' : '🍷'}</span>
          <div>
            <div class="bottle-count-number">${wine.aantal_flessen}</div>
            <div class="bottle-count-label">fles${wine.aantal_flessen !== 1 ? 'sen' : ''}</div>
          </div>
          <span class="status-badge ${isOutOfStock ? 'status-badge--out' : 'status-badge--in'}">
            ${status}
          </span>
        </div>
        <div class="bottle-count-controls">
          <button class="btn-bottle-control" onclick="app.updateBottleCount(-1)" ${isOutOfStock ? 'disabled' : ''}>−</button>
          <button class="btn btn--primary btn-drink" onclick="app.drinkBottle()" ${isOutOfStock ? 'disabled' : ''}>
            🍷 Drinken
          </button>
          <button class="btn-bottle-control" onclick="app.updateBottleCount(1)">+</button>
        </div>
      </div>
      <dl>
        ${wine.kleur ? `<dt>Kleur</dt><dd><span class="kleur-badge kleur-badge--${wine.kleur.toLowerCase()}">${wine.kleur}</span></dd>` : ''}
        <dt>Wijnhuis</dt>
        <dd>${wine.wijnhuis}</dd>
        <dt>Vintage</dt>
        <dd>${wine.vintage}</dd>
        <dt>Streek</dt>
        <dd>${wine.streek}</dd>
        <dt>Druif</dt>
        <dd>${wine.druif}</dd>
        <dt>Locatie</dt>
        <dd>${wine.locatie}</dd>
      </dl>
    `;

    this.renderTastingNotes();
  },

  renderTastingNotes: function() {
    const tastingNotesList = document.getElementById('tastingNotesList');
    if (!tastingNotesList || !appState.currentWineId) return;
    
    const notes = this.getTastingsForWine(appState.currentWineId);

    if (notes.length === 0) {
      tastingNotesList.innerHTML = '<div class="empty-state">Nog geen proefnotities. Klik op "+ Nieuwe Proefnotitie" om er een toe te voegen.</div>';
      return;
    }

    const sortedNotes = [...notes].sort((a, b) => new Date(b.datum) - new Date(a.datum));

    tastingNotesList.innerHTML = sortedNotes.map(note => {
      const autoStars = note.automatic_stars || 0;
      const manualStars = note.manual_stars || 0;
      const totalHalfStars = autoStars + manualStars;
      const starsDisplay = this.renderStars(totalHalfStars, true, autoStars);
      const date = new Date(note.datum).toLocaleDateString('nl-NL', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      return `
        <div class="tasting-note-card" onclick="app.showTastingDetail(${note.id})">
          <div class="date">${date}</div>
          <div class="stars">${starsDisplay} <small>(${this.formatStarCount(totalHalfStars)})</small></div>
          ${note.notities ? `<div class="excerpt">${note.notities.substring(0, 100)}${note.notities.length > 100 ? '...' : ''}</div>` : ''}
        </div>
      `;
    }).join('');
  },

  renderTastingDetail: function() {
    if (!appState.currentTastingId) return;
    
    const tasting = this.getTastingById(appState.currentTastingId);
    if (!tasting) {
      this.showToast('Proefnotitie niet gevonden');
      this.showWineDetail(appState.currentWineId);
      return;
    }

    const wine = this.getWineById(tasting.wine_id);
    if (!wine) {
      this.showToast('Wijn niet gevonden');
      this.showCollection();
      return;
    }

    const date = new Date(tasting.datum).toLocaleDateString('nl-NL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const autoStars = tasting.automatic_stars || 0;
    const manualStars = tasting.manual_stars || 0;
    const totalHalfStars = autoStars + manualStars;
    const starsDisplay = this.renderStars(totalHalfStars, true, autoStars);

    const droogLabels = ['Heel droog', 'Droog', 'Halfzoet', 'Zoet'];
    const tannineLabels = ['Niet aanwezig', 'Laag', 'Medium', 'Hoog'];
    const levelLabels = ['', 'Laag', 'Medium', 'Hoog'];

    document.getElementById('tastingDetailContent').innerHTML = `
      <div class="tasting-info-section">
        <h4>Wijn</h4>
        <p><strong>${wine.naam}</strong> - ${wine.wijnhuis} (${wine.vintage})</p>
        <p><strong>Datum:</strong> ${date}</p>
      </div>

      <div class="tasting-info-section" style="background: var(--color-bg-1); padding: var(--space-16); border-radius: var(--radius-base);">
        <h4>⭐ Beoordeling</h4>
        <p style="font-size: 2em; margin: var(--space-8) 0; line-height: 1.2;">${starsDisplay}</p>
        <p><strong>Totaal:</strong> ${this.formatStarCount(totalHalfStars)} (van max 5 sterren)</p>
        <p><strong>Automatisch:</strong> ${autoStars} halve ster${autoStars !== 1 ? 'ren' : ''} <span style="color: #FFD700;">★</span></p>
        ${manualStars > 0 ? `
          <p><strong>Handmatig:</strong> ${manualStars} halve ster${manualStars !== 1 ? 'ren' : ''} (${manualStars/2} hele ster${manualStars !== 2 ? 'ren' : ''}) <span style="color: var(--color-warning);">★</span></p>
          ${tasting.manual_star_reasons && tasting.manual_star_reasons.length > 0 ? `
            <div style="margin-top: var(--space-12);">
              <strong>Redenen handmatige sterren:</strong>
              <ul style="margin-top: var(--space-8); padding-left: var(--space-20);">
                ${tasting.manual_star_reasons.map((reason, i) => `<li>Ster ${i+1}: ${reason}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        ` : ''}
      </div>

      <div class="tasting-info-section">
        <h4>Kleur</h4>
        <p><strong>Type:</strong> ${tasting.wijntype}</p>
        <p><strong>Kleur:</strong> ${tasting.kleur}</p>
        <p><strong>Intensiteit:</strong> ${tasting.intensiteit}</p>
      </div>

      <div class="tasting-info-section">
        <h4>Geur</h4>
        <p><strong>Intensiteit:</strong> ${tasting.geurintensiteit || 'Niet opgegeven'}</p>
        ${tasting.geur_primair.length > 0 ? `
          <p><strong>Primair:</strong></p>
          <div class="tags">
            ${tasting.geur_primair.map(g => `<span class="tag">${g}</span>`).join('')}
          </div>
        ` : ''}
        ${tasting.geur_secundair.length > 0 ? `
          <p><strong>Secundair:</strong></p>
          <div class="tags">
            ${tasting.geur_secundair.map(g => `<span class="tag">${g}</span>`).join('')}
          </div>
        ` : ''}
        ${tasting.geur_tertiair.length > 0 ? `
          <p><strong>Tertiair:</strong></p>
          <div class="tags">
            ${tasting.geur_tertiair.map(g => `<span class="tag">${g}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <div class="tasting-info-section">
        <h4>Mouthfeel</h4>
        <p><strong>Droog:</strong> ${droogLabels[parseInt(tasting.droog)]}</p>
        <p><strong>Tannines:</strong> ${tannineLabels[parseInt(tasting.tannines)]}</p>
        <p><strong>Zuur:</strong> ${levelLabels[parseInt(tasting.zuur)]}</p>
        <p><strong>Alcohol:</strong> ${levelLabels[parseInt(tasting.alcohol)]}</p>
        <p><strong>Body:</strong> ${tasting.body}</p>
        <p><strong>Afdronk:</strong> ${tasting.afdronk}</p>
      </div>

      ${tasting.notities ? `
        <div class="tasting-info-section">
          <h4>Notities</h4>
          <p>${tasting.notities}</p>
        </div>
      ` : ''}
    `;
  },

  // ============================================================================
  // FORM HELPERS
  // ============================================================================
  updateColorOptions: function() {
    const selectedType = document.querySelector('input[name="wijntype"]:checked')?.value;
    const colorOptionsGroup = document.getElementById('colorOptionsGroup');
    const colorOptionsContainer = document.getElementById('colorOptions');

    if (selectedType && CONFIG.colorOptions[selectedType]) {
      colorOptionsGroup.style.display = 'block';
      const colors = CONFIG.colorOptions[selectedType];
      
      colorOptionsContainer.innerHTML = colors.map(color => `
        <label class="radio-label color-option">
          <input type="radio" name="kleur" value="${color}" required>
          <span>${CONFIG.colorEmojis[color] || '⚪'} ${color}</span>
        </label>
      `).join('');
    } else {
      colorOptionsGroup.style.display = 'none';
      colorOptionsContainer.innerHTML = '';
    }
  },

  populateTastingForm: function(tasting) {
    document.getElementById('tastingId').value = tasting.id;
    document.getElementById('tastingDatum').value = tasting.datum;
    document.getElementById('tastingWineId').value = tasting.wine_id;
    
    const wijntype = document.querySelector(`input[name="wijntype"][value="${tasting.wijntype}"]`);
    if (wijntype) {
      wijntype.checked = true;
      this.updateColorOptions();
    }
    
    setTimeout(() => {
      const kleur = document.querySelector(`input[name="kleur"][value="${tasting.kleur}"]`);
      if (kleur) kleur.checked = true;
    }, 50);
    
    const intensiteit = document.querySelector(`input[name="intensiteit"][value="${tasting.intensiteit}"]`);
    if (intensiteit) intensiteit.checked = true;
    
    if (tasting.geurintensiteit) {
      const geurintensiteit = document.querySelector(`input[name="geurintensiteit"][value="${tasting.geurintensiteit}"]`);
      if (geurintensiteit) geurintensiteit.checked = true;
    }
    
    if (tasting.geur_primair && tasting.geur_primair.length > 0) {
      tasting.geur_primair.forEach(g => {
        const checkbox = document.querySelector(`input[name="geur_primair"][value="${g}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
    if (tasting.geur_secundair && tasting.geur_secundair.length > 0) {
      tasting.geur_secundair.forEach(g => {
        const checkbox = document.querySelector(`input[name="geur_secundair"][value="${g}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
    if (tasting.geur_tertiair && tasting.geur_tertiair.length > 0) {
      tasting.geur_tertiair.forEach(g => {
        const checkbox = document.querySelector(`input[name="geur_tertiair"][value="${g}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
    
    const droog = document.querySelector(`input[name="droog"][value="${tasting.droog}"]`);
    if (droog) droog.checked = true;
    const tannines = document.querySelector(`input[name="tannines"][value="${tasting.tannines}"]`);
    if (tannines) tannines.checked = true;
    const zuur = document.querySelector(`input[name="zuur"][value="${tasting.zuur}"]`);
    if (zuur) zuur.checked = true;
    const alcohol = document.querySelector(`input[name="alcohol"][value="${tasting.alcohol}"]`);
    if (alcohol) alcohol.checked = true;
    const body = document.querySelector(`input[name="body"][value="${tasting.body}"]`);
    if (body) body.checked = true;
    const afdronk = document.querySelector(`input[name="afdronk"][value="${tasting.afdronk}"]`);
    if (afdronk) afdronk.checked = true;
    
    const manualStars = tasting.manual_stars || 0;
    const manual1Checkbox = document.querySelector('input[name="manual_star_1"]');
    const manual2Checkbox = document.querySelector('input[name="manual_star_2"]');
    const manual3Checkbox = document.querySelector('input[name="manual_star_3"]');
    
    if (manualStars >= 2 && manual1Checkbox) {
      manual1Checkbox.checked = true;
      if (tasting.manual_star_reasons && tasting.manual_star_reasons[0]) {
        document.getElementById('manualReason1').value = tasting.manual_star_reasons[0];
        document.getElementById('manualReason1Group').style.display = 'block';
      }
    }
    if (manualStars >= 4 && manual2Checkbox) {
      manual2Checkbox.checked = true;
      if (tasting.manual_star_reasons && tasting.manual_star_reasons[1]) {
        document.getElementById('manualReason2').value = tasting.manual_star_reasons[1];
        document.getElementById('manualReason2Group').style.display = 'block';
      }
    }
    if (manualStars >= 6 && manual3Checkbox) {
      manual3Checkbox.checked = true;
      if (tasting.manual_star_reasons && tasting.manual_star_reasons[2]) {
        document.getElementById('manualReason3').value = tasting.manual_star_reasons[2];
        document.getElementById('manualReason3Group').style.display = 'block';
      }
    }
    
    document.getElementById('tastingNotities').value = tasting.notities || '';
    
    setTimeout(() => {
      this.updateStarCalculation();
    }, 100);
  },

  // ============================================================================
  // FILTER & SEARCH
  // ============================================================================
  filterWines: function() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    let filtered = this.getFilteredWines();
    
    if (searchTerm) {
      filtered = filtered.filter(wine => {
        return wine.naam.toLowerCase().includes(searchTerm) ||
               wine.wijnhuis.toLowerCase().includes(searchTerm) ||
               wine.streek.toLowerCase().includes(searchTerm) ||
               wine.druif.toLowerCase().includes(searchTerm) ||
               wine.locatie.toLowerCase().includes(searchTerm) ||
               wine.vintage.toString().includes(searchTerm);
      });
    }

    this.renderWines(filtered);
  },

  // ============================================================================
  // TOAST NOTIFICATIONS
  // ============================================================================
  showToast: function(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show';
    if (type === 'success') {
      toast.classList.add('success');
    } else if (type === 'error') {
      toast.classList.add('error');
    }
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.className = 'toast';
      }, 300);
    }, 3000);
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
  app.init();
});
