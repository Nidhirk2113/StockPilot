import { useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Bell, Boxes, ChartNoAxesCombined, ChevronDown, CircleHelp, Command, Download, Ellipsis, LayoutDashboard, Menu, Package, Plus, Search, Settings2, SlidersHorizontal, Sparkles, Truck, X, Zap } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { initialProducts, weeklyMovement, filterProducts, getStockStatus, summarizeInventory, toCsv } from './data.js';

const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const API = import.meta.env.VITE_API_URL;

function App() {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState('Overview');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [status, setStatus] = useState('All items');
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
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
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> INVENTORY INTELLIGENCE / DAILY SNAPSHOT</div><h1>{page === 'Overview' ? 'Your stock, in focus' : page}<span className="heading-spark">✳</span></h1><p>{page === 'Overview' ? 'A clearer view of what is moving, what is ready, and what needs attention.' : 'Keep your inventory organized, accurate, and moving.'}</p></div><div className="heading-actions"><button className="btn btn-secondary" onClick={exportCsv}><Download size={16} /> Export report</button><button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={17} /> Add product</button></div></div>
        {page === 'Overview' ? <>
          <div className="insight-banner"><div className="insight-symbol"><Zap size={19} fill="currentColor" /></div><div><strong>{summary.lowStock + summary.outOfStock ? 'A few products need attention.' : 'Your inventory is looking healthy.'}</strong><span>{summary.lowStock + summary.outOfStock ? `${summary.lowStock + summary.outOfStock} items are at or below their reorder point.` : 'All products are above their reorder points.'} <button onClick={() => { setPage('Products'); setStatus('Low stock'); }}>Review stock alerts <ArrowUpRight size={13} /></button></span></div><div className="banner-decoration">✳</div></div>
          <section className="stats-grid"><Stat label="Inventory value" value={money(summary.value)} change="+8.2%" up detail="sample portfolio data" icon={Boxes} accent="purple" /><Stat label="Units in stock" value={summary.units.toLocaleString()} change="Tracked" up detail="across the catalog" icon={Package} accent="mint" /><Stat label="Items needing attention" value={String(summary.lowStock + summary.outOfStock).padStart(2, '0')} change={summary.outOfStock ? `${summary.outOfStock} out of stock` : 'Reorder watch'} up={false} detail="low and empty stock" icon={Activity} accent="orange" /><Stat label="Products tracked" value={String(products.length).padStart(2, '0')} change="Catalog" up detail="products in workspace" icon={ChartNoAxesCombined} accent="blue" /></section>
          <section className="analytics-grid"><div className="panel movement-panel"><div className="panel-heading"><div><h2>Inventory movement</h2><p>Stock received vs. stock dispatched · sample week</p></div><span className="select-button">Last 7 days <ChevronDown size={14} /></span></div><div className="chart-legend"><span><i className="legend-in" /> Stock in</span><span><i className="legend-out" /> Stock out</span><strong>Weekly view <ArrowUpRight size={14} /></strong></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weeklyMovement} margin={{ top: 10, right: 4, left: -25, bottom: 0 }}><defs><linearGradient id="inFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a18bfa" stopOpacity={0.25} /><stop offset="100%" stopColor="#a18bfa" stopOpacity={0} /></linearGradient><linearGradient id="outFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7ce7c1" stopOpacity={0.2} /><stop offset="100%" stopColor="#7ce7c1" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eeeef4" vertical={false} strokeDasharray="4 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9999a9', fontSize: 11 }} dy={10} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #eeeef4', fontSize: 12 }} /><Area type="monotone" dataKey="inbound" name="Stock in" stroke="#9a83f6" strokeWidth={2.5} fill="url(#inFill)" /><Area type="monotone" dataKey="outbound" name="Stock out" stroke="#59d6ad" strokeWidth={2.5} fill="url(#outFill)" /></AreaChart></ResponsiveContainer></div></div>
          <div className="panel alerts-panel"><div className="panel-heading"><div><h2>Needs attention <span className="tiny-count">{summary.lowStock + summary.outOfStock}</span></h2><p>Keep the next stockout off the schedule</p></div><button className="round-arrow" aria-label="View products" onClick={() => { setPage('Products'); setStatus('Low stock'); }}><ArrowUpRight size={17} /></button></div><div className="alert-list">{products.filter(p => getStockStatus(p) !== 'In stock').slice(0, 4).map(product => <div className="alert-row" key={product.id}><div className="product-glyph violet"><Package size={17} /></div><div className="alert-product"><strong>{product.name}</strong><small>{product.sku}</small></div><div className="alert-qty"><strong>{product.stock} left</strong><span className={product.stock === 0 ? 'status-out' : 'status-low'}>{getStockStatus(product)}</span></div></div>)}{summary.lowStock + summary.outOfStock === 0 && <div className="empty-state compact">No stock alerts right now. Nice work.</div>}</div><button className="text-link" onClick={() => { setPage('Products'); setStatus('Low stock'); }}>View stock alerts <ArrowUpRight size={14} /></button></div></section>
          <section className="panel products-panel"><div className="panel-heading product-panel-heading"><div><h2>Product overview</h2><p>A quick look at your catalog</p></div><button className="text-link" onClick={() => setPage('Products')}>View all products <ArrowUpRight size={14} /></button></div><ProductTable products={products.slice(0, 5)} onStock={adjustStock} /></section>
        </> : <section className="panel full-products"><div className="panel-heading"><div><h2>{page === 'Products' ? 'Product catalog' : page}</h2><p>{page === 'Products' ? 'Search your catalog, review stock, and make updates.' : 'This workspace area is planned for the next release.'}</p></div><span className="total-tag">{products.length} products</span></div>{page === 'Products' ? <><div className="table-toolbar"><div className="search-box"><Search size={16} /><input aria-label="Search products" placeholder="Search products, SKU..." value={query} onChange={event => setQuery(event.target.value)} />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}</div><div className="filter-controls"><SlidersHorizontal size={15} /><select aria-label="Filter by category" value={category} onChange={event => setCategory(event.target.value)}><option>All categories</option>{[...new Set(products.map(product => product.category))].map(item => <option key={item}>{item}</option>)}</select><select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)}><option>All items</option><option>In stock</option><option>Low stock</option><option>Out of stock</option></select></div></div><ProductTable products={filtered} onStock={adjustStock} onDelete={deleteProduct} />{filtered.length === 0 && <div className="empty-state">No products match those filters. Try a different search.</div>}</> : <div className="coming-soon"><div className="coming-icon"><Sparkles size={24} /></div><h3>More visibility. Less busywork.</h3><p>Supplier workflows and stock movement history are planned for the next release.</p><button className="btn btn-primary" onClick={() => setPage('Overview')}>Back to overview</button></div>}</section>}
        <footer className="footer"><span>© 2026 StockPilot</span><span><i /> Inventory intelligence, in your corner.</span><span>Built for momentum <span className="footer-heart">✳</span></span></footer>
      </div>
    </main>
    {modal && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setModal(false)}><form className="modal" onSubmit={addProduct}><div className="modal-head"><div><span className="modal-kicker">CATALOG MANAGEMENT</span><h2>Add a new product</h2><p>Enter the essentials to add an item to your inventory.</p></div><button type="button" className="icon-btn" aria-label="Close modal" onClick={() => setModal(false)}><X size={19} /></button></div><label>Product name<input name="name" placeholder="e.g. Wireless mouse" required maxLength="120" /></label><div className="form-row"><label>SKU<input name="sku" placeholder="e.g. TEC-105" required maxLength="40" pattern="[A-Za-z0-9_-]+" title="Use letters, numbers, hyphens, or underscores" /></label><label>Category<select name="category"><option>Electronics</option><option>Accessories</option><option>Home & Living</option><option>Office</option></select></label></div><div className="form-row three"><label>Unit price ($)<input name="price" type="number" min="0" step="0.01" defaultValue="25" required /></label><label>Stock quantity<input name="stock" type="number" min="0" step="1" defaultValue="10" required /></label><label>Reorder at<input name="reorderAt" type="number" min="0" step="1" defaultValue="5" required /></label></div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" type="submit"><Plus size={16} /> Add product</button></div></form></div>}
    {notice && <div className="toast" role="status"><span className="toast-check">✓</span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
  </div>;
}

function Stat({ label, value, change, up, detail, icon: Icon, accent }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${accent}`}><Icon size={18} /></div></div><div className="stat-value">{value}</div><div className="stat-foot"><span className={`stat-change ${up ? 'positive' : 'negative'}`}>{up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {change}</span><span>{detail}</span></div><div className={`stat-accent ${accent}`} /></div>;
}

function ProductTable({ products, onStock, onDelete }) {
  return <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>UNIT PRICE</th><th>STOCK LEVEL</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><div className="table-product"><div className="product-glyph violet"><Package size={17} /></div><div><strong>{product.name}</strong><small>{product.sku}</small></div></div></td><td><span className="category-label">{product.category}</span></td><td className="price-cell">{money(Number(product.price))}</td><td><div className="stock-level"><div className="stock-track"><span className={product.stock === 0 ? 'empty' : product.stock <= product.reorderAt ? 'low' : ''} style={{ width: `${Math.min(100, product.stock / Math.max(product.reorderAt * 3, 1) * 100)}%` }} /></div><span>{product.stock} units</span><div className="stock-actions"><button aria-label={`Decrease ${product.name} stock`} onClick={() => onStock(product.id, -1)} disabled={product.stock === 0}>−</button><button aria-label={`Increase ${product.name} stock`} onClick={() => onStock(product.id, 1)}>+</button></div></div></td><td><span className={`status-pill ${product.stock === 0 ? 'out' : product.stock <= product.reorderAt ? 'low' : 'good'}`}><i />{getStockStatus(product)}</span></td><td>{onDelete && <button className="icon-btn row-delete" aria-label={`Delete ${product.name}`} onClick={() => { if (window.confirm(`Remove ${product.name} from inventory?`)) onDelete(product.id); }}><Ellipsis size={18} /></button>}</td></tr>)}</tbody></table></div>;
}

export default App;
