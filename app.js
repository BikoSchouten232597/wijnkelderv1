// ============================================================================
// API CONFIGURATION
// ============================================================================
const API_CONFIG = {
  baseURL: 'http://localhost:3001',
  timeout: 5000,
  endpoints: {
    wines: '/wines',
    tastingNotes: '/tastingNotes',
    locations: '/locations'
  },
  debug: true // Enable detailed console logging
};

// Try to load saved API URL from memory (not localStorage due to sandbox)
if (window.savedApiUrl) {
  API_CONFIG.baseURL = window.savedApiUrl;
}

// Check for URL parameter
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('apiUrl')) {
  API_CONFIG.baseURL = urlParams.get('apiUrl');
  window.savedApiUrl = API_CONFIG.baseURL;
}

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
    if (appState.isOfflineMode) {
      return this.getOffline(endpoint);
    }
    
    const url = `${API_CONFIG.baseURL}${endpoint}`;
    if (API_CONFIG.debug) {
      console.log(`[API GET] Fetching: ${url}`);
    }
    
    try {
      const response = await this.fetchWithTimeout(url);
      
      if (API_CONFIG.debug) {
        console.log(`[API GET] Response status: ${response.status}`);
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          console.error(`[API GET] 404 Not Found: ${url}`);
          throw new Error(`Niet gevonden op ${url}`);
        }
        if (response.status >= 500) {
          console.error(`[API GET] Server error: ${response.status}`);
          throw new Error('Serverfout, probeer later opnieuw');
        }
        console.error(`[API GET] HTTP error: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (API_CONFIG.debug) {
        console.log(`[API GET] Success:`, data);
      }
      
      return data;
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.error(`[API GET] Network error for ${url}:`, error);
        throw new Error(`Kan geen verbinding maken met ${API_CONFIG.baseURL}. Controleer of JSON Server draait.`);
      }
      console.error(`[API GET] Error for ${url}:`, error);
      throw error;
    }
  },

  getOffline(endpoint) {
    console.log(`[API GET Offline] ${endpoint}`);
    if (endpoint.includes('/wines')) {
      if (endpoint.match(/\/wines\/\d+$/)) {
        const id = parseInt(endpoint.split('/').pop());
        return Promise.resolve(appState.wines.find(w => w.id === id));
      }
      return Promise.resolve(appState.wines);
    }
    if (endpoint.includes('/tastingNotes')) {
      if (endpoint.match(/\/tastingNotes\/\d+$/)) {
        const id = parseInt(endpoint.split('/').pop());
        return Promise.resolve(appState.tastingNotes.find(t => t.id === id));
      }
      return Promise.resolve(appState.tastingNotes);
    }
    if (endpoint.includes('/locations')) {
      if (endpoint.match(/\/locations\/\d+$/)) {
        const id = parseInt(endpoint.split('/').pop());
        return Promise.resolve(appState.locations.find(l => l.id === id));
      }
      return Promise.resolve(appState.locations);
    }
    if (endpoint.includes('/users')) {
      if (endpoint.match(/\/users\/\d+$/)) {
        const id = parseInt(endpoint.split('/').pop());
        return Promise.resolve(appState.users.find(u => u.id === id));
      }
      return Promise.resolve(appState.users);
    }
    return Promise.resolve([]);
  },

  async post(endpoint, data) {
    if (appState.isOfflineMode) {
      return this.postOffline(endpoint, data);
    }
    
    const url = `${API_CONFIG.baseURL}${endpoint}`;
    if (API_CONFIG.debug) {
      console.log(`[API POST] Posting to: ${url}`, data);
    }
    
    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (API_CONFIG.debug) {
        console.log(`[API POST] Response status: ${response.status}`);
      }
      
      if (!response.ok) {
        if (response.status >= 500) throw new Error('Serverfout, probeer later opnieuw');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (API_CONFIG.debug) {
        console.log(`[API POST] Success:`, result);
      }
      
      return result;
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.error(`[API POST] Network error for ${url}:`, error);
        throw new Error('Kan geen verbinding maken met database');
      }
      console.error(`[API POST] Error for ${url}:`, error);
      throw error;
    }
  },

  postOffline(endpoint, data) {
    console.log(`[API POST Offline] ${endpoint}`, data);
    const newData = deepCopy(data);
    if (endpoint.includes('/wines')) {
      appState.wines.push(newData);
      return Promise.resolve(newData);
    }
    if (endpoint.includes('/tastingNotes')) {
      appState.tastingNotes.push(newData);
      return Promise.resolve(newData);
    }
    if (endpoint.includes('/locations')) {
      appState.locations.push(newData);
      return Promise.resolve(newData);
    }
    if (endpoint.includes('/users')) {
      appState.users.push(newData);
      return Promise.resolve(newData);
    }
    return Promise.resolve(newData);
  },

  async put(endpoint, data) {
    if (appState.isOfflineMode) {
      return this.putOffline(endpoint, data);
    }
    
    const url = `${API_CONFIG.baseURL}${endpoint}`;
    if (API_CONFIG.debug) {
      console.log(`[API PUT] Updating: ${url}`, data);
    }
    
    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (API_CONFIG.debug) {
        console.log(`[API PUT] Response status: ${response.status}`);
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          console.error(`[API PUT] 404 Not Found: ${url}`);
          throw new Error(`Niet gevonden op ${url}`);
        }
        if (response.status >= 500) throw new Error('Serverfout, probeer later opnieuw');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (API_CONFIG.debug) {
        console.log(`[API PUT] Success:`, result);
      }
      
      return result;
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.error(`[API PUT] Network error for ${url}:`, error);
        throw new Error('Kan geen verbinding maken met database');
      }
      console.error(`[API PUT] Error for ${url}:`, error);
      throw error;
    }
  },

  putOffline(endpoint, data) {
    console.log(`[API PUT Offline] ${endpoint}`, data);
    const updatedData = deepCopy(data);
    if (endpoint.includes('/wines/')) {
      const id = parseInt(endpoint.split('/').pop());
      const index = appState.wines.findIndex(w => w.id === id);
      if (index !== -1) {
        appState.wines[index] = updatedData;
      }
      return Promise.resolve(updatedData);
    }
    if (endpoint.includes('/tastingNotes/')) {
      const id = parseInt(endpoint.split('/').pop());
      const index = appState.tastingNotes.findIndex(t => t.id === id);
      if (index !== -1) {
        appState.tastingNotes[index] = updatedData;
      }
      return Promise.resolve(updatedData);
    }
    if (endpoint.includes('/locations/')) {
      const id = parseInt(endpoint.split('/').pop());
      const index = appState.locations.findIndex(l => l.id === id);
      if (index !== -1) {
        appState.locations[index] = updatedData;
      }
      return Promise.resolve(updatedData);
    }
    if (endpoint.includes('/users/')) {
      const id = parseInt(endpoint.split('/').pop());
      const index = appState.users.findIndex(u => u.id === id);
      if (index !== -1) {
        appState.users[index] = updatedData;
      }
      return Promise.resolve(updatedData);
    }
    return Promise.resolve(updatedData);
  },

  async delete(endpoint) {
    if (appState.isOfflineMode) {
      return this.deleteOffline(endpoint);
    }
    
    const url = `${API_CONFIG.baseURL}${endpoint}`;
    if (API_CONFIG.debug) {
      console.log(`[API DELETE] Deleting: ${url}`);
    }
    
    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'DELETE'
      });
      
      if (API_CONFIG.debug) {
        console.log(`[API DELETE] Response status: ${response.status}`);
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          console.error(`[API DELETE] 404 Not Found: ${url}`);
          throw new Error('Niet gevonden');
        }
        if (response.status >= 500) throw new Error('Serverfout, probeer later opnieuw');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (API_CONFIG.debug) {
        console.log(`[API DELETE] Success`);
      }
      
      return true;
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.error(`[API DELETE] Network error for ${url}:`, error);
        throw new Error('Kan geen verbinding maken met database');
      }
      console.error(`[API DELETE] Error for ${url}:`, error);
      throw error;
    }
  },

  deleteOffline(endpoint) {
    console.log(`[API DELETE Offline] ${endpoint}`);
    if (endpoint.includes('/wines/')) {
      const id = parseInt(endpoint.split('/').pop());
      appState.wines = appState.wines.filter(w => w.id !== id);
      return Promise.resolve(true);
    }
    if (endpoint.includes('/tastingNotes/')) {
      const id = parseInt(endpoint.split('/').pop());
      appState.tastingNotes = appState.tastingNotes.filter(t => t.id !== id);
      return Promise.resolve(true);
    }
    if (endpoint.includes('/locations/')) {
      const id = parseInt(endpoint.split('/').pop());
      appState.locations = appState.locations.filter(l => l.id !== id);
      return Promise.resolve(true);
    }
    if (endpoint.includes('/users/')) {
      const id = parseInt(endpoint.split('/').pop());
      appState.users = appState.users.filter(u => u.id !== id);
      return Promise.resolve(true);
    }
    return Promise.resolve(true);
  }
};

// ============================================================================
// NO PASSWORD SYSTEM - Simple user selection
// ============================================================================

// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================
const appState = {
  wines: [],
  tastingNotes: [],
  locations: [],
  users: [],
  activities: [],
  comments: [],
  currentUserId: null,
  isLoggedIn: false,
  isLoading: false,
  isConnected: false,
  isOfflineMode: false,
  currentView: 'collection',
  currentWineId: null,
  currentTastingId: null,
  editingWineId: null,
  currentStockFilter: 'all',
  currentUserFilter: 'all', // 'all' or 'mine'
  showOnlyMyWines: false,
  viewHistory: [],
  currentPhotoBase64: null // Temporary storage for photo during form editing
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
    
    // Show API URL
    const apiUrlDisplay = statusEl.querySelector('.api-url-display');
    if (apiUrlDisplay) {
      const url = new URL(API_CONFIG.baseURL);
      apiUrlDisplay.textContent = `(${url.host})`;
    }
  }
  
  console.log(`[Connection Status] ${connected ? 'Connected' : 'Disconnected'} to ${API_CONFIG.baseURL}`);
}

// Helper: Deep copy object
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================================
// DUMMY DATA GENERATION (for offline mode)
// ============================================================================
function generateDummyData() {
  // Note: Passwords will be added by loadDummyData function
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  
  return {
    locations: [
      { id: 1, name: "Kelder", temperature: 12, user_id: 1 },
      { id: 2, name: "Klimaatkast", temperature: 18, user_id: 1 },
      { id: 3, name: "Wijnkast", temperature: 16, user_id: 2 },
      { id: 4, name: "Garage", temperature: 14, user_id: 2 }
    ],
    users: [
      { id: 1, name: "Demo Gebruiker", email: "demo@example.com", color: "#e74c3c", role: "admin" },
      { id: 2, name: "Partner", email: "partner@example.com", color: "#3498db", role: "user" }
    ],
    wines: [
      { id: 1001, user_id: 1, naam: "Reserva", wijnhuis: "Marqués de Riscal", vintage: 2018, streek: "Rioja", druif: "Tempranillo", kleur: "Rood", locatie: "Kelder", aantal_flessen: 3, price_per_bottle: 25.50 },
      { id: 1002, user_id: 1, naam: "Chablis", wijnhuis: "William Fèvre", vintage: 2020, streek: "Bourgogne", druif: "Chardonnay", kleur: "Wit", locatie: "Klimaatkast", aantal_flessen: 2, price_per_bottle: 32.00 },
      { id: 1003, user_id: 2, naam: "Chianti Classico", wijnhuis: "Antinori", vintage: 2019, streek: "Toscane", druif: "Sangiovese", kleur: "Rood", locatie: "Kelder", aantal_flessen: 4, price_per_bottle: 18.50 },
      { id: 1004, user_id: 1, naam: "Prosecco", wijnhuis: "Bisol", vintage: 2022, streek: "Veneto", druif: "Glera", kleur: "Wit", locatie: "Wijnkast", aantal_flessen: 6, price_per_bottle: 12.00 },
      { id: 1005, user_id: 2, naam: "Barolo", wijnhuis: "Pio Cesare", vintage: 2017, streek: "Piemonte", druif: "Nebbiolo", kleur: "Rood", locatie: "Kelder", aantal_flessen: 2, price_per_bottle: 55.00 },
      { id: 1006, user_id: 1, naam: "Sancerre", wijnhuis: "Pascal Jolivet", vintage: 2021, streek: "Loire", druif: "Sauvignon Blanc", kleur: "Wit", locatie: "Klimaatkast", aantal_flessen: 3, price_per_bottle: 22.00 },
      { id: 1007, user_id: 2, naam: "Rosé de Provence", wijnhuis: "Château d'Esclans", vintage: 2022, streek: "Provence", druif: "Grenache", kleur: "Rosé", locatie: "Wijnkast", aantal_flessen: 4, price_per_bottle: 15.00 },
      { id: 1008, user_id: 1, naam: "Amarone", wijnhuis: "Allegrini", vintage: 2016, streek: "Veneto", druif: "Corvina", kleur: "Rood", locatie: "Kelder", aantal_flessen: 1, price_per_bottle: 68.00 },
      { id: 1009, user_id: 2, naam: "Riesling", wijnhuis: "Dr. Loosen", vintage: 2020, streek: "Moezel", druif: "Riesling", kleur: "Wit", locatie: "Klimaatkast", aantal_flessen: 3, price_per_bottle: 19.50 },
      { id: 1010, user_id: 1, naam: "Malbec Reserve", wijnhuis: "Catena Zapata", vintage: 2019, streek: "Mendoza", druif: "Malbec", kleur: "Rood", locatie: "Garage", aantal_flessen: 2, price_per_bottle: 28.00 },
      { id: 1011, user_id: 2, naam: "Pinot Grigio", wijnhuis: "Livio Felluga", vintage: 2022, streek: "Friuli", druif: "Pinot Grigio", kleur: "Wit", locatie: "Wijnkast", aantal_flessen: 5, price_per_bottle: 14.00 },
      { id: 1012, user_id: 1, naam: "Châteauneuf-du-Pape", wijnhuis: "Domaine du Vieux Télégraphe", vintage: 2018, streek: "Rhône", druif: "Grenache Blend", kleur: "Rood", locatie: "Kelder", aantal_flessen: 2, price_per_bottle: 45.00 }
    ],
    tastingNotes: [
      { id: 2001, wine_id: 1001, user_id: 1, datum: "2024-10-15", wijntype: "Rood", kleur: "Robijn", intensiteit: "Hoog", geurintensiteit: "Hoog", geur_primair: ["Donker fruit", "Kruiden"], geur_secundair: ["Houtrijping"], geur_tertiair: [], droog: "0", tannines: "2", zuur: "2", alcohol: "2", body: "Medium", afdronk: "Hoog", automatic_stars: 4, manual_stars: 0, manual_star_reasons: [], notities: "Mooie balans, goede structuur" },
      { id: 2002, wine_id: 1002, user_id: 1, datum: "2024-09-20", wijntype: "Wit", kleur: "Stro geel", intensiteit: "Medium", geurintensiteit: "Medium", geur_primair: ["Citrus", "Steenfruit"], geur_secundair: [], geur_tertiair: [], droog: "0", tannines: "0", zuur: "3", alcohol: "2", body: "Medium", afdronk: "Medium", automatic_stars: 2, manual_stars: 0, manual_star_reasons: [], notities: "Frisse Chablis met mooie mineraliteit" },
      { id: 2003, wine_id: 1005, user_id: 2, datum: "2024-11-01", wijntype: "Rood", kleur: "Granaat rood", intensiteit: "Hoog", geurintensiteit: "Hoog", geur_primair: ["Rood fruit", "Donker fruit", "Bloemen"], geur_secundair: ["Houtrijping"], geur_tertiair: ["Evolutie (chocolade, paddestoel, etc.)"], droog: "0", tannines: "3", zuur: "3", alcohol: "3", body: "Hoog", afdronk: "Hoog", automatic_stars: 4, manual_stars: 2, manual_star_reasons: ["Uitzonderlijke complexiteit"], notities: "Prachtige Barolo, lang bewaren" },
      { id: 2004, wine_id: 1008, user_id: 1, datum: "2024-10-28", wijntype: "Rood", kleur: "Granaat rood", intensiteit: "Hoog", geurintensiteit: "Hoog", geur_primair: ["Donker fruit"], geur_secundair: ["Houtrijping"], geur_tertiair: ["Evolutie (chocolade, paddestoel, etc.)"], droog: "1", tannines: "3", zuur: "2", alcohol: "3", body: "Hoog", afdronk: "Hoog", automatic_stars: 4, manual_stars: 4, manual_star_reasons: ["Perfecte balans", "Unieke complexiteit"], notities: "Geweldige Amarone, zeer krachtig" }
    ],
    activities: [
      { id: 5001, user_id: 1, action_type: "wine_added", wine_id: 1001, wine_name: "Reserva", description: "Demo Gebruiker voegde \"Reserva\" toe", timestamp: threeDaysAgo.toISOString(), likes: 2, liked_by: [1, 2] },
      { id: 5002, user_id: 2, action_type: "wine_added", wine_id: 1005, wine_name: "Barolo", description: "Partner voegde \"Barolo\" toe", timestamp: twoDaysAgo.toISOString(), likes: 1, liked_by: [1] },
      { id: 5003, user_id: 1, action_type: "tasting_note_added", wine_id: 1002, wine_name: "Chablis", description: "Demo Gebruiker proefde \"Chablis\" - ⭐", timestamp: yesterday.toISOString(), likes: 0, liked_by: [] },
      { id: 5004, user_id: 2, action_type: "tasting_note_added", wine_id: 1005, wine_name: "Barolo", description: "Partner proefde \"Barolo\" - ⭐⭐⭐", timestamp: yesterday.toISOString(), likes: 3, liked_by: [1, 2] },
      { id: 5005, user_id: 1, action_type: "location_added", wine_id: null, wine_name: "Klimaatkast", description: "Demo Gebruiker voegde locatie \"Klimaatkast\" toe", timestamp: now.toISOString(), likes: 0, liked_by: [] }
    ],
    comments: [
      { id: 6001, activity_id: 5001, user_id: 2, text: "Mooie wijn! Ik heb deze ook in mijn kelder.", timestamp: twoDaysAgo.toISOString() },
      { id: 6002, activity_id: 5002, user_id: 1, text: "Geweldige keuze! Barolo is altijd goed.", timestamp: twoDaysAgo.toISOString() },
      { id: 6003, activity_id: 5004, user_id: 1, text: "Dat klinkt fantastisch! Ik moet deze ook proberen.", timestamp: yesterday.toISOString() }
    ]
  };
}

// ============================================================================
// ID GENERATION
// ============================================================================
/**
 * Generate next wine ID based on highest existing ID + 1
 * @param {Array} wines - Array of wine objects
 * @returns {number} Next wine ID
 */
function getNextWineId(wines) {
  if (!wines || wines.length === 0) {
    const startId = 1000;
    console.log('[getNextWineId] No wines exist, starting at:', startId);
    return startId;  // Start at 1000 if no wines exist
  }
  
  // Convert all IDs to numbers and find max
  const ids = wines.map(wine => {
    const id = parseInt(wine.id);
    return isNaN(id) ? 0 : id;
  });
  
  const maxId = Math.max(...ids);
  const nextId = maxId + 1;
  
  console.log(`[getNextWineId] Generated new wine ID: ${nextId} (next after max: ${maxId})`);
  console.log(`[getNextWineId] Existing wine IDs:`, ids);
  
  return nextId;
}

/**
 * Generate next tasting note ID based on highest existing ID + 1
 * @param {Array} tastingNotes - Array of tasting note objects
 * @returns {number} Next tasting note ID
 */
function getNextTastingNoteId(tastingNotes) {
  if (!tastingNotes || tastingNotes.length === 0) {
    const startId = 2000;
    console.log('[getNextTastingNoteId] No tasting notes exist, starting at:', startId);
    return startId;  // Start at 2000 if no notes exist
  }
  
  // Convert all IDs to numbers and find max
  const ids = tastingNotes.map(note => {
    const id = parseInt(note.id);
    return isNaN(id) ? 0 : id;
  });
  
  const maxId = Math.max(...ids);
  const nextId = maxId + 1;
  
  console.log(`[getNextTastingNoteId] Generated new tasting note ID: ${nextId} (next after max: ${maxId})`);
  console.log(`[getNextTastingNoteId] Existing tasting note IDs:`, ids);
  
  return nextId;
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
    
    // Show login form on startup
    setTimeout(() => {
      if (!appState.isLoggedIn) {
        this.showLoginForm();
      }
    }, 500);
  },

  async loadDataFromAPI() {
    showLoadingOverlay('Laden van gegevens...');
    
    console.log(`[loadDataFromAPI] Starting data load from ${API_CONFIG.baseURL}`);
    
    try {
      const [wines, tastingNotes, locations, users, activities, comments] = await Promise.all([
        api.get(API_CONFIG.endpoints.wines),
        api.get(API_CONFIG.endpoints.tastingNotes),
        api.get(API_CONFIG.endpoints.locations).catch(() => []),
        api.get('/users').catch(() => []),
        api.get('/activities').catch(() => []),
        api.get('/comments').catch(() => [])
      ]);
      
      // Ensure all IDs are stored as numbers
      appState.wines = (wines || []).map(w => ({
        ...w,
        id: typeof w.id === 'string' ? parseInt(w.id, 10) : w.id
      }));
      appState.tastingNotes = (tastingNotes || []).map(t => ({
        ...t,
        id: typeof t.id === 'string' ? parseInt(t.id, 10) : t.id,
        wine_id: typeof t.wine_id === 'string' ? parseInt(t.wine_id, 10) : t.wine_id
      }));
      appState.locations = (locations || []).map(l => ({
        ...l,
        id: typeof l.id === 'string' ? parseInt(l.id, 10) : l.id
      }));
      appState.users = (users || []).map(u => ({
        ...u,
        id: typeof u.id === 'string' ? parseInt(u.id, 10) : u.id,
        role: u.role || 'user'
      }));
      appState.activities = (activities || []).map(a => ({
        ...a,
        id: typeof a.id === 'string' ? parseInt(a.id, 10) : a.id
      }));
      appState.comments = (comments || []).map(c => ({
        ...c,
        id: typeof c.id === 'string' ? parseInt(c.id, 10) : c.id
      }));
      
      console.log(`[loadDataFromAPI] ✓ Loaded ${appState.activities.length} activities from database`);
      if (appState.activities.length > 0) {
        console.log(`[loadDataFromAPI] Latest activity:`, appState.activities[0]);
      }
      console.log(`[loadDataFromAPI] ✓ Loaded ${appState.comments.length} comments from database`);
      
      // Ensure default user exists
      if (appState.users.length === 0) {
        const defaultUser = { id: 1, name: "Hoofd", email: "admin@email.nl", color: "#e74c3c", role: "admin" };
        try {
          const newUser = await api.post('/users', defaultUser);
          appState.users.push(newUser);
        } catch (err) {
          console.warn('Could not create default user:', err);
          appState.users.push(defaultUser);
        }
      }
      
      // Don't auto-select user - require login
      appState.isLoggedIn = false;
      appState.currentUserId = null;
      
      console.log(`[loadDataFromAPI] Loaded ${appState.wines.length} wines, ${appState.tastingNotes.length} tasting notes, ${appState.locations.length} locations, ${appState.users.length} users`);
      console.log(`[loadDataFromAPI] Wine IDs:`, appState.wines.map(w => w.id));
      
      updateConnectionStatus(true);
      appState.isOfflineMode = false;
      // Show user selector instead of login
      this.showUserSelector();
      
    } catch (error) {
      console.error('[loadDataFromAPI] Failed to load data:', error);
      updateConnectionStatus(false);
      
      // Show offline mode modal
      this.showOfflineModal();
      
      this.showToast(error.message, 'error');
    } finally {
      hideLoadingOverlay();
    }
  },

  showOfflineModal: function() {
    const modal = document.getElementById('offlineModeModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  },

  retryConnection: function() {
    const modal = document.getElementById('offlineModeModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.loadDataFromAPI();
  },

  loadDummyData: function() {
    const modal = document.getElementById('offlineModeModal');
    if (modal) {
      modal.style.display = 'none';
    }
    
    const dummyData = generateDummyData();
    
    appState.wines = dummyData.wines;
    appState.tastingNotes = dummyData.tastingNotes;
    appState.locations = dummyData.locations;
    appState.users = dummyData.users;
    appState.activities = dummyData.activities || [];
    appState.comments = dummyData.comments || [];
    
    console.log(`[loadDummyData] Loaded ${appState.activities.length} example activities`);
    console.log(`[loadDummyData] Loaded ${appState.comments.length} example comments`);
    appState.isOfflineMode = true;
    appState.isLoggedIn = false;
    appState.currentUserId = null;
    
    updateConnectionStatus(false);
    
    // Show offline indicator
    this.showOfflineIndicator();
    
    // Show user selector
    this.showUserSelector();
    this.showToast('Voorbeeldgegevens geladen', 'success');
  },

  showOfflineIndicator: function() {
    let indicator = document.getElementById('offlineIndicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offlineIndicator';
      indicator.className = 'offline-indicator';
      indicator.innerHTML = 'ℹ️ Werkt met voorbeeldgegevens';
      document.body.appendChild(indicator);
    }
  },

  hideOfflineIndicator: function() {
    const indicator = document.getElementById('offlineIndicator');
    if (indicator) {
      indicator.remove();
    }
  },

  updateCurrentUserDisplay: function() {
    const currentUser = appState.users.find(u => u.id === appState.currentUserId);
    const userNameEl = document.getElementById('currentUserName');
    const userBadgeEl = document.getElementById('currentUserBadge');
    if (currentUser && userNameEl && userBadgeEl) {
      userNameEl.textContent = currentUser.name;
      userBadgeEl.style.borderColor = currentUser.color;
      userBadgeEl.title = 'Klik om uit te loggen';
    }
  },

  showUserSelector: function() {
    const modal = document.getElementById('userSelectorModal');
    if (!modal) return;
    
    const listContainer = document.getElementById('userSelectorList');
    if (!listContainer) return;
    
    if (appState.users.length === 0) {
      listContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">Geen gebruikers beschikbaar</p>';
      modal.style.display = 'flex';
      return;
    }
    
    listContainer.innerHTML = appState.users.map(user => `
      <div class="user-selector-item" onclick="app.selectUser(${user.id})">
        <div class="user-color-dot" style="background: ${user.color};"></div>
        <div class="user-selector-info">
          <strong>${user.name}</strong>
          <small>${user.email || 'Geen email'}</small>
        </div>
      </div>
    `).join('');
    
    modal.style.display = 'flex';
  },

  selectUser: function(userId) {
    const user = appState.users.find(u => u.id === userId);
    if (!user) {
      this.showToast('Gebruiker niet gevonden', 'error');
      return;
    }
    
    appState.currentUserId = userId;
    appState.isLoggedIn = true;
    this.updateCurrentUserDisplay();
    
    const modal = document.getElementById('userSelectorModal');
    if (modal) modal.style.display = 'none';
    
    this.showCollection();
    this.showToast(`Welkom, ${user.name}!`, 'success');
  },

  switchUser: function() {
    if (confirm('Weet je zeker dat je van gebruiker wilt wisselen?')) {
      appState.currentUserId = null;
      appState.isLoggedIn = false;
      this.showUserSelector();
    }
  },



  getNextUserId: function() {
    if (appState.users.length === 0) return 1;
    const maxId = Math.max(...appState.users.map(u => u.id));
    return maxId + 1;
  },

  oldShowOfflineError: function() {
    // Keep old error display for reference
    const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--color-surface); padding: var(--space-32); border-radius: var(--radius-lg); border: 2px solid var(--color-error); box-shadow: var(--shadow-lg); max-width: 500px; z-index: 10000; text-align: center;';
      // This is the old error display code - now replaced by modal
  },

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  isAdmin: function(userId) {
    const user = appState.users.find(u => u.id === (userId || appState.currentUserId));
    return user && user.role === 'admin';
  },

  canEditWine: function(wineId) {
    const wine = this.getWineById(wineId);
    return wine && wine.user_id === appState.currentUserId;
  },

  getWineStatus: function(wine) {
    return wine.aantal_flessen > 0 ? 'In voorraad' : 'Uit voorraad';
  },

  getFilteredWines: function() {
    let filtered = [...appState.wines];
    
    // Always filter by current user for "Mijn Kelder" view (unless viewing another user)
    if (appState.currentView === 'collection' && appState.currentUserId) {
      filtered = filtered.filter(w => w.user_id === appState.currentUserId);
    }
    
    // Additional filter if "Alleen mijn wijnen" checkbox is enabled
    if (appState.showOnlyMyWines && appState.currentUserId) {
      filtered = filtered.filter(w => w.user_id === appState.currentUserId);
    }
    
    // Filter by stock status
    if (appState.currentStockFilter === 'in_stock') {
      filtered = filtered.filter(w => w.aantal_flessen > 0);
    } else if (appState.currentStockFilter === 'out_of_stock') {
      filtered = filtered.filter(w => w.aantal_flessen === 0);
    }
    
    return filtered;
  },

  toggleMyWinesFilter: function() {
    const checkbox = document.getElementById('myWinesFilter');
    if (checkbox) {
      appState.showOnlyMyWines = checkbox.checked;
      console.log(`[toggleMyWinesFilter] Show only my wines: ${appState.showOnlyMyWines}`);
      this.filterWines();
    }
  },

  getUserName: function(userId) {
    const user = appState.users.find(u => u.id === userId);
    return user ? user.name : "Onbekend";
  },

  getWineById: function(id) {
    // Ensure ID is a number for comparison
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (API_CONFIG.debug) {
      console.log(`[getWineById] Looking for wine with ID: ${numericId} (original: ${id}, type: ${typeof id})`);
      console.log(`[getWineById] Available wine IDs:`, appState.wines.map(w => `${w.id} (${typeof w.id})`));
    }
    
    const wine = appState.wines.find(w => {
      // Compare as numbers to handle string/number mismatch
      const wineId = typeof w.id === 'string' ? parseInt(w.id, 10) : w.id;
      return wineId === numericId;
    });
    
    if (API_CONFIG.debug) {
      if (wine) {
        console.log(`[getWineById] Found wine:`, wine);
      } else {
        console.warn(`[getWineById] Wine not found with ID: ${numericId}`);
      }
    }
    
    return wine;
  },

  getTastingById: function(id) {
    return appState.tastingNotes.find(t => t.id === id);
  },

  getTastingsForWine: function(wineId) {
    return appState.tastingNotes.filter(t => t.wine_id === wineId);
  },

  getTimeAgo: function(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Zojuist';
    if (diffMins < 60) return `${diffMins} min geleden`;
    if (diffHours < 24) return `${diffHours} uur geleden`;
    if (diffDays === 1) return 'Gisteren';
    if (diffDays < 7) return `${diffDays} dagen geleden`;
    return past.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  getNextActivityId: function() {
    if (appState.activities.length === 0) return 5000;
    const maxId = Math.max(...appState.activities.map(a => a.id));
    return maxId + 1;
  },

  getNextCommentId: function() {
    if (appState.comments.length === 0) return 6000;
    const maxId = Math.max(...appState.comments.map(c => c.id));
    return maxId + 1;
  },

  logActivity: async function(actionType, wineId = null, wineName = null, description = null) {
    const activityId = this.getNextActivityId();
    const activity = {
      id: activityId,
      user_id: appState.currentUserId,
      action_type: actionType,
      wine_id: wineId,
      wine_name: wineName,
      description: description || this.getActivityDescription(actionType, wineName),
      timestamp: new Date().toISOString(),
      likes: 0,
      liked_by: []
    };
    
    try {
      console.log(`[logActivity] Creating activity: ${actionType} (ID: ${activityId})`);
      const newActivity = await api.post('/activities', activity);
      appState.activities.unshift(newActivity);
      console.log(`[logActivity] ✓ Activity saved to database: ${actionType}`);
    } catch (error) {
      console.error(`[logActivity] ✗ Failed to save activity to database:`, error);
      console.warn(`[logActivity] Activity will NOT persist after refresh!`);
      // Still add to local state for current session
      appState.activities.unshift(activity);
      // Show warning to user if not in offline mode
      if (!appState.isOfflineMode) {
        this.showToast('Waarschuwing: Activiteit niet opgeslagen in database', 'error');
      }
    }
  },

  getActivityDescription: function(actionType, wineName) {
    const user = appState.users.find(u => u.id === appState.currentUserId);
    const userName = user ? user.name : 'Gebruiker';
    
    switch (actionType) {
      case 'wine_added': return `${userName} voegde "${wineName}" toe`;
      case 'wine_deleted': return `${userName} verwijderde "${wineName}"`;
      case 'wine_edited': return `${userName} wijzigde "${wineName}"`;
      case 'wine_consumed': return `${userName} dronk "${wineName}"`;
      case 'tasting_note_added': return `${userName} proefde "${wineName}"`;
      case 'tasting_note_edited': return `${userName} wijzigde proefnotitie van "${wineName}"`;
      case 'location_added': return `${userName} voegde locatie "${wineName}" toe`;
      default: return `${userName} voerde een actie uit`;
    }
  },

  // ============================================================================
  // VIEW MANAGEMENT
  // ============================================================================
  showCollection: function() {
    // Check if user is selected
    if (!appState.isLoggedIn || !appState.currentUserId) {
      this.showUserSelector();
      return;
    }
    
    appState.currentView = 'collection';
    appState.currentWineId = null;
    appState.currentTastingId = null;
    appState.editingWineId = null; // Clear edit state when returning to collection
    console.log(`[showCollection] Cleared editingWineId - back to collection view`);
    this.hideAllViews();
    this.updateNavigation('collection');
    document.getElementById('collectionView').style.display = 'block';
    
    // Reset search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = '';
    }
    
    // Restore "Mijn wijnen" filter state
    const myWinesCheckbox = document.getElementById('myWinesFilter');
    if (myWinesCheckbox) {
      myWinesCheckbox.checked = appState.showOnlyMyWines;
    }
    
    this.renderWines();
  },

  updateNavigation: function(activeView) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-view') === activeView) {
        item.classList.add('active');
      }
    });
  },

  showWineForm: function(wineId = null) {
    appState.currentView = 'wineForm';
    this.hideAllViews();
    document.getElementById('wineFormView').style.display = 'block';
    
    // Load locations into dropdown
    this.loadLocationsIntoDropdown();
    
    // Setup photo upload handler
    const photoInput = document.getElementById('winePhoto');
    if (photoInput) {
      photoInput.onchange = (e) => this.handlePhotoUpload(e);
    }
    
    if (wineId) {
      // EDIT MODE: Set editing ID to trigger PUT request on save
      appState.editingWineId = wineId;
      console.log(`[showWineForm] EDIT MODE - editingWineId set to: ${wineId}`);
      console.log(`[showWineForm] Save will use PUT /wines/${wineId}`);
      const wine = this.getWineById(wineId);
      if (!wine) {
        this.showToast('Wijn niet gevonden');
        this.showCollection();
        return;
      }
      document.getElementById('wineFormTitle').textContent = 'Wijn Bewerken';
      // Pre-fill form with wine data
      document.getElementById('wineId').value = wine.id;
      document.getElementById('wineNaam').value = wine.naam || '';
      document.getElementById('wineWijnhuis').value = wine.wijnhuis || '';
      document.getElementById('wineVintage').value = wine.vintage || '';
      document.getElementById('wineStreek').value = wine.streek || '';
      document.getElementById('wineDruif').value = wine.druif || '';
      document.getElementById('wineKleur').value = wine.kleur || '';
      document.getElementById('wineAantalFlessen').value = wine.aantal_flessen || 1;
      document.getElementById('winePrijs').value = wine.price_per_bottle || '';
      
      // Show existing photo if available
      if (wine.photo_base64) {
        appState.currentPhotoBase64 = wine.photo_base64;
        this.showPhotoPreview(wine.photo_base64);
      } else {
        this.removePhoto();
      }
      
      // Set location after dropdown is loaded
      setTimeout(() => {
        const locatieSelect = document.getElementById('wineLocatie');
        if (locatieSelect && wine.locatie) {
          locatieSelect.value = wine.locatie;
        }
      }, 100);
    } else {
      // CREATE MODE: Clear editing ID to trigger POST request on save
      appState.editingWineId = null;
      console.log(`[showWineForm] CREATE MODE - editingWineId cleared`);
      console.log(`[showWineForm] Save will use POST /wines`);
      document.getElementById('wineFormTitle').textContent = 'Nieuwe Wijn';
      document.getElementById('wineForm').reset();
      document.getElementById('wineId').value = '';
      document.getElementById('wineAantalFlessen').value = 1;
      appState.currentPhotoBase64 = null;
      this.removePhoto();
    }
  },

  loadLocationsIntoDropdown: function() {
    const locatieSelect = document.getElementById('wineLocatie');
    if (!locatieSelect) return;
    
    const currentValue = locatieSelect.value;
    
    // Clear existing options except the first placeholder
    locatieSelect.innerHTML = '<option value="">Selecteer locatie</option>';
    
    // Filter locations by current user
    const userLocations = appState.locations.filter(l => l.user_id === appState.currentUserId);
    
    // Add locations from state
    userLocations.forEach(location => {
      const option = document.createElement('option');
      option.value = location.name;
      option.textContent = location.name;
      locatieSelect.appendChild(option);
    });
    
    // Restore previously selected value if it exists
    if (currentValue && Array.from(locatieSelect.options).some(opt => opt.value === currentValue)) {
      locatieSelect.value = currentValue;
    }
  },

  showWineDetail: async function(wineId) {
    // Normalize ID to number
    const numericId = typeof wineId === 'string' ? parseInt(wineId, 10) : wineId;
    
    console.log(`[showWineDetail] Requested wine ID: ${numericId} (original: ${wineId})`);
    
    appState.currentView = 'wineDetail';
    appState.currentWineId = numericId;
    appState.currentTastingId = null;
    this.hideAllViews();
    document.getElementById('wineDetailView').style.display = 'block';
    
    // First try to find wine in local state
    let wine = this.getWineById(numericId);
    
    // If not found locally, try to fetch from API as fallback
    if (!wine) {
      console.warn(`[showWineDetail] Wine ID ${numericId} not found in local state, trying API fallback...`);
      
      try {
        showLoadingOverlay('Wijn laden...');
        const fetchedWine = await api.get(`${API_CONFIG.endpoints.wines}/${numericId}`);
        
        if (fetchedWine) {
          console.log(`[showWineDetail] Successfully fetched wine from API:`, fetchedWine);
          
          // Normalize the ID
          fetchedWine.id = typeof fetchedWine.id === 'string' ? parseInt(fetchedWine.id, 10) : fetchedWine.id;
          
          // Add to local state if not present
          const existingIndex = appState.wines.findIndex(w => w.id === fetchedWine.id);
          if (existingIndex === -1) {
            appState.wines.push(fetchedWine);
            console.log(`[showWineDetail] Added wine to local state`);
          } else {
            appState.wines[existingIndex] = fetchedWine;
            console.log(`[showWineDetail] Updated wine in local state`);
          }
          
          wine = fetchedWine;
        }
        
        hideLoadingOverlay();
      } catch (error) {
        console.error(`[showWineDetail] Failed to fetch wine from API:`, error);
        hideLoadingOverlay();
        
        this.showToast(
          `Wijn ID ${numericId} niet gevonden. API: ${API_CONFIG.baseURL}${API_CONFIG.endpoints.wines}/${numericId}. Open console (F12) voor details.`,
          'error'
        );
        this.showCollection();
        return;
      }
    }
    
    // If still not found, show error
    if (!wine) {
      console.error(`[showWineDetail] Wine still not found after all attempts. ID: ${numericId}`);
      this.showToast(
        `Wijn niet gevonden (ID: ${numericId}). Beschikbare IDs: ${appState.wines.map(w => w.id).join(', ')}. Klik op API-status voor instellingen.`,
        'error'
      );
      this.showCollection();
      return;
    }
    
    this.renderWineDetail();
  },

  showTastingForm: function(tastingId = null) {
    appState.currentView = 'tastingForm';
    this.hideAllViews();
    document.getElementById('tastingFormView').style.display = 'block';
    
    const today = new Date().toISOString().split('T')[0];
    
    if (tastingId) {
      // EDIT MODE for tasting note
      appState.currentTastingId = tastingId;
      console.log(`[showTastingForm] EDIT MODE - editing tasting note ID: ${tastingId}`);
      console.log(`[showTastingForm] Save will use PUT /tastingNotes/${tastingId}`);
      const tasting = this.getTastingById(tastingId);
      if (!tasting) {
        this.showToast('Proefnotitie niet gevonden');
        this.showWineDetail(appState.currentWineId);
        return;
      }
      appState.currentWineId = tasting.wine_id;
      this.populateTastingForm(tasting);
    } else {
      // CREATE MODE for tasting note
      appState.currentTastingId = null;
      console.log(`[showTastingForm] CREATE MODE - creating new tasting note`);
      console.log(`[showTastingForm] Save will use POST /tastingNotes`);
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
  handlePhotoUpload: function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.showToast('Foto is te groot (max 2MB)', 'error');
      event.target.value = '';
      return;
    }
    
    // Check file type
    if (!file.type.match('image/(jpeg|png)')) {
      this.showToast('Alleen JPG en PNG bestanden toegestaan', 'error');
      event.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      appState.currentPhotoBase64 = e.target.result;
      this.showPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  },

  showPhotoPreview: function(base64) {
    const preview = document.getElementById('photoPreview');
    const img = document.getElementById('photoPreviewImg');
    if (preview && img) {
      img.src = base64;
      preview.style.display = 'block';
    }
  },

  removePhoto: function() {
    appState.currentPhotoBase64 = null;
    const preview = document.getElementById('photoPreview');
    const input = document.getElementById('winePhoto');
    if (preview) preview.style.display = 'none';
    if (input) input.value = '';
  },

  saveWine: async function(event) {
    event.preventDefault();
    
    const naam = document.getElementById('wineNaam').value.trim();
    const wijnhuis = document.getElementById('wineWijnhuis').value.trim();
    const vintageInput = document.getElementById('wineVintage').value;
    const vintage = parseInt(vintageInput);
    const streek = document.getElementById('wineStreek').value.trim();
    const druif = document.getElementById('wineDruif').value.trim();
    const kleur = document.getElementById('wineKleur').value;
    const locatie = document.getElementById('wineLocatie').value;
    const aantalInput = document.getElementById('wineAantalFlessen').value;
    const aantal_flessen = parseInt(aantalInput);
    const prijsInput = document.getElementById('winePrijs').value;
    const prijs = prijsInput ? parseFloat(prijsInput) : 0;
    
    // Validation
    if (!naam) {
      this.showToast('Vul een naam in');
      document.getElementById('wineNaam').focus();
      return;
    }
    
    if (!wijnhuis) {
      this.showToast('Vul een wijnhuis in');
      document.getElementById('wineWijnhuis').focus();
      return;
    }
    
    if (!vintageInput || isNaN(vintage) || vintage < 1900 || vintage > 2099) {
      this.showToast('Vul een geldig jaar in (1900-2099)');
      document.getElementById('wineVintage').focus();
      return;
    }
    
    if (!streek) {
      this.showToast('Vul een streek in');
      document.getElementById('wineStreek').focus();
      return;
    }
    
    if (!druif) {
      this.showToast('Vul een druif in');
      document.getElementById('wineDruif').focus();
      return;
    }
    
    if (!kleur) {
      this.showToast('Selecteer een kleur');
      document.getElementById('wineKleur').focus();
      return;
    }
    
    if (!locatie) {
      this.showToast('Selecteer een locatie');
      document.getElementById('wineLocatie').focus();
      return;
    }
    
    if (!aantalInput || isNaN(aantal_flessen) || aantal_flessen < CONFIG.minBottles) {
      this.showToast(`Aantal flessen moet minimaal ${CONFIG.minBottles} zijn`);
      document.getElementById('wineAantalFlessen').focus();
      return;
    }
    
    if (aantal_flessen > CONFIG.maxBottles) {
      this.showToast(`Aantal flessen mag maximaal ${CONFIG.maxBottles} zijn`);
      document.getElementById('wineAantalFlessen').focus();
      return;
    }
    
    if (prijsInput && (isNaN(prijs) || prijs < 0)) {
      this.showToast('Prijs moet een positief getal zijn');
      document.getElementById('winePrijs').focus();
      return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    try {
      if (appState.editingWineId) {
        // ============================================================
        // EDIT MODE: UPDATE existing wine using PUT (NOT DELETE!)
        // ============================================================
        const editingId = appState.editingWineId;
        console.log(`[saveWine] *** EDIT MODE DETECTED ***`);
        console.log(`[saveWine] Editing wine ID: ${editingId}`);
        console.log(`[saveWine] Method: PUT (update)`);
        console.log(`[saveWine] Endpoint: ${API_CONFIG.endpoints.wines}/${editingId}`);
        
        const existingWine = this.getWineById(editingId);
        if (!existingWine) {
          throw new Error(`Wijn met ID ${editingId} niet gevonden`);
        }
        
        const wineData = { 
          id: editingId,
          user_id: existingWine.user_id || appState.currentUserId,
          naam, 
          wijnhuis, 
          vintage, 
          streek, 
          druif, 
          kleur, 
          locatie, 
          aantal_flessen,
          price_per_bottle: prijs,
          photo_base64: appState.currentPhotoBase64 || existingWine.photo_base64 || null
        };
        
        console.log(`[saveWine] Calling api.put() with data:`, wineData);
        
        const updatedWine = await api.put(`${API_CONFIG.endpoints.wines}/${editingId}`, wineData);
        updatedWine.id = typeof updatedWine.id === 'string' ? parseInt(updatedWine.id, 10) : updatedWine.id;
        
        const wineIndex = appState.wines.findIndex(w => w.id === editingId);
        if (wineIndex !== -1) {
          appState.wines[wineIndex] = updatedWine;
          console.log(`[saveWine] ✓ Wine updated successfully in local state`);
        } else {
          console.warn(`[saveWine] Wine with ID ${editingId} not found in local state after update`);
        }
        
        console.log(`[saveWine] ✓ UPDATE COMPLETE - Wine ID ${editingId} updated via PUT`);
        appState.editingWineId = null; // Clear editing state
        this.logActivity('wine_edited', editingId, naam);
        this.showToast('Wijn bijgewerkt', 'success');
      } else {
        // ============================================================
        // CREATE MODE: Add new wine using POST
        // ============================================================
        console.log(`[saveWine] *** CREATE MODE DETECTED ***`);
        console.log(`[saveWine] Creating new wine`);
        console.log(`[saveWine] Method: POST (create)`);
        
        const numericId = getNextWineId(appState.wines);
        
        const wineData = {
          id: numericId,
          user_id: appState.currentUserId,
          naam, 
          wijnhuis, 
          vintage, 
          streek, 
          druif, 
          kleur, 
          locatie, 
          aantal_flessen,
          price_per_bottle: prijs,
          photo_base64: appState.currentPhotoBase64 || null
        };
        
        console.log(`[saveWine] Generated new wine ID: ${numericId}`);
        console.log(`[saveWine] Calling api.post() with data:`, wineData);
        
        const newWine = await api.post(API_CONFIG.endpoints.wines, wineData);
        newWine.id = typeof newWine.id === 'string' ? parseInt(newWine.id, 10) : newWine.id;
        appState.wines.push(newWine);
        
        console.log(`[saveWine] ✓ CREATE COMPLETE - Wine ID ${newWine.id} created via POST`);
        this.logActivity('wine_added', newWine.id, naam);
        this.showToast('Wijn toegevoegd', 'success');
      }

      // Clear photo state
      appState.currentPhotoBase64 = null;
      
      // Refresh the collection view
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
    const wineId = appState.currentWineId;
    console.log(`[editWine] Opening edit form for wine ID: ${wineId}`);
    console.log(`[editWine] This will be an UPDATE operation (PUT), not DELETE`);
    this.showWineForm(wineId);
  },

  editTastingNote: function() {
    if (!appState.currentTastingId) {
      this.showToast('Geen proefnotitie geselecteerd');
      return;
    }
    console.log(`[editTastingNote] Editing tasting note ID: ${appState.currentTastingId}`);
    this.showTastingForm(appState.currentTastingId);
  },

  deleteWine: async function() {
    // ============================================================
    // DELETE OPERATION: This is ONLY called from delete button
    // NEVER from edit/save operations!
    // ============================================================
    console.log(`[deleteWine] *** DELETE OPERATION STARTED ***`);
    console.log(`[deleteWine] This is SEPARATE from edit operations`);
    console.log(`[deleteWine] Method: DELETE (remove)`);
    
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
    
    console.log(`[deleteWine] Deleting wine ID: ${appState.currentWineId} (${wine.naam})`);
    
    const tastingCount = this.getTastingsForWine(appState.currentWineId).length;
    const confirmMessage = tastingCount > 0 
      ? `Weet je zeker dat je "${wine.naam}" wilt verwijderen? Alle ${tastingCount} proefnotitie(s) worden ook verwijderd.`
      : `Weet je zeker dat je "${wine.naam}" wilt verwijderen?`;
    
    if (confirm(confirmMessage)) {
      showLoadingOverlay('Wijn verwijderen...');
      
      try {
        console.log(`[deleteWine] Deleting wine ID ${appState.currentWineId}`);
        
        // Delete associated tasting notes first
        const tastingsToDelete = this.getTastingsForWine(appState.currentWineId);
        for (const tasting of tastingsToDelete) {
          console.log(`[deleteWine] Deleting tasting note ID ${tasting.id}`);
          await api.delete(`${API_CONFIG.endpoints.tastingNotes}/${tasting.id}`);
        }
        
        // Delete wine
        await api.delete(`${API_CONFIG.endpoints.wines}/${appState.currentWineId}`);
        
        // Update local state
        appState.wines = appState.wines.filter(w => w.id !== appState.currentWineId);
        appState.tastingNotes = appState.tastingNotes.filter(t => t.wine_id !== appState.currentWineId);
        
        this.logActivity('wine_deleted', null, wine.naam);
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
      
      // Always log when a bottle is consumed
      this.logActivity('wine_consumed', wine.id, wine.naam);
      
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
  // QUICK TASTING FORM (Wine + Tasting Note combined)
  // ============================================================================
  showQuickTastingForm: function() {
    appState.currentView = 'quickTastingForm';
    this.hideAllViews();
    document.getElementById('quickTastingFormView').style.display = 'block';
    
    // Reset form
    document.getElementById('quickTastingForm').reset();
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('quickTastingDatum').value = today;
    
    // Hide color options initially
    document.getElementById('quickColorOptionsGroup').style.display = 'none';
  },

  updateQuickColorOptions: function() {
    const selectedType = document.getElementById('quickWineKleur').value;
    const colorOptionsGroup = document.getElementById('quickColorOptionsGroup');
    const colorOptionsContainer = document.getElementById('quickColorOptions');

    if (selectedType && CONFIG.colorOptions[selectedType]) {
      colorOptionsGroup.style.display = 'block';
      const colors = CONFIG.colorOptions[selectedType];
      
      colorOptionsContainer.innerHTML = colors.map(color => `
        <label class="radio-label color-option">
          <input type="radio" name="quickKleur" value="${color}" required>
          <span>${CONFIG.colorEmojis[color] || '⚪'} ${color}</span>
        </label>
      `).join('');
    } else {
      colorOptionsGroup.style.display = 'none';
      colorOptionsContainer.innerHTML = '';
    }
  },

  saveQuickTasting: async function(event) {
    event.preventDefault();
    
    // Get wine data
    const naam = document.getElementById('quickWineNaam').value.trim();
    const wijnhuis = document.getElementById('quickWineWijnhuis').value.trim();
    const vintageInput = document.getElementById('quickWineVintage').value;
    const vintage = parseInt(vintageInput);
    const streek = document.getElementById('quickWineStreek').value.trim();
    const druif = document.getElementById('quickWineDruif').value.trim();
    const kleur = document.getElementById('quickWineKleur').value;
    const aantalInput = document.getElementById('quickWineAantalFlessen').value;
    const aantal_flessen = parseInt(aantalInput) || 1;
    const prijsInput = document.getElementById('quickWinePrijs').value;
    const prijs = prijsInput ? parseFloat(prijsInput) : 0;
    
    // Get tasting data
    const formData = new FormData(event.target);
    const tastingKleur = formData.get('quickKleur');
    const intensiteit = formData.get('quickIntensiteit');
    const geurintensiteit = formData.get('quickGeurintensiteit');
    const droog = formData.get('quickDroog');
    const tannines = formData.get('quickTannines');
    const zuur = formData.get('quickZuur');
    const alcohol = formData.get('quickAlcohol');
    const body = formData.get('quickBody');
    const afdronk = formData.get('quickAfdronk');
    
    // Validation - wine fields
    if (!naam) {
      this.showToast('Vul een naam in');
      document.getElementById('quickWineNaam').focus();
      return;
    }
    if (!wijnhuis) {
      this.showToast('Vul een wijnhuis in');
      document.getElementById('quickWineWijnhuis').focus();
      return;
    }
    if (!vintageInput || isNaN(vintage) || vintage < 1900 || vintage > 2099) {
      this.showToast('Vul een geldig jaar in (1900-2099)');
      document.getElementById('quickWineVintage').focus();
      return;
    }
    if (!streek) {
      this.showToast('Vul een streek in');
      document.getElementById('quickWineStreek').focus();
      return;
    }
    if (!druif) {
      this.showToast('Vul een druif in');
      document.getElementById('quickWineDruif').focus();
      return;
    }
    if (!kleur) {
      this.showToast('Selecteer een kleur');
      document.getElementById('quickWineKleur').focus();
      return;
    }
    
    // Validation - tasting fields
    if (!tastingKleur || !intensiteit || !geurintensiteit || !droog || !tannines || !zuur || !alcohol || !body || !afdronk) {
      this.showToast('Vul alle verplichte velden van de proefnotitie in');
      return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    
    try {
      // Step 1: Create wine (with locatie_id: null)
      const wineId = getNextWineId(appState.wines);
      const wineData = {
        id: wineId,
        user_id: appState.currentUserId,
        naam,
        wijnhuis,
        vintage,
        streek,
        druif,
        kleur,
        locatie: null,  // No location in quick form
        aantal_flessen,
        price_per_bottle: prijs,
        photo_base64: null
      };
      
      console.log(`[saveQuickTasting] Creating wine with ID ${wineId}`);
      const newWine = await api.post(API_CONFIG.endpoints.wines, wineData);
      newWine.id = typeof newWine.id === 'string' ? parseInt(newWine.id, 10) : newWine.id;
      appState.wines.push(newWine);
      
      // Step 2: Calculate automatic stars for tasting note
      // Count aroma's
      const primaryAromas = formData.getAll('quickGeur_primair');
      const totalAromas = primaryAromas.length;
      
      let halfStars = 0;
      // Afdronk scoring
      if (afdronk === 'Medium') halfStars += 1;
      else if (afdronk === 'Hoog') halfStars += 2;
      
      // Aroma scoring (3+ aromas = 0.5 star)
      if (totalAromas >= 3) halfStars += 1;
      
      // Geur intensiteit scoring
      if (geurintensiteit === 'Medium') halfStars += 1;
      
      // Step 3: Create tasting note
      const tastingId = getNextTastingNoteId(appState.tastingNotes);
      const tastingData = {
        id: tastingId,
        wine_id: wineId,
        user_id: appState.currentUserId,
        datum: document.getElementById('quickTastingDatum').value,
        wijntype: kleur,  // Same as wine color
        kleur: tastingKleur,
        intensiteit: intensiteit,
        geurintensiteit: geurintensiteit,
        geur_primair: primaryAromas,
        geur_secundair: [],
        geur_tertiair: [],
        droog: droog,
        tannines: tannines,
        zuur: zuur,
        alcohol: alcohol,
        body: body,
        afdronk: afdronk,
        automatic_stars: halfStars,
        manual_stars: 0,
        manual_star_reasons: [],
        notities: document.getElementById('quickTastingNotities').value.trim()
      };
      
      console.log(`[saveQuickTasting] Creating tasting note with ID ${tastingId}`);
      const newTasting = await api.post(API_CONFIG.endpoints.tastingNotes, tastingData);
      newTasting.id = typeof newTasting.id === 'string' ? parseInt(newTasting.id, 10) : newTasting.id;
      newTasting.wine_id = typeof newTasting.wine_id === 'string' ? parseInt(newTasting.wine_id, 10) : newTasting.wine_id;
      appState.tastingNotes.push(newTasting);
      
      // Step 4: Log activities
      this.logActivity('wine_added', wineId, naam);
      const stars = Math.round(halfStars / 2);
      const starText = '⭐'.repeat(stars);
      this.logActivity('tasting_note_added', wineId, naam, `${naam} - ${starText}`);
      
      this.showToast('Wijn en proefnotitie opgeslagen!', 'success');
      
      // Navigate to wine detail
      this.showWineDetail(wineId);
      
    } catch (error) {
      console.error('Failed to save quick tasting:', error);
      this.showToast(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
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
    
    // Validate offline mode
    if (appState.isOfflineMode) {
      // In offline mode, just update local state
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
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    try {
      if (appState.currentTastingId) {
        // ============================================================
        // EDIT MODE: UPDATE existing tasting note using PUT
        // ============================================================
        const editingId = appState.currentTastingId;
        console.log(`[saveTastingNote] *** EDIT MODE DETECTED ***`);
        console.log(`[saveTastingNote] Editing tasting note ID: ${editingId}`);
        console.log(`[saveTastingNote] Method: PUT (update)`);
        
        const existingTasting = this.getTastingById(editingId);
        if (!existingTasting) {
          throw new Error(`Proefnotitie met ID ${editingId} niet gevonden`);
        }
        
        const tastingData = {
          id: editingId,
          wine_id: appState.currentWineId,
          user_id: existingTasting.user_id || appState.currentUserId,
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
        
        console.log(`[saveTastingNote] Calling api.put() with data:`, tastingData);
        
        const updatedTasting = await api.put(
          `${API_CONFIG.endpoints.tastingNotes}/${editingId}`,
          tastingData
        );
        
        updatedTasting.id = typeof updatedTasting.id === 'string' ? parseInt(updatedTasting.id, 10) : updatedTasting.id;
        updatedTasting.wine_id = typeof updatedTasting.wine_id === 'string' ? parseInt(updatedTasting.wine_id, 10) : updatedTasting.wine_id;
        
        const tastingIndex = appState.tastingNotes.findIndex(t => t.id === editingId);
        if (tastingIndex !== -1) {
          appState.tastingNotes[tastingIndex] = updatedTasting;
          console.log(`[saveTastingNote] ✓ Tasting note updated successfully in local state`);
        }
        
        console.log(`[saveTastingNote] ✓ UPDATE COMPLETE - Tasting note ID ${editingId} updated via PUT`);
        appState.currentTastingId = null; // Clear editing state
        const wine = this.getWineById(appState.currentWineId);
        this.logActivity('tasting_note_edited', appState.currentWineId, wine ? wine.naam : 'Wijn');
        this.showToast('Proefnotitie bijgewerkt', 'success');
      } else {
        // ============================================================
        // CREATE MODE: Add new tasting note using POST
        // ============================================================
        console.log(`[saveTastingNote] *** CREATE MODE DETECTED ***`);
        console.log(`[saveTastingNote] Creating new tasting note`);
        console.log(`[saveTastingNote] Method: POST (create)`);
        
        const numericId = getNextTastingNoteId(appState.tastingNotes);
        console.log(`[saveTastingNote] Generated new tasting note ID: ${numericId}`);
        
        const tastingData = {
          id: numericId,
          wine_id: appState.currentWineId,
          user_id: appState.currentUserId,
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
        
        console.log(`[saveTastingNote] Calling api.post() with data:`, tastingData);
        
        const newTasting = await api.post(API_CONFIG.endpoints.tastingNotes, tastingData);
        newTasting.id = typeof newTasting.id === 'string' ? parseInt(newTasting.id, 10) : newTasting.id;
        newTasting.wine_id = typeof newTasting.wine_id === 'string' ? parseInt(newTasting.wine_id, 10) : newTasting.wine_id;
        appState.tastingNotes.push(newTasting);
        
        console.log(`[saveTastingNote] ✓ CREATE COMPLETE - Tasting note ID ${newTasting.id} created via POST`);
        
        const wine = this.getWineById(appState.currentWineId);
        const stars = Math.round((halfStars + manualHalfStars) / 2);
        const starText = '⭐'.repeat(stars);
        this.logActivity('tasting_note_added', appState.currentWineId, wine ? wine.naam : 'Wijn', `${wine ? wine.naam : 'Wijn'} - ${starText}`);
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
    // ============================================================
    // DELETE OPERATION: This is ONLY called from delete button
    // NEVER from edit/save operations!
    // ============================================================
    console.log(`[deleteTastingNote] *** DELETE OPERATION STARTED ***`);
    console.log(`[deleteTastingNote] This is SEPARATE from edit operations`);
    console.log(`[deleteTastingNote] Method: DELETE (remove)`);
    
    if (!appState.currentTastingId) {
      this.showToast('Geen proefnotitie geselecteerd');
      return;
    }
    
    const tasting = this.getTastingById(appState.currentTastingId);
    if (!tasting) {
      this.showToast('Proefnotitie niet gevonden');
      return;
    }
    
    console.log(`[deleteTastingNote] Deleting tasting note ID: ${appState.currentTastingId}`);
    
    if (confirm('Weet je zeker dat je deze proefnotitie wilt verwijderen?')) {
      showLoadingOverlay('Proefnotitie verwijderen...');
      
      try {
        console.log(`[deleteTastingNote] Deleting tasting note ID ${appState.currentTastingId}`);
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
    
    if (API_CONFIG.debug) {
      console.log(`[renderWines] Rendering ${winesToRender.length} wines`);
    }

    wineGrid.innerHTML = winesToRender.map(wine => {
      const status = this.getWineStatus(wine);
      const isOutOfStock = wine.aantal_flessen === 0;
      const cardClass = isOutOfStock ? 'wine-card wine-card--out-of-stock' : 'wine-card';
      const tastingCount = this.getTastingsForWine(wine.id).length;
      const kleurBadge = wine.kleur ? `<span class="kleur-badge kleur-badge--${wine.kleur.toLowerCase()}">${wine.kleur}</span>` : '';
      const price = wine.price_per_bottle || 0;
      const totalValue = price * (wine.aantal_flessen || 0);
      const owner = appState.users.find(u => u.id === wine.user_id);
      
      if (API_CONFIG.debug && Math.random() < 0.1) {
        console.log(`[renderWines] Wine:`, { id: wine.id, naam: wine.naam, type: typeof wine.id });
      }
      
      return `
        <div class="${cardClass}" onclick="app.showWineDetail(${wine.id})">
          ${wine.photo_base64 ? `
            <img src="${wine.photo_base64}" class="wine-photo-thumbnail" alt="${wine.naam}" style="width: 100%; height: 150px; object-fit: cover; margin-bottom: var(--space-12); border-radius: var(--radius-base);">
          ` : ''}
          <div class="wine-card-header">
            <h3>${wine.naam}</h3>
            ${isOutOfStock ? '<span class="stock-icon out-of-stock">📭</span>' : '<span class="stock-icon in-stock">🍷</span>'}
          </div>
          <p><strong>${wine.wijnhuis}</strong></p>
          <p>${wine.vintage} • ${wine.streek}</p>
          <p>${wine.druif}</p>
          ${price > 0 ? `<p style="color: var(--color-primary); font-weight: var(--font-weight-medium); margin-top: var(--space-8);">€${price.toFixed(2)}/fles • €${totalValue.toFixed(2)} totaal</p>` : ''}
          <div class="wine-card-footer">
            ${kleurBadge}
            <span class="location-badge">${wine.locatie}</span>
            <span class="stock-badge ${isOutOfStock ? 'stock-badge--out' : 'stock-badge--in'}">
              ${wine.aantal_flessen} fles${wine.aantal_flessen !== 1 ? 'sen' : ''}
            </span>
          </div>
          ${owner ? `<p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--space-8);">👤 ${owner.name}</p>` : ''}
          ${tastingCount > 0 ? `<p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-4);">📝 ${tastingCount} proefnotitie${tastingCount !== 1 ? 's' : ''}</p>` : ''}
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
    const price = wine.price_per_bottle || 0;
    const totalValue = price * (wine.aantal_flessen || 0);
    const owner = appState.users.find(u => u.id === wine.user_id);
    
    document.getElementById('wineDetailInfo').innerHTML = `
      ${wine.photo_base64 ? `<img src="${wine.photo_base64}" class="wine-photo" alt="${wine.naam}">` : ''}
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
        <dd>${wine.locatie || '<span style="color: var(--color-text-secondary);">Geen locatie</span>'}</dd>
        ${price > 0 ? `
          <dt>Prijs per fles</dt>
          <dd>€${price.toFixed(2)}</dd>
          <dt>Totale waarde</dt>
          <dd style="font-weight: var(--font-weight-bold); color: var(--color-primary);">€${totalValue.toFixed(2)}</dd>
        ` : ''}
        ${owner ? `
          <dt>Eigenaar</dt>
          <dd>👤 ${owner.name}</dd>
        ` : ''}
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
      const creatorName = this.getUserName(note.user_id);
      const creator = appState.users.find(u => u.id === note.user_id);
      const creatorColor = creator ? creator.color : '#999';
      return `
        <div class="tasting-note-card" onclick="app.showTastingDetail(${note.id})">
          <div class="date">📅 ${date}</div>
          <div style="display: flex; align-items: center; gap: var(--space-8); margin: var(--space-8) 0; font-size: var(--font-size-sm); color: var(--color-text-secondary);">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${creatorColor};"></span>
            <span>Gemaakt door: <strong>${creatorName}</strong></span>
          </div>
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

    const creatorName = this.getUserName(tasting.user_id);
    const creator = appState.users.find(u => u.id === tasting.user_id);
    const creatorColor = creator ? creator.color : '#999';

    document.getElementById('tastingDetailContent').innerHTML = `
      <div class="tasting-info-section" style="background: var(--color-bg-5); padding: var(--space-16); border-radius: var(--radius-base); border: 1px solid ${creatorColor};">
        <div style="display: flex; align-items: center; gap: var(--space-12); margin-bottom: var(--space-12);">
          <span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background: ${creatorColor}; border: 2px solid var(--color-border);"></span>
          <p style="margin: 0; font-size: var(--font-size-lg);"><strong>Gemaakt door ${creatorName} op ${date}</strong></p>
        </div>
      </div>

      <div class="tasting-info-section">
        <h4>Wijn</h4>
        <p><strong>${wine.naam}</strong> - ${wine.wijnhuis} (${wine.vintage})</p>
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
    console.log('[populateTastingForm] Populating form with tasting:', tasting);
    
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
    
    console.log('[populateTastingForm] Form populated successfully');
  },

  // ============================================================================
  // LOCATIONS MANAGEMENT
  // ============================================================================
  showLocations: function() {
    if (!appState.isLoggedIn || !appState.currentUserId) {
      this.showUserSelector();
      return;
    }
    appState.currentView = 'locations';
    this.hideAllViews();
    this.updateNavigation('locations');
    document.getElementById('locationsView').style.display = 'block';
    this.renderLocations();
  },

  showLocationForm: function(locationId = null) {
    const modal = document.getElementById('locationFormModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    if (locationId) {
      const location = appState.locations.find(l => l.id === locationId);
      if (!location) {
        this.showToast('Locatie niet gevonden');
        return;
      }
      document.getElementById('locationFormTitle').textContent = 'Locatie Bewerken';
      document.getElementById('locationId').value = location.id;
      document.getElementById('locationName').value = location.name;
      document.getElementById('locationTemperature').value = location.temperature || '';
    } else {
      document.getElementById('locationFormTitle').textContent = 'Nieuwe Locatie';
      document.getElementById('locationForm').reset();
      document.getElementById('locationId').value = '';
    }
  },

  closeLocationForm: function() {
    const modal = document.getElementById('locationFormModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  saveLocation: async function(event) {
    event.preventDefault();
    
    const name = document.getElementById('locationName').value.trim();
    const temperatureInput = document.getElementById('locationTemperature').value.trim();
    const temperature = temperatureInput ? parseFloat(temperatureInput) : null;
    const locationIdInput = document.getElementById('locationId').value;
    
    if (!name) {
      this.showToast('Vul een naam in');
      return;
    }
    
    if (temperature !== null && (temperature < 0 || temperature > 30)) {
      this.showToast('Temperatuur moet tussen 0 en 30°C zijn');
      return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    
    try {
      if (locationIdInput) {
        // Edit existing location
        const locationId = parseInt(locationIdInput);
        const existingLocation = appState.locations.find(l => l.id === locationId);
        const locationData = { 
          id: locationId, 
          name, 
          temperature,
          user_id: existingLocation ? existingLocation.user_id : appState.currentUserId
        };
        
        console.log(`[saveLocation] Updating location ID ${locationId}`, locationData);
        
        const updatedLocation = await api.put(`${API_CONFIG.endpoints.locations}/${locationId}`, locationData);
        updatedLocation.id = typeof updatedLocation.id === 'string' ? parseInt(updatedLocation.id, 10) : updatedLocation.id;
        
        const index = appState.locations.findIndex(l => l.id === locationId);
        if (index !== -1) {
          appState.locations[index] = updatedLocation;
        }
        
        this.showToast('Locatie bijgewerkt', 'success');
      } else {
        // Create new location - get next ID
        const maxId = appState.locations.length > 0 
          ? Math.max(...appState.locations.map(l => parseInt(l.id) || 0))
          : 99; // Start at 100
        const newId = maxId + 1;
        
        const locationData = { 
          id: newId, 
          name, 
          temperature,
          user_id: appState.currentUserId
        };
        
        console.log(`[saveLocation] Creating new location with ID ${newId}`, locationData);
        
        const newLocation = await api.post(API_CONFIG.endpoints.locations, locationData);
        newLocation.id = typeof newLocation.id === 'string' ? parseInt(newLocation.id, 10) : newLocation.id;
        appState.locations.push(newLocation);
        
        this.logActivity('location_added', null, name);
        this.showToast('Locatie toegevoegd', 'success');
      }
      
      this.closeLocationForm();
      this.renderLocations();
      
    } catch (error) {
      console.error('Failed to save location:', error);
      this.showToast(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  },

  deleteLocation: async function(locationId) {
    const location = appState.locations.find(l => l.id === locationId);
    if (!location) {
      this.showToast('Locatie niet gevonden');
      return;
    }
    
    const winesInLocation = appState.wines.filter(w => w.locatie === location.name).length;
    
    let confirmMessage = `Weet je zeker dat je "${location.name}" wilt verwijderen?`;
    if (winesInLocation > 0) {
      confirmMessage += `\n\nLet op: ${winesInLocation} wijn${winesInLocation !== 1 ? 'en' : ''} ${winesInLocation !== 1 ? 'hebben' : 'heeft'} deze locatie. Deze wijnen blijven bestaan maar hun locatie wordt ongeldig.`;
    }
    
    if (confirm(confirmMessage)) {
      showLoadingOverlay('Locatie verwijderen...');
      
      try {
        console.log(`[deleteLocation] Deleting location ID ${locationId}`);
        await api.delete(`${API_CONFIG.endpoints.locations}/${locationId}`);
        appState.locations = appState.locations.filter(l => l.id !== locationId);
        
        this.showToast('Locatie verwijderd', 'success');
        this.renderLocations();
        
      } catch (error) {
        console.error('Failed to delete location:', error);
        this.showToast(error.message, 'error');
      } finally {
        hideLoadingOverlay();
      }
    }
  },

  getTemperatureClass: function(temp) {
    if (temp === null || temp === undefined) return '';
    if (temp < 15) return 'cold';
    if (temp <= 18) return 'ideal';
    return 'warm';
  },

  getTemperatureIcon: function(temp) {
    if (temp === null || temp === undefined) return '';
    if (temp < 15) return '❄️';
    if (temp <= 18) return '🌡️';
    return '🔥';
  },

  renderLocations: function() {
    const locationsList = document.getElementById('locationsList');
    if (!locationsList) return;
    
    // Filter locations by current user
    const userLocations = appState.locations.filter(l => l.user_id === appState.currentUserId);
    
    if (userLocations.length === 0) {
      locationsList.innerHTML = '<div class="empty-state">Geen locaties gevonden. Klik op "+ Nieuwe Locatie" om er een toe te voegen.</div>';
      return;
    }
    
    locationsList.innerHTML = userLocations.map(location => {
      const winesInLocation = appState.wines.filter(w => w.locatie === location.name);
      const wineCount = winesInLocation.length;
      const totalBottles = winesInLocation.reduce((sum, w) => sum + (w.aantal_flessen || 0), 0);
      const tempClass = this.getTemperatureClass(location.temperature);
      const tempIcon = this.getTemperatureIcon(location.temperature);
      
      return `
        <div class="location-card">
          <div class="location-header">
            <div>
              <h3>📍 ${location.name}</h3>
              ${location.temperature !== null && location.temperature !== undefined ? `
                <span class="temp-indicator ${tempClass}">${tempIcon} ${location.temperature}°C</span>
              ` : ''}
            </div>
            <div class="location-actions">
              <button class="btn btn--sm btn--secondary" onclick="app.showLocationForm(${location.id})">Bewerken</button>
              <button class="btn btn--sm btn--outline" onclick="app.deleteLocation(${location.id})">Verwijderen</button>
            </div>
          </div>
          <div class="location-stats">
            <div class="location-stat">
              <span class="location-stat-value">${wineCount}</span>
              <span class="location-stat-label">Wijn${wineCount !== 1 ? 'en' : ''}</span>
            </div>
            <div class="location-stat">
              <span class="location-stat-value">${totalBottles}</span>
              <span class="location-stat-label">Fles${totalBottles !== 1 ? 'sen' : ''}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // ============================================================================
  // ACTIVITY FEED
  // ============================================================================
  showActivities: function() {
    if (!appState.isLoggedIn || !appState.currentUserId) {
      this.showUserSelector();
      return;
    }
    appState.currentView = 'activities';
    this.hideAllViews();
    this.updateNavigation('activities');
    document.getElementById('activitiesView').style.display = 'block';
    this.renderActivities();
  },

  renderActivities: function() {
    const container = document.getElementById('activitiesContainer');
    if (!container) return;
    
    if (appState.activities.length === 0) {
      container.innerHTML = '<div class="empty-state">Geen activiteiten gevonden. Begin met het toevoegen van wijnen!</div>';
      return;
    }
    
    // Sort activities by timestamp (newest first)
    const sortedActivities = [...appState.activities].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    container.innerHTML = sortedActivities.map(activity => {
      const user = appState.users.find(u => u.id === activity.user_id);
      const activityComments = appState.comments.filter(c => c.activity_id === activity.id);
      const isLiked = activity.liked_by && activity.liked_by.includes(appState.currentUserId);
      
      return `
        <div class="activity-card" data-activity-id="${activity.id}">
          <div class="activity-header">
            <div class="activity-user-avatar" style="background: ${user ? user.color : '#999'};"></div>
            <div class="activity-info">
              <div class="activity-user-name">${user ? user.name : 'Onbekend'}</div>
              <div class="activity-timestamp">${this.getTimeAgo(activity.timestamp)}</div>
            </div>
          </div>
          <div class="activity-content">
            ${activity.description}
          </div>
          <div class="activity-actions">
            <button class="activity-action-btn ${isLiked ? 'liked' : ''}" onclick="app.toggleActivityLike(${activity.id})">
              ${isLiked ? '❤️' : '🤍'} ${activity.likes || 0}
            </button>
            <button class="activity-action-btn" onclick="app.toggleComments(${activity.id})">
              💬 ${activityComments.length}
            </button>
          </div>
          <div class="comments-section" id="comments-${activity.id}" style="display: none;">
            <div id="comments-list-${activity.id}">
              ${this.renderComments(activityComments)}
            </div>
            <form class="comment-form" onsubmit="app.addComment(event, ${activity.id})">
              <input type="text" class="comment-input" placeholder="Voeg een reactie toe..." required>
              <button type="submit" class="btn btn--sm btn--primary">Verstuur</button>
            </form>
          </div>
        </div>
      `;
    }).join('');
  },

  renderComments: function(comments) {
    if (comments.length === 0) return '<p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-12);">Nog geen reacties</p>';
    
    return comments.map(comment => {
      const user = appState.users.find(u => u.id === comment.user_id);
      const canDelete = comment.user_id === appState.currentUserId;
      
      return `
        <div class="comment-item">
          <div class="comment-avatar" style="background: ${user ? user.color : '#999'};"></div>
          <div class="comment-content">
            <div class="comment-author">${user ? user.name : 'Onbekend'}</div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-meta">
              <span>${this.getTimeAgo(comment.timestamp)}</span>
              ${canDelete ? `<button class="btn btn--sm btn--outline" onclick="app.deleteComment(${comment.id}, ${comment.activity_id})" style="padding: 2px 8px; font-size: 10px;">Verwijderen</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  toggleComments: function(activityId) {
    const commentsSection = document.getElementById(`comments-${activityId}`);
    if (commentsSection) {
      commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
    }
  },

  toggleActivityLike: async function(activityId) {
    const activity = appState.activities.find(a => a.id === activityId);
    if (!activity) return;
    
    if (!activity.liked_by) activity.liked_by = [];
    
    const isLiked = activity.liked_by.includes(appState.currentUserId);
    
    if (isLiked) {
      activity.liked_by = activity.liked_by.filter(id => id !== appState.currentUserId);
      activity.likes = Math.max(0, (activity.likes || 0) - 1);
    } else {
      activity.liked_by.push(appState.currentUserId);
      activity.likes = (activity.likes || 0) + 1;
    }
    
    try {
      await api.put(`/activities/${activityId}`, activity);
      this.renderActivities();
    } catch (error) {
      console.warn('[toggleActivityLike] Failed to update like:', error);
      this.renderActivities();
    }
  },

  addComment: async function(event, activityId) {
    event.preventDefault();
    const input = event.target.querySelector('.comment-input');
    const text = input.value.trim();
    if (!text) return;
    
    const commentId = this.getNextCommentId();
    const comment = {
      id: commentId,
      activity_id: activityId,
      user_id: appState.currentUserId,
      text: text,
      timestamp: new Date().toISOString()
    };
    
    try {
      const newComment = await api.post('/comments', comment);
      appState.comments.push(newComment);
      input.value = '';
      this.renderActivities();
      // Re-open comments section
      setTimeout(() => {
        const commentsSection = document.getElementById(`comments-${activityId}`);
        if (commentsSection) commentsSection.style.display = 'block';
      }, 100);
    } catch (error) {
      console.warn('[addComment] Failed to add comment:', error);
      appState.comments.push(comment);
      input.value = '';
      this.renderActivities();
    }
  },

  deleteComment: async function(commentId, activityId) {
    if (!confirm('Weet je zeker dat je deze reactie wilt verwijderen?')) return;
    
    try {
      await api.delete(`/comments/${commentId}`);
      appState.comments = appState.comments.filter(c => c.id !== commentId);
      this.renderActivities();
      // Re-open comments section
      setTimeout(() => {
        const commentsSection = document.getElementById(`comments-${activityId}`);
        if (commentsSection) commentsSection.style.display = 'block';
      }, 100);
    } catch (error) {
      console.warn('[deleteComment] Failed to delete comment:', error);
      appState.comments = appState.comments.filter(c => c.id !== commentId);
      this.renderActivities();
    }
  },

  // ============================================================================
  // STATISTICS
  // ============================================================================
  showStatistics: function() {
    if (!appState.isLoggedIn || !appState.currentUserId) {
      this.showUserSelector();
      return;
    }
    appState.currentView = 'statistics';
    this.hideAllViews();
    this.updateNavigation('statistics');
    document.getElementById('statisticsView').style.display = 'block';
    this.renderStatistics();
  },

  renderStatistics: function() {
    const container = document.getElementById('statisticsContainer');
    if (!container) return;
    
    // Filter wines by current user
    const userWines = appState.wines.filter(w => w.user_id === appState.currentUserId);
    
    if (userWines.length === 0) {
      container.innerHTML = '<div class="empty-stat">Geen wijnen om statistieken voor te tonen. Voeg eerst wijnen toe.</div>';
      return;
    }
    
    // Filter locations by current user
    const userLocations = appState.locations.filter(l => l.user_id === appState.currentUserId);
    
    if (userLocations.length === 0) {
      container.innerHTML = '<div class="empty-stat">Geen locaties gevonden. Voeg eerst locaties toe via 📍 Locaties.</div>';
      return;
    }
    
    let html = '';
    
    userLocations.forEach(location => {
      const winesInLocation = userWines.filter(w => w.locatie === location.name);
      const tempClass = this.getTemperatureClass(location.temperature);
      const tempIcon = this.getTemperatureIcon(location.temperature);
      
      if (winesInLocation.length === 0) {
        html += `
          <div class="stat-card">
            <div class="stat-card-header">
              <h2>📍 ${location.name}</h2>
              ${location.temperature !== null && location.temperature !== undefined ? `
                <span class="temp-indicator ${tempClass}">${tempIcon} ${location.temperature}°C</span>
              ` : ''}
            </div>
            <div class="empty-stat">Geen wijnen op deze locatie</div>
          </div>
        `;
        return;
      }
      
      const wineCount = winesInLocation.length;
      const totalBottles = winesInLocation.reduce((sum, w) => sum + (w.aantal_flessen || 0), 0);
      const avgVintage = Math.round(
        winesInLocation.reduce((sum, w) => sum + (w.vintage || 0), 0) / wineCount
      );
      
      // Wine type breakdown
      const witCount = winesInLocation.filter(w => w.kleur === 'Wit').length;
      const roseCount = winesInLocation.filter(w => w.kleur === 'Rosé').length;
      const roodCount = winesInLocation.filter(w => w.kleur === 'Rood').length;
      
      // Vintage distribution
      const vintageMap = {};
      winesInLocation.forEach(w => {
        const vintage = w.vintage || 'Onbekend';
        vintageMap[vintage] = (vintageMap[vintage] || 0) + (w.aantal_flessen || 0);
      });
      const sortedVintages = Object.entries(vintageMap)
        .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
        .slice(0, 5); // Top 5 vintages
      const maxBottles = Math.max(...sortedVintages.map(v => v[1]));
      
      html += `
        <div class="stat-card">
          <div class="stat-card-header">
            <h2>📍 ${location.name}</h2>
            ${location.temperature !== null && location.temperature !== undefined ? `
              <span class="temp-indicator ${tempClass}">${tempIcon} ${location.temperature}°C</span>
            ` : ''}
          </div>
          
          <div class="stat-grid">
            <div class="stat-item">
              <div class="stat-item-icon">🍷</div>
              <span class="stat-item-value">${wineCount}</span>
              <span class="stat-item-label">Wijn${wineCount !== 1 ? 'en' : ''}</span>
            </div>
            <div class="stat-item">
              <div class="stat-item-icon">🍾</div>
              <span class="stat-item-value">${totalBottles}</span>
              <span class="stat-item-label">Fles${totalBottles !== 1 ? 'sen' : ''}</span>
            </div>
            <div class="stat-item">
              <div class="stat-item-icon">📅</div>
              <span class="stat-item-value">${avgVintage}</span>
              <span class="stat-item-label">Gem. Vintage</span>
            </div>
          </div>
          
          <h4 style="margin: var(--space-20) 0 var(--space-12) 0; font-size: var(--font-size-lg);">Verdeling per Type</h4>
          <div class="wine-type-breakdown">
            ${roodCount > 0 ? `
              <div class="wine-type-stat">
                <span class="wine-type-stat-icon">🔴</span>
                <span class="wine-type-stat-text">${roodCount} Rood</span>
              </div>
            ` : ''}
            ${witCount > 0 ? `
              <div class="wine-type-stat">
                <span class="wine-type-stat-icon">⚪</span>
                <span class="wine-type-stat-text">${witCount} Wit</span>
              </div>
            ` : ''}
            ${roseCount > 0 ? `
              <div class="wine-type-stat">
                <span class="wine-type-stat-icon">🧡</span>
                <span class="wine-type-stat-text">${roseCount} Rosé</span>
              </div>
            ` : ''}
          </div>
          
          ${sortedVintages.length > 0 ? `
            <div class="vintage-chart">
              <h4 style="margin: 0 0 var(--space-12) 0; font-size: var(--font-size-base); font-weight: var(--font-weight-semibold);">Top Vintages (aantal flessen)</h4>
              <div class="vintage-bars">
                ${sortedVintages.map(([vintage, count]) => {
                  const percentage = (count / maxBottles) * 100;
                  return `
                    <div class="vintage-bar-row">
                      <span class="vintage-label">${vintage}</span>
                      <div class="vintage-bar-container">
                        <div class="vintage-bar-fill" style="width: ${percentage}%">
                          <span class="vintage-count">${count}</span>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    });
    
    container.innerHTML = html;
  },

  // ============================================================================
  // VALUE DASHBOARD
  // ============================================================================
  showValueDashboard: function() {
    if (!appState.isLoggedIn || !appState.currentUserId) {
      this.showUserSelector();
      return;
    }
    appState.currentView = 'value';
    this.hideAllViews();
    this.updateNavigation('value');
    document.getElementById('valueDashboardView').style.display = 'block';
    this.renderValueDashboard();
  },

  renderValueDashboard: function() {
    const container = document.getElementById('valueDashboardContainer');
    if (!container) return;
    
    // Filter wines by current user
    const userWines = appState.wines.filter(w => w.user_id === appState.currentUserId);
    
    if (userWines.length === 0) {
      container.innerHTML = '<div class="empty-stat">Geen wijnen om waardes voor te berekenen</div>';
      return;
    }
    
    // Calculate total value
    const totalValue = userWines.reduce((sum, w) => {
      const price = w.price_per_bottle || 0;
      const bottles = w.aantal_flessen || 0;
      return sum + (price * bottles);
    }, 0);
    
    const totalBottles = userWines.reduce((sum, w) => sum + (w.aantal_flessen || 0), 0);
    const avgPrice = totalBottles > 0 ? totalValue / totalBottles : 0;
    
    // Value per location
    const locationValues = {};
    userWines.forEach(w => {
      const value = (w.price_per_bottle || 0) * (w.aantal_flessen || 0);
      locationValues[w.locatie] = (locationValues[w.locatie] || 0) + value;
    });
    
    // Value per wine type
    const typeValues = {};
    userWines.forEach(w => {
      const value = (w.price_per_bottle || 0) * (w.aantal_flessen || 0);
      typeValues[w.kleur] = (typeValues[w.kleur] || 0) + value;
    });
    
    // Most expensive wines
    const wineValues = userWines.map(w => ({
      ...w,
      totalValue: (w.price_per_bottle || 0) * (w.aantal_flessen || 0)
    })).filter(w => w.totalValue > 0).sort((a, b) => b.totalValue - a.totalValue);
    
    const topExpensive = wineValues.slice(0, 5);
    
    let html = `
      <div class="value-card">
        <h3>Totaal Overzicht</h3>
        <div class="value-grid">
          <div class="value-item">
            <span class="value-item-value">€${totalValue.toFixed(2)}</span>
            <span class="value-item-label">Totale Voorraadwaarde</span>
          </div>
          <div class="value-item">
            <span class="value-item-value">${totalBottles}</span>
            <span class="value-item-label">Totaal Flessen</span>
          </div>
          <div class="value-item">
            <span class="value-item-value">€${avgPrice.toFixed(2)}</span>
            <span class="value-item-label">Gemiddelde Prijs/Fles</span>
          </div>
        </div>
      </div>
    `;
    
    // Value per location
    if (Object.keys(locationValues).length > 0) {
      html += `
        <div class="value-card">
          <h3>Waarde per Locatie</h3>
          <div class="wine-value-list">
            ${Object.entries(locationValues).sort((a, b) => b[1] - a[1]).map(([loc, val]) => `
              <div class="wine-value-item">
                <span class="wine-value-item-name">📍 ${loc}</span>
                <span class="wine-value-item-price">€${val.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    // Value per type
    if (Object.keys(typeValues).length > 0) {
      html += `
        <div class="value-card">
          <h3>Waarde per Wijntype</h3>
          <div class="wine-value-list">
            ${Object.entries(typeValues).sort((a, b) => b[1] - a[1]).map(([type, val]) => `
              <div class="wine-value-item">
                <span class="wine-value-item-name">🍷 ${type}</span>
                <span class="wine-value-item-price">€${val.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    // Top expensive wines
    if (topExpensive.length > 0) {
      html += `
        <div class="value-card">
          <h3>Meest Waardevolle Wijnen (Top 5)</h3>
          <div class="wine-value-list">
            ${topExpensive.map(w => `
              <div class="wine-value-item" style="cursor: pointer;" onclick="app.showWineDetail(${w.id})">
                <span class="wine-value-item-name">${w.naam} (${w.aantal_flessen}x €${(w.price_per_bottle || 0).toFixed(2)})</span>
                <span class="wine-value-item-price">€${w.totalValue.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  },

  // ============================================================================
  // EXPORT FUNCTIONALITY
  // ============================================================================
  exportJSON: function() {
    const data = {
      wines: appState.wines,
      tastingNotes: appState.tastingNotes,
      locations: appState.locations,
      users: appState.users
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `wijnkelder_backup_${date}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showToast(`Database geëxporteerd als ${filename}`, 'success');
  },

  exportWinesCSV: function() {
    if (appState.wines.length === 0) {
      this.showToast('Geen wijnen om te exporteren');
      return;
    }
    
    const headers = ['ID', 'Naam', 'Wijnhuis', 'Vintage', 'Streek', 'Druif', 'Kleur', 'Locatie', 'Flessen', 'Prijs/Fles', 'Totale Waarde'];
    const rows = appState.wines.map(w => [
      w.id,
      w.naam,
      w.wijnhuis,
      w.vintage,
      w.streek,
      w.druif,
      w.kleur,
      w.locatie,
      w.aantal_flessen,
      (w.price_per_bottle || 0).toFixed(2),
      ((w.price_per_bottle || 0) * (w.aantal_flessen || 0)).toFixed(2)
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `wijnen_export_${date}.csv`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showToast(`Wijnen geëxporteerd als ${filename}`, 'success');
  },

  exportTastingsCSV: function() {
    if (appState.tastingNotes.length === 0) {
      this.showToast('Geen proefnotities om te exporteren');
      return;
    }
    
    const headers = ['ID', 'Wijn ID', 'Wijn Naam', 'Datum', 'Wijntype', 'Sterren', 'Notities'];
    const rows = appState.tastingNotes.map(t => {
      const wine = this.getWineById(t.wine_id);
      const totalStars = ((t.automatic_stars || 0) + (t.manual_stars || 0)) / 2;
      return [
        t.id,
        t.wine_id,
        wine ? wine.naam : 'Onbekend',
        t.datum,
        t.wijntype,
        totalStars.toFixed(1),
        (t.notities || '').replace(/"/g, '""')
      ];
    });
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `proefnotities_export_${date}.csv`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showToast(`Proefnotities geëxporteerd als ${filename}`, 'success');
  },

  // ============================================================================
  // USER MANAGEMENT & DIRECTORY
  // ============================================================================
  showUsers: function() {
    if (!appState.isLoggedIn || !appState.currentUserId) {
      this.showUserSelector();
      return;
    }
    appState.currentView = 'users';
    this.hideAllViews();
    this.updateNavigation('users');
    document.getElementById('usersView').style.display = 'block';
    
    // Update header actions based on admin status
    const headerActions = document.getElementById('usersHeaderActions');
    if (headerActions) {
      if (this.isAdmin()) {
        headerActions.innerHTML = '<button class="btn btn--primary" onclick="app.showUserForm()">+ Voeg gebruiker toe</button>';
      } else {
        headerActions.innerHTML = '';
      }
    }
    
    this.renderUsers();
  },

  viewUserKelder: function(userId) {
    const user = appState.users.find(u => u.id === userId);
    if (!user) {
      this.showToast('Gebruiker niet gevonden');
      return;
    }
    
    appState.currentView = 'viewUserKelder';
    this.hideAllViews();
    document.getElementById('viewUserKelderView').style.display = 'block';
    
    const userWines = appState.wines.filter(w => w.user_id === userId);
    const userLocations = appState.locations.filter(l => l.user_id === userId);
    const userTastings = appState.tastingNotes.filter(t => t.user_id === userId);
    
    document.getElementById('viewUserKelderTitle').textContent = `Wijnkelder van ${user.name}`;
    
    const container = document.getElementById('viewUserKelderContainer');
    if (!container) return;
    
    const totalBottles = userWines.reduce((sum, w) => sum + (w.aantal_flessen || 0), 0);
    const totalValue = userWines.reduce((sum, w) => (w.price_per_bottle || 0) * (w.aantal_flessen || 0) + sum, 0);
    
    let html = `
      <div class="user-kelder-header">
        <div class="user-kelder-avatar" style="background: ${user.color};"></div>
        <div class="user-kelder-info">
          <h2>${user.name} ${user.role === 'admin' ? '<span class="admin-badge">👑 Admin</span>' : ''}</h2>
          <p>${user.email || 'Geen email'}</p>
          <div class="user-kelder-stats">
            <span>🍷 ${userWines.length} wijn${userWines.length !== 1 ? 'en' : ''}</span>
            <span>🍾 ${totalBottles} fles${totalBottles !== 1 ? 'sen' : ''}</span>
            <span>📍 ${userLocations.length} locatie${userLocations.length !== 1 ? 's' : ''}</span>
            <span>📝 ${userTastings.length} proefnotitie${userTastings.length !== 1 ? 's' : ''}</span>
            ${totalValue > 0 ? `<span>💰 €${totalValue.toFixed(2)}</span>` : ''}
          </div>
        </div>
      </div>
      
      <div class="user-kelder-content">
    `;
    
    // Show locations
    if (userLocations.length > 0) {
      html += `
        <div class="card">
          <div class="card__body">
            <h3>📍 Locaties <span class="readonly-badge">🔒 Alleen-lezen</span></h3>
            <div style="display: flex; flex-wrap: wrap; gap: var(--space-12); margin-top: var(--space-16);">
              ${userLocations.map(loc => {
                const winesInLoc = userWines.filter(w => w.locatie === loc.name).length;
                return `
                  <div style="padding: var(--space-12); background: var(--color-bg-1); border-radius: var(--radius-base); flex: 1; min-width: 150px;">
                    <strong>${loc.name}</strong><br>
                    <small style="color: var(--color-text-secondary);">${winesInLoc} wijn${winesInLoc !== 1 ? 'en' : ''}</small>
                    ${loc.temperature ? `<br><small style="color: var(--color-text-secondary);">🌡️ ${loc.temperature}°C</small>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }
    
    // Show wines WITH TASTING NOTES
    if (userWines.length > 0) {
      html += `
        <div class="card">
          <div class="card__body">
            <h3>🍷 Wijnen &amp; Proefnotities <span class="readonly-badge">🔒 Alleen-lezen</span></h3>
            <div style="margin-top: var(--space-16); display: flex; flex-direction: column; gap: var(--space-24);">
              ${userWines.map(wine => {
                const tastings = userTastings.filter(t => t.wine_id === wine.id);
                const isOutOfStock = wine.aantal_flessen === 0;
                const price = wine.price_per_bottle || 0;
                const totalWineValue = price * (wine.aantal_flessen || 0);
                const wineExpandId = `wine-expand-${wine.id}`;
                
                return `
                  <div style="border: 1px solid var(--color-card-border); border-radius: var(--radius-lg); padding: var(--space-16); background: var(--color-surface);">
                    <div style="display: flex; gap: var(--space-16); flex-wrap: wrap;">
                      ${wine.photo_base64 ? `
                        <img src="${wine.photo_base64}" alt="${wine.naam}" style="width: 100px; height: 100px; object-fit: cover; border-radius: var(--radius-base); border: 1px solid var(--color-border);">
                      ` : ''}
                      <div style="flex: 1; min-width: 250px;">
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-8);">
                          <h4 style="margin: 0 0 var(--space-8) 0; font-size: var(--font-size-xl);">${wine.naam}</h4>
                          ${isOutOfStock ? '<span style="font-size: 24px;">📧</span>' : '<span style="font-size: 24px;">🍷</span>'}
                        </div>
                        <p style="margin: var(--space-4) 0;"><strong>${wine.wijnhuis}</strong></p>
                        <p style="margin: var(--space-4) 0; color: var(--color-text-secondary);">${wine.vintage} • ${wine.streek} • ${wine.druif}</p>
                        <div style="display: flex; gap: var(--space-8); flex-wrap: wrap; margin-top: var(--space-12);">
                          ${wine.kleur ? `<span class="kleur-badge kleur-badge--${wine.kleur.toLowerCase()}">${wine.kleur}</span>` : ''}
                          <span class="location-badge">${wine.locatie}</span>
                          <span class="stock-badge ${isOutOfStock ? 'stock-badge--out' : 'stock-badge--in'}">
                            ${wine.aantal_flessen} fles${wine.aantal_flessen !== 1 ? 'sen' : ''}
                          </span>
                        </div>
                        ${price > 0 ? `<p style="color: var(--color-primary); font-weight: var(--font-weight-medium); margin-top: var(--space-8);">€${price.toFixed(2)}/fles • €${totalWineValue.toFixed(2)} totaal</p>` : ''}
                      </div>
                    </div>
                    
                    ${tastings.length > 0 ? `
                      <div style="margin-top: var(--space-16); padding-top: var(--space-16); border-top: 1px solid var(--color-border);">
                        <button class="btn btn--sm btn--secondary" onclick="app.toggleTastingNotes('${wineExpandId}')" style="width: 100%;">
                          📝 Proefnotities (${tastings.length}) - Klik om te tonen/verbergen
                        </button>
                        <div id="${wineExpandId}" style="display: none; margin-top: var(--space-16);">
                          ${tastings.sort((a, b) => new Date(b.datum) - new Date(a.datum)).map(tasting => {
                            const autoStars = tasting.automatic_stars || 0;
                            const manualStars = tasting.manual_stars || 0;
                            const totalHalfStars = autoStars + manualStars;
                            const starsDisplay = this.renderStars(totalHalfStars, true, autoStars);
                            const date = new Date(tasting.datum).toLocaleDateString('nl-NL', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            });
                            const creatorName = this.getUserName(tasting.user_id);
                            const creator = appState.users.find(u => u.id === tasting.user_id);
                            const creatorColor = creator ? creator.color : '#999';
                            
                            return `
                              <div style="background: var(--color-bg-2); padding: var(--space-16); border-radius: var(--radius-base); margin-bottom: var(--space-12); border: 1px solid var(--color-border);">
                                <div style="display: flex; align-items: center; gap: var(--space-8); margin-bottom: var(--space-12);">
                                  <span style="display: inline-block; width: 16px; height: 16px; border-radius: 50%; background: ${creatorColor}; border: 2px solid var(--color-border);"></span>
                                  <strong>${creatorName}</strong>
                                  <span style="color: var(--color-text-secondary);">•</span>
                                  <span style="color: var(--color-text-secondary);">📅 ${date}</span>
                                </div>
                                <div style="font-size: 1.5em; margin: var(--space-12) 0; line-height: 1.2;">${starsDisplay}</div>
                                <p style="margin: var(--space-8) 0;"><strong>Totaal:</strong> ${this.formatStarCount(totalHalfStars)}</p>
                                ${tasting.notities ? `<p style="margin-top: var(--space-12); padding: var(--space-12); background: var(--color-surface); border-radius: var(--radius-sm);">${tasting.notities}</p>` : ''}
                                <details style="margin-top: var(--space-12);">
                                  <summary style="cursor: pointer; color: var(--color-primary); font-weight: var(--font-weight-medium);">Bekijk details</summary>
                                  <div style="margin-top: var(--space-12); padding: var(--space-12); background: var(--color-surface); border-radius: var(--radius-sm);">
                                    <p style="margin: var(--space-4) 0;"><strong>Type:</strong> ${tasting.wijntype} - ${tasting.kleur}</p>
                                    <p style="margin: var(--space-4) 0;"><strong>Geurintensiteit:</strong> ${tasting.geurintensiteit}</p>
                                    ${tasting.geur_primair && tasting.geur_primair.length > 0 ? `<p style="margin: var(--space-4) 0;"><strong>Primaire aroma's:</strong> ${tasting.geur_primair.join(', ')}</p>` : ''}
                                    <p style="margin: var(--space-4) 0;"><strong>Body:</strong> ${tasting.body}</p>
                                    <p style="margin: var(--space-4) 0;"><strong>Afdronk:</strong> ${tasting.afdronk}</p>
                                  </div>
                                </details>
                              </div>
                            `;
                          }).join('')}
                        </div>
                      </div>
                    ` : '<p style="margin-top: var(--space-16); color: var(--color-text-secondary); text-align: center;">Nog geen proefnotities voor deze wijn</p>'}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    } else {
      html += '<div class="empty-state">Deze gebruiker heeft nog geen wijnen toegevoegd</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
  },
  
  toggleTastingNotes: function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
  },

  renderUsers: function() {
    const container = document.getElementById('usersContainer');
    if (!container) return;
    
    if (appState.users.length === 0) {
      container.innerHTML = '<div class="empty-stat">Geen gebruikers gevonden</div>';
      return;
    }
    
    const isAdmin = this.isAdmin();
    
    // TWO DIFFERENT VIEWS:
    // 1. Admin view: Management panel + directory
    // 2. Regular user view: Directory only with "Bekijk kelder" buttons
    
    let html = '';
    
    if (isAdmin) {
      // ADMIN VIEW: Show management panel
      html += '<div style="margin-bottom: var(--space-32);">';
      html += '<h3 style="margin-bottom: var(--space-16); font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);">👑 Gebruikersbeheer (Admin)</h3>';
      html += appState.users.map(user => {
        const wineCount = appState.wines.filter(w => w.user_id === user.id).length;
        const tastingCount = appState.tastingNotes.filter(t => t.user_id === user.id).length;
        const isCurrentUser = user.id === appState.currentUserId;
        
        return `
          <div class="user-card">
            <div class="user-card-color" style="background: ${user.color};"></div>
            <div class="user-card-info">
              <h3>${user.name} ${isCurrentUser ? '(jij)' : ''} ${user.role === 'admin' ? '<span class="admin-badge">👑 Admin</span>' : ''}</h3>
              <p>${user.email || 'Geen email'}</p>
              <p style="margin-top: var(--space-4);">${wineCount} wijn${wineCount !== 1 ? 'en' : ''}, ${tastingCount} proefnotitie${tastingCount !== 1 ? 's' : ''}</p>
            </div>
            <div class="user-card-actions">
              <button class="btn btn--sm btn--secondary" onclick="app.showUserForm(${user.id})">✏️ Bewerken</button>
              ${appState.users.length > 1 ? `<button class="btn btn--sm btn--outline" onclick="app.deleteUser(${user.id})">🗑️ Verwijderen</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
      html += '</div>';
      
      // Add user directory below management panel
      html += '<div style="border-top: 2px solid var(--color-border); padding-top: var(--space-24); margin-top: var(--space-24);">';
      html += '<h3 style="margin-bottom: var(--space-16); font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);">👥 Gebruikersdirectory</h3>';
    }
    
    // USER DIRECTORY (shown to both admins and regular users)
    html += appState.users.map(user => {
      const wineCount = appState.wines.filter(w => w.user_id === user.id).length;
      const tastingCount = appState.tastingNotes.filter(t => t.user_id === user.id).length;
      const isCurrentUser = user.id === appState.currentUserId;
      const totalBottles = appState.wines.filter(w => w.user_id === user.id).reduce((sum, w) => sum + (w.aantal_flessen || 0), 0);
      
      return `
        <div class="user-card">
          <div class="user-card-color" style="background: ${user.color};"></div>
          <div class="user-card-info">
            <h3>${user.name} ${isCurrentUser ? '(jij)' : ''} ${user.role === 'admin' ? '<span class="admin-badge">👑 Admin</span>' : ''}</h3>
            <p>${user.email || 'Geen email'}</p>
            <p style="margin-top: var(--space-4);">
              🍷 ${wineCount} wijn${wineCount !== 1 ? 'en' : ''} • 
              🍾 ${totalBottles} fles${totalBottles !== 1 ? 'sen' : ''} • 
              📝 ${tastingCount} proefnotitie${tastingCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div class="user-card-actions">
            ${!isCurrentUser ? `
              <button class="btn btn--sm btn--primary" onclick="app.viewUserKelder(${user.id})">
                🔍 Bekijk kelder
              </button>
            ` : `
              <button class="btn btn--sm btn--secondary" disabled style="opacity: 0.5; cursor: not-allowed;">
                Dit ben jij
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
    
    if (isAdmin) {
      html += '</div>'; // Close directory section
    }
    
    container.innerHTML = html;
  },

  showUserForm: function(userId = null) {
    // Check if user is admin
    if (!this.isAdmin()) {
      this.showToast('Alleen administrators kunnen gebruikers beheren', 'error');
      return;
    }
    
    const modal = document.getElementById('userFormModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    if (userId) {
      const user = appState.users.find(u => u.id === userId);
      if (!user) {
        this.showToast('Gebruiker niet gevonden');
        return;
      }
      document.getElementById('userFormTitle').textContent = 'Gebruiker Bewerken';
      document.getElementById('userId').value = user.id;
      document.getElementById('userName').value = user.name;
      document.getElementById('userEmail').value = user.email || '';
      
      const colorRadio = document.querySelector(`input[name="userColor"][value="${user.color}"]`);
      if (colorRadio) colorRadio.checked = true;
    } else {
      document.getElementById('userFormTitle').textContent = 'Nieuwe Gebruiker';
      document.getElementById('userForm').reset();
      document.getElementById('userId').value = '';
    }
  },

  closeUserForm: function() {
    const modal = document.getElementById('userFormModal');
    if (modal) modal.style.display = 'none';
  },

  saveUser: async function(event) {
    event.preventDefault();
    
    // Check if user is admin
    if (!this.isAdmin()) {
      this.showToast('Alleen administrators kunnen gebruikers beheren', 'error');
      return;
    }
    
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const color = document.querySelector('input[name="userColor"]:checked')?.value;
    const userIdInput = document.getElementById('userId').value;
    
    // Validation
    if (!name) {
      this.showToast('Vul een naam in');
      document.getElementById('userName').focus();
      return;
    }
    
    if (!color) {
      this.showToast('Selecteer een kleur');
      return;
    }
    
    if (email && !email.includes('@')) {
      this.showToast('Voer een geldig e-mailadres in');
      document.getElementById('userEmail').focus();
      return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    
    try {
      if (userIdInput) {
        // Edit existing user
        const userId = parseInt(userIdInput);
        const existingUser = appState.users.find(u => u.id === userId);
        const userData = { 
          id: userId, 
          name, 
          email, 
          color,
          role: existingUser ? existingUser.role : 'user'
        };
        
        console.log(`[saveUser] Updating user ID ${userId}`, userData);
        
        const updatedUser = await api.put(`/users/${userId}`, userData);
        const index = appState.users.findIndex(u => u.id === userId);
        if (index !== -1) appState.users[index] = updatedUser;
        
        this.showToast('Gebruiker bijgewerkt', 'success');
      } else {
        // Create new user
        const newId = this.getNextUserId();
        const userData = { id: newId, name, email, color, role: 'user' };
        
        console.log(`[saveUser] Creating new user with ID ${newId}`, userData);
        
        const newUser = await api.post('/users', userData);
        appState.users.push(newUser);
        
        this.showToast('Gebruiker toegevoegd', 'success');
      }
      
      this.closeUserForm();
      this.updateCurrentUserDisplay();
      this.renderUsers();
      
    } catch (error) {
      console.error('Failed to save user:', error);
      this.showToast(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  },

  deleteUser: async function(userId) {
    // Check if user is admin
    if (!this.isAdmin()) {
      this.showToast('Alleen administrators kunnen gebruikers verwijderen', 'error');
      return;
    }
    
    if (appState.users.length <= 1) {
      this.showToast('Er moet minimaal 1 gebruiker zijn');
      return;
    }
    
    if (userId === appState.currentUserId) {
      this.showToast('Je kunt de actieve gebruiker niet verwijderen');
      return;
    }
    
    const user = appState.users.find(u => u.id === userId);
    if (!user) return;
    
    const userWines = appState.wines.filter(w => w.user_id === userId).length;
    const userTastings = appState.tastingNotes.filter(t => t.user_id === userId).length;
    
    let confirmMessage = `Weet je zeker dat je gebruiker "${user.name}" wilt verwijderen?`;
    if (userWines > 0 || userTastings > 0) {
      confirmMessage += `\n\nLet op: Deze gebruiker heeft ${userWines} wijn${userWines !== 1 ? 'en' : ''} en ${userTastings} proefnotitie${userTastings !== 1 ? 's' : ''}. Deze blijven bestaan.`;
    }
    
    if (confirm(confirmMessage)) {
      try {
        console.log(`[deleteUser] Deleting user ID ${userId}`);
        await api.delete(`/users/${userId}`);
        
        appState.users = appState.users.filter(u => u.id !== userId);
        this.showToast('Gebruiker verwijderd', 'success');
        this.renderUsers();
        
      } catch (error) {
        console.error('Failed to delete user:', error);
        this.showToast(error.message, 'error');
      }
    }
  },

  showSettings: function() {
    if (!appState.isLoggedIn || !appState.currentUserId) {
      this.showUserSelector();
      return;
    }
    appState.currentView = 'settings';
    this.hideAllViews();
    this.updateNavigation('settings');
    document.getElementById('settingsView').style.display = 'block';
  },

  // ============================================================================
  // EXTENSIONS VIEW
  // ============================================================================
  showExtensions: function() {
    appState.currentView = 'extensions';
    this.hideAllViews();
    this.updateNavigation('extensions');
    document.getElementById('extensionsView').style.display = 'block';
  },

  // ============================================================================
  // FILTER & SEARCH
  // ============================================================================
  filterWines: function() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
      console.warn('[filterWines] Search input not found');
      this.renderWines();
      return;
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    let filtered = this.getFilteredWines();
    
    if (searchTerm) {
      console.log(`[filterWines] Searching for: "${searchTerm}"`);
      filtered = filtered.filter(wine => {
        const naam = (wine.naam || '').toLowerCase();
        const wijnhuis = (wine.wijnhuis || '').toLowerCase();
        const streek = (wine.streek || '').toLowerCase();
        const druif = (wine.druif || '').toLowerCase();
        const locatie = (wine.locatie || '').toLowerCase();
        const vintage = (wine.vintage || '').toString();
        
        return naam.includes(searchTerm) ||
               wijnhuis.includes(searchTerm) ||
               streek.includes(searchTerm) ||
               druif.includes(searchTerm) ||
               locatie.includes(searchTerm) ||
               vintage.includes(searchTerm);
      });
      console.log(`[filterWines] Found ${filtered.length} wines matching "${searchTerm}"`);
    }

    this.renderWines(filtered);
  },

  // ============================================================================
  // API CONFIGURATION UI
  // ============================================================================
  showApiConfig: function() {
    const modal = document.getElementById('apiConfigModal');
    if (modal) {
      modal.style.display = 'flex';
      document.getElementById('apiUrlInput').value = API_CONFIG.baseURL;
      document.getElementById('connectionTestResult').style.display = 'none';
    }
  },

  closeApiConfig: function() {
    const modal = document.getElementById('apiConfigModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  testApiConnection: async function() {
    const urlInput = document.getElementById('apiUrlInput');
    const testResult = document.getElementById('connectionTestResult');
    const testUrl = urlInput.value.trim();
    
    if (!testUrl) {
      this.showToast('Voer een URL in');
      return;
    }
    
    testResult.style.display = 'block';
    testResult.style.background = 'var(--color-bg-2)';
    testResult.style.color = 'var(--color-text)';
    testResult.innerHTML = '<p>⏳ Verbinding testen...</p>';
    
    console.log(`[testApiConnection] Testing connection to: ${testUrl}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${testUrl}/wines`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const wines = await response.json();
        console.log(`[testApiConnection] Success! Found ${wines.length} wines`);
        
        testResult.style.background = 'var(--color-bg-3)';
        testResult.innerHTML = `
          <p><strong>✅ Verbinding succesvol!</strong></p>
          <p>Gevonden: ${wines.length} wijn${wines.length !== 1 ? 'en' : ''}</p>
          <p style="font-size: var(--font-size-sm); margin-top: var(--space-8);">Klik op "Opslaan & Herladen" om deze API te gebruiken.</p>
        `;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`[testApiConnection] Failed:`, error);
      
      testResult.style.background = 'rgba(var(--color-error-rgb), 0.1)';
      testResult.style.color = 'var(--color-error)';
      
      let errorMsg = 'Verbinding mislukt';
      if (error.name === 'AbortError') {
        errorMsg = 'Timeout - server reageert niet binnen 5 seconden';
      } else if (error.message.includes('Failed to fetch')) {
        errorMsg = 'Kan server niet bereiken. Controleer of JSON Server draait.';
      } else {
        errorMsg = error.message;
      }
      
      testResult.innerHTML = `
        <p><strong>❌ ${errorMsg}</strong></p>
        <p style="font-size: var(--font-size-sm); margin-top: var(--space-8);">Probeer: http://localhost:3001 of http://127.0.0.1:3001</p>
      `;
    }
  },

  saveApiConfig: function() {
    const urlInput = document.getElementById('apiUrlInput');
    const newUrl = urlInput.value.trim();
    
    if (!newUrl) {
      this.showToast('Voer een URL in');
      return;
    }
    
    console.log(`[saveApiConfig] Saving new API URL: ${newUrl}`);
    
    API_CONFIG.baseURL = newUrl;
    window.savedApiUrl = newUrl;
    
    this.closeApiConfig();
    this.showToast('API configuratie opgeslagen. Herladen...', 'success');
    
    setTimeout(() => {
      location.reload();
    }, 1000);
  },

  // ============================================================================
  // TOAST NOTIFICATIONS
  // ============================================================================
  showToast: function(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    console.log(`[Toast ${type.toUpperCase()}] ${message}`);
    
    toast.textContent = message;
    toast.className = 'toast show';
    if (type === 'success') {
      toast.classList.add('success');
    } else if (type === 'error') {
      toast.classList.add('error');
    }
    
    // Longer timeout for error messages so user can read them
    const timeout = type === 'error' ? 6000 : 3000;
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.className = 'toast';
      }, 300);
    }, timeout);
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('='.repeat(60));
  console.log('🍷 WIJNKELDER BEHEER - DEBUG MODE ENABLED');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_CONFIG.baseURL}`);
  console.log(`Debug Mode: ${API_CONFIG.debug}`);
  console.log('Open deze console om gedetailleerde API logs te zien.');
  console.log('Klik op het verbindingsstatus icoon om API instellingen te openen.');
  console.log('='.repeat(60));
  console.log('👤 USER SELECTION: Simple user picker (no passwords)');
  console.log('Select your user on startup to continue');
  console.log('='.repeat(60));
  console.log('🍷 QUICK TASTING: Create wine + tasting note in one form');
  console.log('Use "Nieuwe Proefnotitie" button for fast wine entry');
  console.log('Wine will be created without location (can be added later)');
  console.log('='.repeat(60));
  console.log('📰 ACTIVITY FEED PERSISTENCE:');
  console.log('Activities are saved to /activities endpoint');
  console.log('Comments are saved to /comments endpoint');
  console.log('Ensure your db.json includes: "activities": [], "comments": []');
  console.log('Activity IDs start at 5000, Comment IDs start at 6000');
  console.log('Watch console for "✓ Activity saved to database" messages');
  console.log('='.repeat(60));
  
  app.init();
});