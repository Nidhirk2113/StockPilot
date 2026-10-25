import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Bell, Boxes, ChartNoAxesCombined, ChevronDown, CircleHelp, Command, Download, Ellipsis, LayoutDashboard, Menu, Package, Plus, Search, Settings2, SlidersHorizontal, Sparkles, Truck, X, Zap } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Papa from 'papaparse';
import { aggregateSalesByMonth, demoSales, normalizeSalesRows, topSellingProducts } from './sales.js';
import { initialProducts, weeklyMovement, filterProducts, getStockStatus, summarizeInventory, toCsv } from './data.js';

const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const API = import.meta.env.VITE_API_URL;

function App() {
  const [products, setProducts] = useState(initialProducts);
  const [sales, setSales] = useState(demoSales);
  const [page, setPage] = useState('Overview');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [status, setStatus] = useState('All items');
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => {
    if (!API) return;
    let active = true;
    fetch(`${API}/sales`).then(response => response.ok ? response.json() : Promise.reject(new Error('Could not load saved sales')))
      .then(payload => { if (active && Array.isArray(payload.data) && payload.data.length) setSales(payload.data); })
      .catch(() => { if (active) setNotice('Showing demo sales until the API is available'); });
    return () => { active = false; };
  }, []);
  const summary = summarizeInventory(products);
  const filtered = useMemo(() => filterProducts(products, { query, category, status }), [products, query, category, status]);

  async function request(path, options = {}) {
    if (!API) return null;
    const response = await fetch(path.startsWith('/api') ? path.replace('/api', API) : `${API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Request failed');
    }
    return response.status === 204 ? null : response.json();
  }

  async function addProduct(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newProduct = {
      name: String(data.get('name')).trim(),
      sku: String(data.get('sku')).trim(),
      category: String(data.get('category')),
      price: Number(data.get('price')),
      stock: Number(data.get('stock')),
      reorderAt: Number(data.get('reorderAt'))
    };
    if (!newProduct.name || !newProduct.sku || !Number.isFinite(newProduct.price) || newProduct.price < 0 || !Number.isInteger(newProduct.stock) || newProduct.stock < 0 || !Number.isInteger(newProduct.reorderAt) || newProduct.reorderAt < 0) {
      setNotice('Check product details and quantities');
      return;
    }
    try {
      const saved = await request('/api/products', { method: 'POST', body: JSON.stringify(newProduct) });
      if (saved?.data) setProducts(current => [saved.data, ...current]);
      else setProducts(current => [{ ...newProduct, id: crypto.randomUUID() }, ...current]);
      setModal(false);
      setNotice(`${newProduct.name} added to inventory`);
      setPage('Products');
      event.currentTarget.reset();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function adjustStock(id, delta) {
    const current = products.find(product => product.id === id);
    if (!current || current.stock + delta < 0) return;
    try {
      const saved = await request(`/api/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ delta }) });
      setProducts(items => items.map(product => product.id === id ? { ...product, ...(saved?.data || { stock: current.stock + delta }) } : product));
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function deleteProduct(id) {
    try {
      await request(`/api/products/${id}`, { method: 'DELETE' });
      setProducts(items => items.filter(product => product.id !== id));
      setNotice('Product removed from inventory');
    } catch (error) {
      setNotice(error.message);
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'stockpilot-inventory.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Inventory CSV exported');
  }

  const nav = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Products', icon: Package },
    { name: 'Sales', icon: ChartNoAxesCombined },
    { name: 'Stock movements', icon: Activity },
    { name: 'Suppliers', icon: Truck }
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Command size={20} /></div><span>stockpilot<span className="brand-dot">.</span></span><button className="icon-btn mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="workspace"><div className="workspace-avatar">N</div><div><strong>Northstar Studio</strong><small>Workspace · Pro plan</small></div><ChevronDown size={15} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.name} className={`nav-item ${page === item.name ? 'active' : ''}`} onClick={() => { setPage(item.name); setMobileNav(false); }}><item.icon size={18} /><span>{item.name}</span>{item.name === 'Products' && <span className="nav-count">{products.length}</span>}</button>)}</nav>
      <div className="nav-label second">PREFERENCES</div>
      <button className="nav-item" onClick={() => setNotice('Settings are planned for a future release')}><Settings2 size={18} /><span>Settings</span></button>
      <button className="nav-item" onClick={() => setNotice('Help documentation is available in the README')}><CircleHelp size={18} /><span>Help & support</span></button>
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={17} /></div><strong>Make room to grow.</strong><p>Get more insights with StockPilot Pro.</p><button onClick={() => setNotice('You are previewing the StockPilot workspace')}>Explore Pro <ArrowUpRight size={14} /></button></div><div className="profile"><div className="profile-avatar">NK</div><div className="profile-meta"><strong>Workspace admin</strong><small>StockPilot demo</small></div><Ellipsis size={19} /></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumbs">Workspace <span>/</span> <strong>{page}</strong></div><div className="top-actions"><div className="live-pill"><span /> {API ? 'API configured' : 'Demo data mode'}</div><button className="icon-btn notification" aria-label="Notifications" onClick={() => setNotice(`${summary.lowStock + summary.outOfStock} stock alerts need attention`)}><Bell size={18} />{summary.lowStock + summary.outOfStock > 0 && <i />}</button><div className="top-divider" /><div className="top-user">SP</div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> INVENTORY INTELLIGENCE / DAILY SNAPSHOT</div><h1>{page === 'Overview' ? 'Your stock, in focus' : page === 'Sales' ? 'Sales, in context' : page}<span className="heading-spark">✳</span></h1><p>{page === 'Overview' ? 'A clearer view of what is moving, what is ready, and what needs attention.' : page === 'Sales' ? 'Import sales files, track revenue and volume, and spot your best-performing products.' : 'Keep your inventory organized, accurate, and moving.'}</p></div><div className="heading-actions"><button className="btn btn-secondary" onClick={page === 'Sales' ? () => exportSalesCsv(sales, setNotice) : exportCsv}><Download size={16} /> {page === 'Sales' ? 'Export sales' : 'Export report'}</button><button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={17} /> Add product</button></div></div>
        {page === 'Overview' ? <>
          <div className="insight-banner"><div className="insight-symbol"><Zap size={19} fill="currentColor" /></div><div><strong>{summary.lowStock + summary.outOfStock ? 'A few products need attention.' : 'Your inventory is looking healthy.'}</strong><span>{summary.lowStock + summary.outOfStock ? `${summary.lowStock + summary.outOfStock} items are at or below their reorder point.` : 'All products are above their reorder points.'} <button onClick={() => { setPage('Products'); setStatus('Low stock'); }}>Review stock alerts <ArrowUpRight size={13} /></button></span></div><div className="banner-decoration">✳</div></div>
          <section className="stats-grid"><Stat label="Inventory value" value={money(summary.value)} change="+8.2%" up detail="sample portfolio data" icon={Boxes} accent="purple" /><Stat label="Units in stock" value={summary.units.toLocaleString()} change="Tracked" up detail="across the catalog" icon={Package} accent="mint" /><Stat label="Items needing attention" value={String(summary.lowStock + summary.outOfStock).padStart(2, '0')} change={summary.outOfStock ? `${summary.outOfStock} out of stock` : 'Reorder watch'} up={false} detail="low and empty stock" icon={Activity} accent="orange" /><Stat label="Products tracked" value={String(products.length).padStart(2, '0')} change="Catalog" up detail="products in workspace" icon={ChartNoAxesCombined} accent="blue" /></section>
          <section className="analytics-grid"><div className="panel movement-panel"><div className="panel-heading"><div><h2>Inventory movement</h2><p>Stock received vs. stock dispatched · sample week</p></div><span className="select-button">Last 7 days <ChevronDown size={14} /></span></div><div className="chart-legend"><span><i className="legend-in" /> Stock in</span><span><i className="legend-out" /> Stock out</span><strong>Weekly view <ArrowUpRight size={14} /></strong></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weeklyMovement} margin={{ top: 10, right: 4, left: -25, bottom: 0 }}><defs><linearGradient id="inFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a18bfa" stopOpacity={0.25} /><stop offset="100%" stopColor="#a18bfa" stopOpacity={0} /></linearGradient><linearGradient id="outFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7ce7c1" stopOpacity={0.2} /><stop offset="100%" stopColor="#7ce7c1" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eeeef4" vertical={false} strokeDasharray="4 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9999a9', fontSize: 11 }} dy={10} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #eeeef4', fontSize: 12 }} /><Area type="monotone" dataKey="inbound" name="Stock in" stroke="#9a83f6" strokeWidth={2.5} fill="url(#inFill)" /><Area type="monotone" dataKey="outbound" name="Stock out" stroke="#59d6ad" strokeWidth={2.5} fill="url(#outFill)" /></AreaChart></ResponsiveContainer></div></div>
          <div className="panel alerts-panel"><div className="panel-heading"><div><h2>Needs attention <span className="tiny-count">{summary.lowStock + summary.outOfStock}</span></h2><p>Keep the next stockout off the schedule</p></div><button className="round-arrow" aria-label="View products" onClick={() => { setPage('Products'); setStatus('Low stock'); }}><ArrowUpRight size={17} /></button></div><div className="alert-list">{products.filter(p => getStockStatus(p) !== 'In stock').slice(0, 4).map(product => <div className="alert-row" key={product.id}><div className="product-glyph violet"><Package size={17} /></div><div className="alert-product"><strong>{product.name}</strong><small>{product.sku}</small></div><div className="alert-qty"><strong>{product.stock} left</strong><span className={product.stock === 0 ? 'status-out' : 'status-low'}>{getStockStatus(product)}</span></div></div>)}{summary.lowStock + summary.outOfStock === 0 && <div className="empty-state compact">No stock alerts right now. Nice work.</div>}</div><button className="text-link" onClick={() => { setPage('Products'); setStatus('Low stock'); }}>View stock alerts <ArrowUpRight size={14} /></button></div></section>
          <section className="panel products-panel"><div className="panel-heading product-panel-heading"><div><h2>Product overview</h2><p>A quick look at your catalog</p></div><button className="text-link" onClick={() => setPage('Products')}>View all products <ArrowUpRight size={14} /></button></div><ProductTable products={products.slice(0, 5)} onStock={adjustStock} /></section>
        </> : page === 'Sales' ? <SalesDashboard sales={sales} setSales={setSales} api={API} setNotice={setNotice} /> : <section className="panel full-products"><div className="panel-heading"><div><h2>{page === 'Products' ? 'Product catalog' : page}</h2><p>{page === 'Products' ? 'Search your catalog, review stock, and make updates.' : 'This workspace area is planned for the next release.'}</p></div><span className="total-tag">{products.length} products</span></div>{page === 'Products' ? <><div className="table-toolbar"><div className="search-box"><Search size={16} /><input aria-label="Search products" placeholder="Search products, SKU..." value={query} onChange={event => setQuery(event.target.value)} />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}</div><div className="filter-controls"><SlidersHorizontal size={15} /><select aria-label="Filter by category" value={category} onChange={event => setCategory(event.target.value)}><option>All categories</option>{[...new Set(products.map(product => product.category))].map(item => <option key={item}>{item}</option>)}</select><select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)}><option>All items</option><option>In stock</option><option>Low stock</option><option>Out of stock</option></select></div></div><ProductTable products={filtered} onStock={adjustStock} onDelete={deleteProduct} />{filtered.length === 0 && <div className="empty-state">No products match those filters. Try a different search.</div>}</> : <div className="coming-soon"><div className="coming-icon"><Sparkles size={24} /></div><h3>More visibility. Less busywork.</h3><p>Supplier workflows and stock movement history are planned for the next release.</p><button className="btn btn-primary" onClick={() => setPage('Overview')}>Back to overview</button></div>}</section>}
        <footer className="footer"><span>© 2026 StockPilot</span><span><i /> Inventory intelligence, in your corner.</span><span>Built for momentum <span className="footer-heart">✳</span></span></footer>
      </div>
    </main>
    {modal && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setModal(false)}><form className="modal" onSubmit={addProduct}><div className="modal-head"><div><span className="modal-kicker">CATALOG MANAGEMENT</span><h2>Add a new product</h2><p>Enter the essentials to add an item to your inventory.</p></div><button type="button" className="icon-btn" aria-label="Close modal" onClick={() => setModal(false)}><X size={19} /></button></div><label>Product name<input name="name" placeholder="e.g. Wireless mouse" required maxLength="120" /></label><div className="form-row"><label>SKU<input name="sku" placeholder="e.g. TEC-105" required maxLength="40" pattern="[A-Za-z0-9_-]+" title="Use letters, numbers, hyphens, or underscores" /></label><label>Category<select name="category"><option>Electronics</option><option>Accessories</option><option>Home & Living</option><option>Office</option></select></label></div><div className="form-row three"><label>Unit price ($)<input name="price" type="number" min="0" step="0.01" defaultValue="25" required /></label><label>Stock quantity<input name="stock" type="number" min="0" step="1" defaultValue="10" required /></label><label>Reorder at<input name="reorderAt" type="number" min="0" step="1" defaultValue="5" required /></label></div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" type="submit"><Plus size={16} /> Add product</button></div></form></div>}
    {notice && <div className="toast" role="status"><span className="toast-check">✓</span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
  </div>;
}



function exportSalesCsv(sales, setNotice) {
  const escapeCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [['Date', 'Product', 'Category', 'Units sold', 'Revenue', 'Source'], ...sales.map(s => [s.date, s.product ?? s.productName, s.category, s.unitsSold, s.revenue ?? '', s.source])];
  const blob = new Blob([rows.map(row => row.map(escapeCell).join(',')).join('\\r\\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'stockpilot-sales.csv';
  anchor.click();
  URL.revokeObjectURL(url);
  setNotice('Sales report exported');
}

function SalesDashboard({ sales, setSales, api, setNotice }) {
  const [fileName, setFileName] = useState('');
  const [pendingSales, setPendingSales] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const monthly = useMemo(() => aggregateSalesByMonth(sales).map(item => ({
    ...item,
    label: new Date(`${item.month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  })), [sales]);
  const topProducts = useMemo(() => topSellingProducts(sales, 6).map(item => ({
    ...item,
    shortProduct: item.product.length > 18 ? `${item.product.slice(0, 16)}…` : item.product
  })), [sales]);
  const revenue = sales.reduce((sum, item) => sum + (item.revenue === null || item.revenue === undefined ? 0 : Number(item.revenue) || 0), 0);
  const units = sales.reduce((sum, item) => sum + (Number(item.unitsSold) || 0), 0);
  const revenueCount = sales.filter(item => item.revenue !== null && item.revenue !== undefined && item.revenue !== '').length;

  function chooseFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setNotice('Please choose a CSV file');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setNotice('CSV must be 8 MB or smaller');
      return;
    }
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const normalized = normalizeSalesRows(results.data, file.name);
        setPendingSales(normalized.records);
        setImportErrors(normalized.errors);
        if (!normalized.records.length) setNotice('No valid sales rows found. Check the CSV columns.');
        else setNotice(`Ready to import ${normalized.records.length.toLocaleString()} sales rows`);
      },
      error: () => setNotice('Could not read this CSV file')
    });
  }

  async function importSales() {
    if (!pendingSales.length) return;
    setIsImporting(true);
    try {
      let imported;
      if (api) {
        const response = await fetch(`${api}/sales/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: pendingSales })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Sales import failed');
        imported = payload.data;
      } else {
        imported = pendingSales.map((record, index) => ({ ...record, id: `upload-${Date.now()}-${index}` }));
      }
      setSales(current => [...current, ...imported]);
      setNotice(`Imported ${imported.length.toLocaleString()} sales rows${importErrors.length ? `; skipped ${importErrors.length} invalid rows` : ''}${api ? '' : ' (demo session only — connect the API to save permanently)'}`);
      setPendingSales([]);
      setImportErrors([]);
      setFileName('');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setIsImporting(false);
    }
  }

  function downloadTemplate() {
    const template = 'date,product,category,units_sold,revenue\\n2026-10-01,Wireless Mouse,Electronics,12,479.88\\n2026-10-02,Studio Headphones,Electronics,8,1199.92\\n';
    const url = URL.createObjectURL(new Blob([template], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'stockpilot-sales-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="sales-page">
    <div className="sales-intro"><div><span className="sales-kicker"><ChartNoAxesCombined size={14} /> SALES INTELLIGENCE</span><h2>From transactions to trends.</h2><p>Bring in your sales CSV and see volume, revenue, and product momentum in one place.</p></div><div className="sales-data-pill"><span /> {sales.length.toLocaleString()} records tracked</div></div>
    <section className="sales-upload panel">
      <div className="upload-icon"><Download size={20} /></div>
      <div className="upload-copy"><h3>Upload sales data</h3><p>Import an existing CSV, append it to your history, and refresh the charts. Existing records stay intact.</p><div className="upload-hints"><span>CSV format</span><span>Up to 8 MB</span><button className="text-link" onClick={downloadTemplate}>Download sample template <ArrowDownRight size={13} /></button></div></div>
      <label className="btn btn-secondary upload-button">Choose CSV<input type="file" accept=".csv,text/csv" aria-label="Choose sales CSV file" onChange={event => { chooseFile(event.target.files?.[0]); event.target.value = ''; }} /></label>
      {fileName && <div className="upload-preview"><div><strong>{fileName}</strong><span>{pendingSales.length.toLocaleString()} valid rows · {importErrors.length.toLocaleString()} invalid rows</span></div><button className="btn btn-primary" disabled={!pendingSales.length || isImporting} onClick={importSales}>{isImporting ? 'Importing…' : `Import ${pendingSales.length.toLocaleString()} rows`}</button></div>}
      {importErrors.length > 0 && <details className="import-errors"><summary>Review first {Math.min(importErrors.length, 5)} validation issue(s)</summary>{importErrors.slice(0, 5).map(error => <p key={error.row}>Row {error.row}: {error.message}</p>)}</details>}
      <p className="csv-help">Accepted columns: <code>date, product, category, units_sold, revenue</code>. Also recognizes the uploaded vgsales format (<code>Name, Genre, Year, Global_Sales</code>); its global sales are treated as unit volume, not revenue.</p>
    </section>
    <section className="stats-grid sales-stats">
      <Stat label="Sales revenue" value={money(revenue)} change="From rows with revenue" up detail={`${revenueCount.toLocaleString()} revenue records`} icon={Boxes} accent="purple" />
      <Stat label="Units sold" value={units.toLocaleString()} change="All imported rows" up detail="sales volume tracked" icon={Package} accent="mint" />
      <Stat label="Sales records" value={sales.length.toLocaleString()} change="Demo + imports" up detail="transactions / product periods" icon={Activity} accent="blue" />
      <Stat label="Products selling" value={new Set(sales.map(item => item.product ?? item.productName)).size.toLocaleString()} change="Unique products" up detail="across sales history" icon={ChartNoAxesCombined} accent="orange" />
    </section>
    <section className="sales-chart-grid">
      <div className="panel sales-chart-panel"><div className="panel-heading"><div><h2>Monthly sales revenue</h2><p>Sales value by month · demo electronics data included</p></div><span className="total-tag">Monthly</span></div><div className="sales-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="salesRevenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9a83f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#9a83f6" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#eeeef4" vertical={false} strokeDasharray="4 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9999a9', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9999a9', fontSize: 10 }} tickFormatter={value => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`} /><Tooltip formatter={(value, name) => [name === 'revenue' ? money(value) : Number(value).toLocaleString(), name === 'revenue' ? 'Revenue' : 'Units sold']} contentStyle={{ borderRadius: 12, border: '1px solid #eeeef4', fontSize: 12 }} /><Area type="monotone" dataKey="revenue" name="revenue" stroke="#8e75ee" strokeWidth={2.5} fill="url(#salesRevenueFill)" /></AreaChart></ResponsiveContainer></div><p className="chart-note">Rows without a revenue field still contribute to units sold, but not to the revenue chart.</p></div>
      <div className="panel sales-chart-panel"><div className="panel-heading"><div><h2>Top products</h2><p>Ranked by units sold</p></div><span className="total-tag">Top 6</span></div><div className="sales-chart top-products-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={topProducts} layout="vertical" margin={{ top: 4, right: 12, left: 2, bottom: 0 }}><CartesianGrid stroke="#eeeef4" horizontal={false} strokeDasharray="4 5" /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9999a9', fontSize: 10 }} /><YAxis type="category" dataKey="shortProduct" width={112} axisLine={false} tickLine={false} tick={{ fill: '#77758d', fontSize: 10 }} /><Tooltip formatter={value => [Number(value).toLocaleString(), 'Units sold']} contentStyle={{ borderRadius: 12, border: '1px solid #eeeef4', fontSize: 12 }} /><Bar dataKey="unitsSold" name="Units sold" fill="#6fd7b2" radius={[0, 5, 5, 0]} barSize={16} /></BarChart></ResponsiveContainer></div></div>
    </section>
    <section className="panel sales-table-panel"><div className="panel-heading"><div><h2>Recent sales records</h2><p>Most recent imported and demo rows</p></div><span className="total-tag">{Math.min(sales.length, 12)} shown</span></div><div className="table-scroll"><table><thead><tr><th>DATE</th><th>PRODUCT</th><th>CATEGORY</th><th>UNITS SOLD</th><th>REVENUE</th><th>DATA SOURCE</th></tr></thead><tbody>{[...sales].sort((a,b) => String(b.date ?? b.saleDate).localeCompare(String(a.date ?? a.saleDate))).slice(0,12).map((item,index) => <tr key={item.id ?? `${item.product}-${index}`}><td>{String(item.date ?? item.saleDate).slice(0,10)}</td><td><strong className="sales-product-name">{item.product ?? item.productName}</strong></td><td><span className="category-label">{item.category}</span></td><td className="price-cell">{Number(item.unitsSold).toLocaleString()}</td><td className="price-cell">{item.revenue === null || item.revenue === undefined ? '—' : money(Number(item.revenue))}</td><td><span className="source-pill">{item.source ?? 'Imported'}</span></td></tr>)}</tbody></table></div></section>
  </div>;
}

function Stat({ label, value, change, up, detail, icon: Icon, accent }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${accent}`}><Icon size={18} /></div></div><div className="stat-value">{value}</div><div className="stat-foot"><span className={`stat-change ${up ? 'positive' : 'negative'}`}>{up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {change}</span><span>{detail}</span></div><div className={`stat-accent ${accent}`} /></div>;
}

function ProductTable({ products, onStock, onDelete }) {
  return <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>UNIT PRICE</th><th>STOCK LEVEL</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><div className="table-product"><div className="product-glyph violet"><Package size={17} /></div><div><strong>{product.name}</strong><small>{product.sku}</small></div></div></td><td><span className="category-label">{product.category}</span></td><td className="price-cell">{money(Number(product.price))}</td><td><div className="stock-level"><div className="stock-track"><span className={product.stock === 0 ? 'empty' : product.stock <= product.reorderAt ? 'low' : ''} style={{ width: `${Math.min(100, product.stock / Math.max(product.reorderAt * 3, 1) * 100)}%` }} /></div><span>{product.stock} units</span><div className="stock-actions"><button aria-label={`Decrease ${product.name} stock`} onClick={() => onStock(product.id, -1)} disabled={product.stock === 0}>−</button><button aria-label={`Increase ${product.name} stock`} onClick={() => onStock(product.id, 1)}>+</button></div></div></td><td><span className={`status-pill ${product.stock === 0 ? 'out' : product.stock <= product.reorderAt ? 'low' : 'good'}`}><i />{getStockStatus(product)}</span></td><td>{onDelete && <button className="icon-btn row-delete" aria-label={`Delete ${product.name}`} onClick={() => { if (window.confirm(`Remove ${product.name} from inventory?`)) onDelete(product.id); }}><Ellipsis size={18} /></button>}</td></tr>)}</tbody></table></div>;
}

export default App;
