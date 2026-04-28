import { useState, useEffect } from 'react';
import { 
  MapPin, Utensils, Zap, Users, Wallet, 
  Search, ChevronDown, CheckCircle2, 
  Star, Target, BarChart4, Info, TrendingUp,
  Activity, Award, Tag, Coins, Banknote, Gem, Crown, Soup, LayoutDashboard,
  Menu, X
} from 'lucide-react';

export default function App() {
  // Model Options State
  const [modelOptions, setModelOptions] = useState({ cities: [], cuisines: [] });
  const [loading, setLoading] = useState(false);

  // Mandatory Fields
  const [city, setCity] = useState('Select city...');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  
  // Optional Fields
  const [budget, setBudget] = useState(2500); // Per person
  const [priceCategory, setPriceCategory] = useState('Affordable');
  const [minRating, setMinRating] = useState(0);
  const [services, setServices] = useState({
    tableBooking: false,
    onlineDelivery: false,
    currentlyDelivering: false
  });

  // Result State
  const [score, setScore] = useState(null);
  const [predictedRating, setPredictedRating] = useState(0);
  const [successLabel, setSuccessLabel] = useState('READY');

  // Loading Sequence State
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Ingesting Market Data...",
    "Running ML Forecasts...",
    "Computing Local Viability...",
    "Finalizing Prediction..."
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 700);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Navigation & Benchmark State
  const [activeTab, setActiveTab] = useState('Predictor');
  const [benchmarkItems, setBenchmarkItems] = useState([]);
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showCookedInfo, setShowCookedInfo] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Fetch options from backend
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    fetch(`${API_BASE}/options`)
      .then(res => res.json())
      .then(data => {
        setModelOptions(data || { cities: [], cuisines: [] });
      })
      .catch(err => console.error("Could not fetch model options", err));
  }, []);

  const handlePredict = async () => {
    // Validation
    if (!city || city === 'Select city...') {
      setValidationError("Please select a target City for the prediction.");
      setLoading(false);
      return;
    }
    if (selectedCuisines.length === 0) {
      setValidationError("Select at least one Cuisine type to proceed.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setValidationError(null);

    // Transformations
    const serviceScore = Object.values(services).filter(Boolean).length;
    const cuisinesString = selectedCuisines.join(', ');
    const avgCostForTwo = budget * 2;
    const priceRangeMap = { 'Budget': 1, 'Affordable': 2, 'Mid-range': 3, 'Fine Dining': 4 };
    
    const payload = {
      name: "New Restaurant Concept",
      city: city,
      country: 'India', // Hidden Mandatory
      cuisines: cuisinesString || "North Indian", // Default if empty
      price_label: priceCategory,
      avg_cost_for_two: avgCostForTwo,
      price_range: priceRangeMap[priceCategory] || 2,
      votes: 0, // Hidden Mandatory
      online_ordering: services.onlineDelivery,
      table_booking: services.tableBooking,
      delivering_now: services.currentlyDelivering,
      min_rating: minRating
    };

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      const safeScore = (data.popularity_percent !== undefined && !isNaN(data.popularity_percent)) ? Math.round(data.popularity_percent) : 0;
      const safeRating = (data.predicted_rating !== undefined && !isNaN(data.predicted_rating)) ? data.predicted_rating : 0;

      setScore(safeScore);
      setPredictedRating(safeRating);
      setSuccessLabel(data.success_label || 'READY');
    } catch (e) {
      console.error("Prediction failed", e);
      setValidationError(`Prediction failed: ${e.message}. Please ensure the backend is running and accessible.`);
      setScore(null);
      setPredictedRating(0);
    }
    setLoading(false);
  };

  const toggleCuisine = (c) => {
    setValidationError(null);
    setSelectedCuisines(prev => 
      prev.includes(c) ? prev.filter(item => item !== c) : [...prev, c]
    );
  };

  const toggleService = (key) => {
    setServices(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchBenchmarks = async () => {
    setLoadingBenchmarks(true);
    setValidationError(null);
    try {
      if (!city || city === 'Select city...') {
        setBenchmarkItems([]);
        setLoadingBenchmarks(false);
        return;
      }
      
      const qs = new URLSearchParams({
        city: city,
        cuisines: selectedCuisines.join(',')
      }).toString();
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/benchmarks?${qs}`);
      
      if (!response.ok) {
        throw new Error(`Benchmarks error: ${response.status}`);
      }

      const json = await response.json();
      if (json.error) throw new Error(json.error);
      setBenchmarkItems(json.data || []);
    } catch (e) {
      console.error("Could not fetch benchmarks", e);
      setValidationError(`Could not fetch benchmarks: ${e.message}`);
      setBenchmarkItems([]); 
    }
    setLoadingBenchmarks(false);
  };

  useEffect(() => {
    if (activeTab === 'Benchmarks') {
      fetchBenchmarks();
    }
  }, [activeTab, city]);

  return (
    <div className="dashboard-layout">
      <div className="content-container">
        {/* Navigation / Top Bar */}
        <div className="top-navigation">
            <div className="brand-logo-group">
               <div className="brand-icon">
                 <TrendingUp size={18} color="white" />
               </div>
               <h3 className="brand-title">Restaurant Popularity Prediction (RPP)</h3>
            </div>
            
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
               <button 
                 className="nav-btn secondary" 
                 onClick={() => { setShowCookedInfo(true); setIsMenuOpen(false); }}
               >
                 <Soup size={14} />
                 Cooked
               </button>
               <button 
                 className="nav-btn secondary" 
                 onClick={() => { setShowInfo(true); setIsMenuOpen(false); }}
               >
                 <Info size={14} />
                 Tech Stack
               </button>
            </div>
        </div>

        <div className="tab-switcher-container">
            <div className="nav-links tab-nav-links">
               <div className={`nav-slider ${activeTab === 'Benchmarks' ? 'shift' : ''}`} />
               <button 
                 className={`nav-btn ${activeTab === 'Predictor' ? 'active' : ''}`} 
                 onClick={() => setActiveTab('Predictor')}
               >
                 <Activity size={14} />
                 Predictor
               </button>
               <button 
                 className={`nav-btn ${activeTab === 'Benchmarks' ? 'active' : ''}`}
                 onClick={() => setActiveTab('Benchmarks')}
               >
                 <Award size={14} />
                 Benchmarks
               </button>
            </div>
        </div>

        {activeTab === 'Predictor' ? (
          <>
            <header className="hero-header">
               <h1>Predict <span>Success</span></h1>
               <p>Configure your restaurant concept to reveal its predicted market reception based on Zomato's historical trends.</p>
            </header>

        <main className="main-dashboard-grid">
          {/* LEFT: INPUTS */}
          <section className="premium-card">
            <h2 className="form-section-title">Configure Concept</h2>
            
            <div className="form-group">
              <label>
                <span>City / Location <span style={{color: 'var(--accent-orange)', marginLeft: 4}}>*</span></span>
                <MapPin size={14} />
              </label>
              <div className="custom-dropdown-container">
                <div 
                  className={`custom-dropdown-header ${cityDropdownOpen ? 'open' : ''}`}
                  onClick={() => { setCityDropdownOpen(!cityDropdownOpen); setCitySearch(''); }}
                >
                  {city || 'Select city...'}
                  <ChevronDown size={18} style={{transform: cityDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s'}} />
                </div>
                {cityDropdownOpen && (
                  <div className="custom-dropdown-list">
                    <div className="custom-dropdown-search-wrapper">
                      <Search size={14} className="search-icon" />
                      <input 
                        type="text" 
                        className="custom-dropdown-search" 
                        placeholder="Search cities..." 
                        value={citySearch}
                        onChange={e => setCitySearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {(() => {
                      const indiaCities = ["New Delhi", "Gurgaon", "Noida", "Faridabad", "Ghaziabad", "Ahmedabad", "Amritsar", "Bhubaneshwar", "Guwahati", "Lucknow", "Agra", "Allahabad", "Aurangabad", "Bangalore", "Bhopal", "Chennai", "Coimbatore", "Dehradun", "Goa", "Indore"].map(c => `${c}, India`);
                      const intlCities = ["Brasília", "Rio de Janeiro", "São Paulo", "Albany", "Athens", "Augusta", "Boise", "Cedar Rapids/Iowa City", "Columbus", "Dalton", "Davenport", "Des Moines", "Dubuque", "Gainesville", "Macon", "Orlando", "Pensacola", "Pocatello", "Rest of Hawaii", "Savannah"];
                      
                      const allCities = modelOptions.cities.length > 0 ? modelOptions.cities : [...indiaCities, ...intlCities];
                      const filteredCities = allCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
                      
                      const filteredIndia = indiaCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
                      const filteredIntl = intlCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));

                      return (
                        <>
                          {filteredIndia.length > 0 && (
                            <div className="dropdown-category-label">INDIA</div>
                          )}
                          {filteredIndia.map(c => (
                            <div 
                              key={c} 
                              className={`custom-dropdown-item ${city === c ? 'selected' : ''}`}
                              onClick={() => { setCity(c); setCityDropdownOpen(false); setCitySearch(''); }}
                            >
                               <MapPin size={14} />
                               {c}
                            </div>
                          ))}
                          
                          {filteredIntl.length > 0 && (
                            <div className="dropdown-category-label" style={{marginTop: 8}}>INTERNATIONAL</div>
                          )}
                          {filteredIntl.map(c => (
                            <div 
                              key={c} 
                              className={`custom-dropdown-item ${city === c ? 'selected' : ''}`}
                              onClick={() => { setCity(c); setCityDropdownOpen(false); setCitySearch(''); }}
                            >
                               <MapPin size={14} />
                               {c}
                            </div>
                          ))}
                          {filteredCities.length === 0 && (
                            <div className="custom-dropdown-item" style={{opacity: 0.5, cursor: 'default'}}>No cities found.</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>
                <span>Cuisine Focus <span style={{color: 'var(--accent-orange)', marginLeft: 4}}>*</span></span>
                <Utensils size={14} />
              </label>
              <div className="chips-group">
                {["North Indian", "Chinese", "Fast Food", "Mughlai", "Cafe", "Bakery", "South Indian", "Street Food", "Pizza", "Desserts", "Ice Cream", "Mithai", "Italian", "Continental", "American", "Mexican", "Seafood", "Thai", "Japanese", "Lebanese"].map(c => (
                  <button 
                    key={c} 
                    className={`chip-btn ${selectedCuisines.includes(c) ? 'active' : ''}`}
                    onClick={() => toggleCuisine(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {selectedCuisines.length > 0 && (
                <div style={{fontSize: 11, color: 'var(--accent-orange)', marginTop: 8}}>
                  Selected: {selectedCuisines.join(', ')}
                </div>
              )}
            </div>

            <div className="form-group">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                <label style={{margin: 0}}>Price Tier</label>
                <div className="sentiment-badge">{priceCategory} Focus</div>
              </div>
              <div className="price-tier-grid">
                {[
                  { label: 'Budget', range: '₹0-250', value: 200, icon: <Coins size={20}/> },
                  { label: 'Affordable', range: '₹250-500', value: 400, icon: <Banknote size={20}/> },
                  { label: 'Mid-range', range: '₹500-1k', value: 750, icon: <Gem size={20}/> },
                  { label: 'Fine Dining', range: '₹1k+', value: 2500, icon: <Crown size={20}/> }
                ].map(cat => (
                  <div 
                    key={cat.label} 
                    className={`price-tier-card ${priceCategory === cat.label ? 'active' : ''}`}
                    onClick={() => {
                      setPriceCategory(cat.label);
                      setBudget(cat.value);
                    }}
                  >
                    <div className="tier-icon">{cat.icon}</div>
                    <div className="tier-label">{cat.label}</div>
                    <div className="tier-range">{cat.range}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                <label style={{margin: 0}}>Budget per Person</label>
                <div style={{fontSize: 18, fontWeight: 900, color: 'var(--accent-orange)'}}>₹{budget.toLocaleString()}</div>
              </div>
              <input 
                type="range" 
                className="premium-range"
                min="200" max="5000" step="50"
                value={budget}
                onChange={e => setBudget(Number(e.target.value))}
              />
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontWeight: 800}}>
                <span>LOW COST</span>
                <span style={{color: 'var(--accent-orange)'}}>
                  {budget > 3500 ? 'LUXURY CONCEPT' : budget > 1500 ? 'PREMIUM DINING' : budget > 700 ? 'MID-TIER' : 'ECONOMY'}
                </span>
                <span>ELITE LUXURY</span>
              </div>
            </div>

            <div className="form-group">
              <label>Key Services</label>
              <div className="checkbox-grid">
                <div 
                  className={`service-toggle card ${services.tableBooking ? 'active' : ''}`}
                  onClick={() => toggleService('tableBooking')}
                >
                  <CheckCircle2 size={18} className="toggle-icon" />
                  <span>Table Booking</span>
                </div>
                <div 
                  className={`service-toggle card ${services.onlineDelivery ? 'active' : ''}`}
                  onClick={() => toggleService('onlineDelivery')}
                >
                  <Zap size={18} className="toggle-icon" />
                  <span>Online Delivery</span>
                </div>
                <div 
                  className={`service-toggle card ${services.currentlyDelivering ? 'active' : ''}`}
                  onClick={() => toggleService('currentlyDelivering')}
                >
                  <Utensils size={18} className="toggle-icon" />
                  <span>Always Delivering</span>
                </div>
              </div>
            </div>

            <div className="form-grid" style={{marginBottom: 28}}>
              <div className="form-group mb-0" style={{flex: 1.2}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                  <label style={{margin: 0}}>Minimum Experience</label>
                  <div style={{
                    fontSize: 10, 
                    padding: '2px 8px', 
                    background: minRating >= 4 ? 'var(--accent-orange)' : 'var(--card-light)', 
                    borderRadius: 4, 
                    color: minRating >= 4 ? 'white' : 'var(--text-muted)',
                    fontWeight: 800,
                    transition: 'all 0.3s'
                  }}>
                    {minRating >= 4.5 ? 'ELITE' : minRating >= 4 ? 'PREMIUM' : minRating >= 3 ? 'RELIABLE' : 'ANY'}
                  </div>
                </div>
                
                <div style={{display: 'flex', alignItems: 'center', gap: 20, background: 'rgba(255,255,255,0.03)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)', transition: 'all 0.3s'}}>
                   <div style={{display: 'flex', gap: 8, flex: 1, justifyContent: 'center'}}>
                     {[1, 2, 3, 4, 5].map(s => (
                       <Star 
                         key={s} 
                         size={24} 
                         fill={minRating >= s ? 'var(--accent-orange)' : 'transparent'} 
                         color={minRating >= s ? 'var(--accent-orange)' : 'rgba(255,255,255,0.1)'}
                         onClick={() => setMinRating(s)}
                         style={{
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                           transform: minRating === s ? 'scale(1.2)' : 'scale(1)',
                           filter: minRating >= s ? 'drop-shadow(0 0 5px var(--accent-orange-glow))' : 'none'
                         }}
                         className="hover-pop"
                       />
                     ))}
                   </div>
                   <div style={{fontSize: 22, fontWeight: 800, color: 'var(--text-main)', minWidth: 45, textAlign: 'right', borderLeft: '1px solid var(--border)', paddingLeft: 20}}>
                     {minRating}<span style={{fontSize: 14, color: 'var(--accent-orange)'}}>★</span>
                   </div>
                </div>
              </div>
            </div>

            {validationError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                color: '#ef4444', 
                padding: '12px 24px', 
                borderRadius: 12, 
                fontSize: 13, 
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                animation: 'shake 0.4s ease-out',
                fontWeight: 600
              }}>
                <Info size={16} /> {validationError}
              </div>
            )}

            <button className="btn-predict" onClick={handlePredict} disabled={loading}>
              <Zap size={20} fill="white" />
              {loading ? 'Analyzing Market...' : 'Predict market'}
            </button>
          </section>

          {/* RIGHT: RESULTS */}
          <section className={`results-container ${loading ? 'loading-blur' : ''}`}>
            {loading && (
              <div className="loading-prediction-overlay responsive-loader">
                <div className="loader-inner anim-fade-up">
                  <div className="hexagon-loader">
                    <div className="hex-inner"></div>
                  </div>
                  <div className="loading-text-container">
                     <span className="loading-step">{loadingMessages[loadingStep]}</span>
                     <div className="loading-bar-container">
                       <div className="loading-bar-fill"></div>
                     </div>
                  </div>
                </div>
              </div>
            )}
            <div className="gauge-wrapper">
              <svg className="gauge-svg" viewBox="0 0 100 100">
                <circle className="gauge-bg" cx="50" cy="50" r="45" />
                <circle 
                  className="gauge-fill" 
                  cx="50" cy="50" r="45" 
                  strokeDasharray="283" 
                  strokeDashoffset={283 - (283 * (score !== null ? score : 0)) / 100} 
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
              </svg>
              <div className="gauge-content">
                <div className="gauge-title">PREDICTED POPULARITY</div>
                <div className="gauge-value">
                  {score !== null ? score : '--'}
                  <span>%</span>
                </div>
                {score !== null && (
                  <div className="gauge-label anim-fade-up">
                     <Target size={14} /> {successLabel}
                  </div>
                )}
              </div>
            </div>

             <div className="stats-grid">
                <div className="stat-card">
                   <div className="stat-icon"><Users size={20} /></div>
                   <div className="stat-value">{score !== null ? (score * 12).toLocaleString() : '--'}</div>
                   <div className="stat-label">Est. Monthly Votes</div>
                </div>
                <div className="stat-card">
                   <div className="stat-icon"><Star size={20} /></div>
                   <div className="stat-value">{predictedRating !== 0 ? predictedRating : (score !== null ? '0.0' : '--')}</div>
                   <div className="stat-label">Predicted Rating</div>
                </div>
                <div className="stat-card" style={{background: 'linear-gradient(45deg, rgba(255,107,0,0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid var(--accent-orange-glow)'}}>
                   <div className="stat-icon"><Wallet size={20} color="var(--accent-orange)" /></div>
                   <div className="stat-value">₹{score !== null ? (score * budget * 0.8).toLocaleString() : '--'}</div>
                   <div className="stat-label">Est. Weekly Revenue</div>
                </div>
             </div>

            {score && (
              <div className="premium-card" style={{width: '100%', cursor: 'pointer', border: '1px dashed var(--accent-orange)', background: 'rgba(255,107,0,0.02)', margin: '20px 0', animation: 'fadeIn 0.5s ease-out'}} onClick={() => setActiveTab('Benchmarks')}>
                 <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                       <div style={{width: 32, height: 32, borderRadius: 8, background: 'var(--accent-orange-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <TrendingUp size={16} color="var(--accent-orange)" />
                       </div>
                       <div>
                         <div style={{fontSize: 13, fontWeight: 700, color: 'var(--text-main)'}}>Analyze the Competition</div>
                         <div style={{fontSize: 11, color: 'var(--text-muted)'}}>See how market leaders in {city} are performing</div>
                       </div>
                    </div>
                    <button className="nav-btn" style={{padding: '6px 12px', background: 'var(--accent-orange)', color: 'white', fontSize: 11}}>
                      Explore Local Leaders
                    </button>
                 </div>
              </div>
            )}

            <div className="premium-card mb-0" style={{width: '100%'}}>
               <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16}}>
                  <BarChart4 size={20} color="var(--accent-orange)" />
                  <h4 style={{fontSize: 16}}>Market Dynamics</h4>
               </div>
               <p style={{fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0}}>
                 {score !== null 
                   ? `Your concept aligns well with the ${city} market. Restaurants with a ${priceCategory} price point and similar cuisines see high engagement.` 
                   : "Adjust the parameters to see how your restaurant concept might perform in real-world conditions."}
               </p>
               {score && score < 50 && (
                 <div style={{marginTop: 16, padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: 10, color: '#ef4444', fontSize: 13}}>
                   <Info size={16} /> Look at adding more services to boost the score.
                 </div>
               )}
            </div>
          </section>
        </main>
          </>
        ) : (
          <div className="history-tab" style={{width: '100%', animation: 'fadeIn 0.5s ease-out'}}>
            <header className="hero-header" style={{marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', textAlign: 'left'}}>
               <div>
                 <h1>Market <span>Benchmarks</span></h1>
                 <p style={{margin: 0}}>Real-world restaurant success stories in {city || 'your area'}.</p>
               </div>
               <button 
                 onClick={fetchBenchmarks} 
                 className="chip-btn" 
                 style={{padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)'}}
               >
                 <TrendingUp size={14} className={loadingBenchmarks ? 'spin' : ''} />
                 {loadingBenchmarks ? 'Analyzing...' : 'Refresh Benchmarks'}
               </button>
            </header>

            {loadingBenchmarks ? (
              <div style={{textAlign: 'center', color: 'var(--text-muted)', marginTop: 40}}>Scanning local market leaders...</div>
            ) : benchmarkItems.length === 0 ? (
              <div style={{textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px solid var(--border)'}}>
                 <Search size={40} style={{opacity: 0.3, marginBottom: 16}} color="var(--accent-orange)" />
                 <h3 style={{color: 'var(--text-main)', marginBottom: 8}}>No Benchmarks Found</h3>
                 <p style={{maxWidth: 400, margin: '0 auto', fontSize: 14}}>We couldn't find top-rated restaurants matching your exact city and cuisine combination. Try adjusting your filters or selecting a different city.</p>
              </div>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24}}>
                {benchmarkItems.map((item, idx) => (
                  <div key={idx} className="premium-card benchmark-card" style={{animationDelay: `${idx * 0.1}s`}}>
                     <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12}}>
                        <div style={{flex: 1}}>
                          <div style={{fontSize: 10, color: 'var(--accent-orange)', fontWeight: 800, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase'}}>{item.city}</div>
                          <h3 style={{fontSize: 20, color: 'var(--text-main)', margin: '0 0 8px 0', fontWeight: 800}}>{item.restaurant_name}</h3>
                          <div style={{fontSize: 13, color: 'var(--text-muted)', fontWeight: 500}}>{item.cuisines}</div>
                        </div>
                        <div style={{background: 'rgba(255, 107, 0, 0.1)', color: 'var(--accent-orange)', padding: '8px 14px', borderRadius: 12, fontSize: 16, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4}}>
                          {item.rating} <Star size={14} fill="var(--accent-orange)" />
                        </div>
                     </div>
                      <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 12}}>
                        <span style={{display: 'flex', alignItems: 'center', gap: 6}}><Tag size={14}/> Price Tier: {item.price_range}</span>
                        <span>Avg. Cost: ₹{Math.round((item.avg_cost_for_two || 0) / 2).toLocaleString()} <span style={{fontSize: 10, opacity: 0.7}}>per person</span></span>
                      </div>
                  </div>
                ))}

                {/* STRATEGIC MARKET MOMENTUM CARD */}
                <div className="premium-card" style={{
                  gridColumn: '1 / -1', 
                  background: 'linear-gradient(135deg, rgba(255,107,0,0.15) 0%, rgba(0,0,0,0) 100%)', 
                  border: '1px solid var(--accent-orange-glow)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '40px'
                }}>
                   <div style={{flex: 1}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12}}>
                        <Award size={24} color="var(--accent-orange)" />
                        <h2 style={{margin: 0, fontSize: 24}}>Strategic <span>Momentum</span></h2>
                      </div>
                      <p style={{fontSize: 15, color: 'var(--text-muted)', maxWidth: 600, lineHeight: 1.6, margin: 0}}>
                        Based on the analysis of {benchmarkItems.length} market leaders in {city.split(',')[0]}, the local trend favors high-service {priceCategory} concepts. Success is driven by consistency in rating and optimized per-person expenditure.
                      </p>
                   </div>
                   <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: 48, fontWeight: 900, color: 'var(--accent-orange)', lineHeight: 1}}>
                        {(benchmarkItems.reduce((acc, curr) => acc + curr.rating, 0) / benchmarkItems.length).toFixed(1)}
                      </div>
                      <div style={{fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, marginTop: 4}}>TARGET RATING PARITY</div>
                   </div>
                </div>

                {/* ADDITIONAL PERFORMANCE BENCHMARKS */}
                <div style={{gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 12}}>
                   <div className="premium-card" style={{padding: '24px', textAlign: 'center'}}>
                      <div style={{fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 8, letterSpacing: 1}}>AVG. MARKET RATING</div>
                      <div style={{fontSize: 24, fontWeight: 900, color: 'var(--text-main)'}}>
                        {(benchmarkItems.reduce((acc, curr) => acc + curr.rating, 0) / benchmarkItems.length).toFixed(1)}
                        <span style={{fontSize: 14, color: 'var(--accent-orange)', marginLeft: 4}}>★</span>
                      </div>
                   </div>
                   <div className="premium-card" style={{padding: '24px', textAlign: 'center'}}>
                      <div style={{fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 8, letterSpacing: 1}}>PRICE DOMINANCE</div>
                      <div style={{fontSize: 18, fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase'}}>
                        {(() => {
                           const counts = {};
                           benchmarkItems.forEach(i => counts[i.price_range] = (counts[i.price_range] || 0) + 1);
                           const max = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
                           return max ? `Tier ${max[0]}` : 'N/A';
                        })()}
                      </div>
                   </div>
                   <div className="premium-card" style={{padding: '24px', textAlign: 'center'}}>
                      <div style={{fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 8, letterSpacing: 1}}>COMPETITION LEVEL</div>
                      <div style={{fontSize: 18, fontWeight: 900, color: 'var(--accent-orange)'}}>HIGH DENSITY</div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
        {showInfo && (
          <div className="info-overlay" onClick={() => setShowInfo(false)}>
            <div className="premium-card tech-modal" onClick={e => e.stopPropagation()}>
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                 <h2 style={{fontSize: 24, margin: 0}}>Technical <span>Stack</span></h2>
                 <button onClick={() => setShowInfo(false)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24}}>&times;</button>
               </div>
               <p style={{fontSize: 14, color: 'var(--text-muted)', marginBottom: 24}}>The architectural foundation of the Prediction engine.</p>
               
               <div className="tech-stack-list">
                 <div className="tech-item">
                    <div className="tech-label">Data Stack</div>
                    <div className="tech-value">Python, Pandas, Scikit-Learn (Gradient Boosting)</div>
                 </div>
                 <div className="tech-item">
                    <div className="tech-label">Cloud Stack</div>
                    <div className="tech-value">Supabase (PostgreSQL + Storage)</div>
                 </div>
                 <div className="tech-item">
                    <div className="tech-label">Frontend</div>
                    <div className="tech-value">React (Vite) + Streamlit</div>
                 </div>
               </div>

               <div style={{marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center'}}>
                 <p style={{fontSize: 11, color: 'var(--text-muted)', margin: 0, opacity: 0.6}}>
                    All information is based on Zomato's historical data.
                 </p>
               </div>

               <button 
                 className="btn-predict" 
                 style={{marginTop: 24, width: '100%'}} 
                 onClick={() => setShowInfo(false)}
               >
                 Close Overview
               </button>
            </div>
          </div>
        )}

        {showCookedInfo && (
          <div className="info-overlay" onClick={() => setShowCookedInfo(false)}>
            <div className="premium-card tech-modal" style={{maxWidth: 400}} onClick={e => e.stopPropagation()}>
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                 <h2 style={{fontSize: 24, margin: 0}}>Cooked <span>Insights</span></h2>
                 <button onClick={() => setShowCookedInfo(false)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24}}>&times;</button>
               </div>
               
               <div style={{background: 'rgba(255,107,0,0.05)', padding: 24, borderRadius: 16, border: '1px solid var(--accent-orange-glow)'}}>
                  <p style={{fontSize: 16, color: 'var(--text-main)', lineHeight: 1.6, margin: '0 0 16px 0', fontWeight: 600}}>
                    All information is based on Zomato's historical data.
                  </p>
                  <p style={{fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0}}>
                    This prediction suite is built using past data of Zomato to help identify market trends and operational success patterns.
                  </p>
               </div>

               <button 
                 className="btn-predict" 
                 style={{marginTop: 24, width: '100%'}} 
                 onClick={() => setShowCookedInfo(false)}
               >
                 Close Insights
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
