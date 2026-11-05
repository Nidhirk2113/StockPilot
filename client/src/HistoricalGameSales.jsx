import { useEffect, useMemo, useState } from 'react';
import { Database, Download, Gamepad2, Globe2, HardDriveUpload, Layers3, Trophy } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import Papa from 'papaparse';

const REGIONS = [
  { key: 'naSales', label: 'North America' },
  { key: 'euSales', label: 'Europe' },
  { key: 'jpSales', label: 'Japan' },
  { key: 'otherSales', label: 'Other regions' }
];

const PIE_COLORS = ['#8f79ed', '#5bd2aa', '#f1ad78', '#78a7ec'];

const number = (value, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(Number(value) || 0);

const millions = (value) => `${number(value)}M`;

function readField(row, name) {
  const key = Object.keys(row).find((candidate) => candidate.trim().toLowerCase() === name.toLowerCase());
  return key ? row[key] : undefined;
}

function parseHistoricalRows(rows) {
  const records = [];
  const errors = [];

  rows.forEach((row, index) => {
    const yearValue = readField(row, 'Year');
    const publisherValue = readField(row, 'Publisher');
    const record = {
      rank: Number(readField(row, 'Rank')),
      name: String(readField(row, 'Name') ?? '').trim(),
      platform: String(readField(row, 'Platform') ?? '').trim(),
      year: yearValue === undefined || String(yearValue).trim() === '' ? null : Number(yearValue),
      genre: String(readField(row, 'Genre') ?? '').trim(),
      publisher: publisherValue === undefined || String(publisherValue).trim() === ''
        ? null
        : String(publisherValue).trim(),
      naSales: Number(readField(row, 'NA_Sales')),
      euSales: Number(readField(row, 'EU_Sales')),
      jpSales: Number(readField(row, 'JP_Sales')),
      otherSales: Number(readField(row, 'Other_Sales')),
      globalSales: Number(readField(row, 'Global_Sales'))
    };

    const valid =
      Number.isInteger(record.rank) && record.rank > 0 &&
      record.name.length > 0 &&
      record.platform.length > 0 &&
      (record.year === null || (Number.isInteger(record.year) && record.year >= 1970 && record.year <= 2100)) &&
      record.genre.length > 0 &&
      REGIONS.every((region) => Number.isFinite(record[region.key]) && record[region.key] >= 0) &&
      Number.isFinite(record.globalSales) && record.globalSales >= 0;

    if (!valid) {
      errors.push({ row: index + 2, message: 'Invalid rank, title, platform, year, genre, or regional sales value.' });
      return;
    }

    records.push(record);
  });

  return { records, errors };
}

function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon purple"><Icon size={18} /></div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot"><span>{detail}</span></div>
      <div className="stat-accent purple" />
    </div>
  );
}

export default function HistoricalGameSales({ api, setNotice }) {
  const [analytics, setAnalytics] = useState(null);
  const [status, setStatus] = useState(null);
  const [fileName, setFileName] = useState('');
  const [pendingRecords, setPendingRecords] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refreshDataset() {
    if (!api) {
      setLoading(false);
      return;
    }

    const [analyticsResponse, statusResponse] = await Promise.all([
      fetch(`${api}/historical-game-sales/analytics`),
      fetch(`${api}/historical-game-sales/status`)
    ]);

    if (!analyticsResponse.ok || !statusResponse.ok) {
      throw new Error('Could not load historical game sales analytics.');
    }

    const [analyticsData, statusData] = await Promise.all([
      analyticsResponse.json(),
      statusResponse.json()
    ]);

    setAnalytics(analyticsData);
    setStatus(statusData);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    if (!api) {
      setLoading(false);
      return () => { active = false; };
    }

    Promise.all([
      fetch(`${api}/historical-game-sales/analytics`).then((response) => {
        if (!response.ok) throw new Error('Analytics unavailable');
        return response.json();
      }),
      fetch(`${api}/historical-game-sales/status`).then((response) => {
        if (!response.ok) throw new Error('Dataset status unavailable');
        return response.json();
      })
    ])
      .then(([analyticsData, statusData]) => {
        if (!active) return;
        setAnalytics(analyticsData);
        setStatus(statusData);
      })
      .catch((error) => {
        if (active) setNotice(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [api, setNotice]);

  const yearlyData = useMemo(
    () => (analytics?.byYear ?? []).map((item) => ({
      year: item.label,
      globalSales: item.globalSales
    })),
    [analytics]
  );

  const genreData = analytics?.byGenre?.slice(0, 10) ?? [];
  const platformData = analytics?.byPlatform?.slice(0, 10) ?? [];
  const publisherData = analytics?.byPublisher?.slice(0, 8) ?? [];

  async function chooseFile(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setNotice('Please select a CSV file.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setNotice('The CSV must be 8 MB or smaller.');
      return;
    }

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const parsed = parseHistoricalRows(result.data);
        setPendingRecords(parsed.records);
        setImportErrors(parsed.errors);

        if (!parsed.records.length) {
          setNotice('No valid historical game sales records were found.');
        } else {
          setNotice(`Ready to import ${parsed.records.length.toLocaleString()} historical records.`);
        }
      },
      error: () => setNotice('Could not read this CSV file.')
    });
  }

  async function importDataset() {
    if (!api) {
      setNotice('Connect the backend before importing historical data.');
      return;
    }

    if (!pendingRecords.length || isImporting) return;

    setIsImporting(true);

    try {
      const fileInput = document.querySelector('[data-historical-file]');
      const file = fileInput?.files?.[0];

      if (!file) {
        throw new Error('Please select the CSV file again before importing.');
      }

      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      const idempotencyKey = Array.from(new Uint8Array(digest))
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');

      const response = await fetch(`${api}/historical-game-sales/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          fileName,
          records: pendingRecords
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Historical dataset import failed.');
      }

      await refreshDataset();
      setNotice(`Imported ${payload.imported.toLocaleString()} historical game sales records. Inventory was not changed.`);
      setPendingRecords([]);
      setImportErrors([]);
      setFileName('');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      setNotice(error.message);
    } finally {
      setIsImporting(false);
    }
  }

  const regionData = REGIONS.map((region) => ({
    name: region.label,
    sales: analytics?.totals?.[region.key] ?? 0
  }));

  return (
    <div className="sales-page">
      <div className="sales-intro">
        <div>
          <span className="sales-kicker"><Gamepad2 size={14} /> HISTORICAL MARKET DATA</span>
          <h2>Video game sales intelligence.</h2>
          <p>Explore historical title, platform, genre, publisher and regional sales performance.</p>
        </div>
        <div className="sales-data-pill">
          <span />
          {number(status?.recordCount ?? 0, 0)} records stored
        </div>
      </div>

      <section className="sales-upload panel">
        <div className="upload-icon"><HardDriveUpload size={20} /></div>
        <div className="upload-copy">
          <h3>Import historical game sales</h3>
          <p>Upload the original vgsales.csv file. All 11 source fields and sales values in millions of copies are preserved separately from inventory.</p>
          <div className="upload-hints">
            <span>CSV format</span>
            <span>Up to 8 MB</span>
            <span>Maximum 20,000 rows</span>
          </div>
        </div>
        <label className="btn btn-secondary upload-button">
          Choose CSV
          <input
            data-historical-file
            type="file"
            accept=".csv,text/csv"
            aria-label="Choose historical video game sales CSV"
            onChange={(event) => {
              chooseFile(event.target.files?.[0]);
            }}
          />
        </label>

        {fileName && (
          <div className="upload-preview">
            <div>
              <strong>{fileName}</strong>
              <span>
                {number(pendingRecords.length, 0)} valid rows · {number(importErrors.length, 0)} invalid rows
              </span>
            </div>
            <button
              className="btn btn-primary"
              disabled={!pendingRecords.length || isImporting}
              onClick={importDataset}
            >
              {isImporting ? 'Importing…' : `Import ${number(pendingRecords.length, 0)} records`}
            </button>
          </div>
        )}

        {importErrors.length > 0 && (
          <details className="import-errors">
            <summary>Review first {Math.min(importErrors.length, 8)} validation issues</summary>
            {importErrors.slice(0, 8).map((error) => (
              <p key={error.row}>Row {error.row}: {error.message}</p>
            ))}
          </details>
        )}

        <p className="csv-help">
          Original columns: <code>Rank, Name, Platform, Year, Genre, Publisher, NA_Sales, EU_Sales, JP_Sales, Other_Sales, Global_Sales</code>.
          Missing year and publisher values remain null. Sales values remain in millions; they are not converted into stock units or currency.
        </p>
      </section>

      {!api && (
        <div className="panel empty-state">
          Configure VITE_API_URL and connect the backend to import or view persisted historical data.
        </div>
      )}

      {loading ? (
        <div className="panel empty-state">Loading historical analytics…</div>
      ) : analytics?.recordCount > 0 ? (
        <>
          <section className="stats-grid sales-stats">
            <MetricCard
              label="Historical records"
              value={number(analytics.recordCount, 0)}
              detail="Imported game titles"
              icon={Database}
            />
            <MetricCard
              label="Global sales"
              value={millions(analytics.totals.globalSales)}
              detail="Millions of copies"
              icon={Globe2}
            />
            <MetricCard
              label="Genres represented"
              value={number(analytics.byGenre?.length ?? 0, 0)}
              detail="Distinct game genres"
              icon={Layers3}
            />
            <MetricCard
              label="Platforms represented"
              value={number(analytics.byPlatform?.length ?? 0, 0)}
              detail="Distinct platforms"
              icon={Gamepad2}
            />
          </section>

          <section className="sales-chart-grid">
            <div className="panel sales-chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Global sales by release year</h2>
                  <p>Sum of reported global sales · millions of copies</p>
                </div>
                <span className="total-tag">Yearly</span>
              </div>
              <div className="sales-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yearlyData}>
                    <defs>
                      <linearGradient id="historicalYearFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9a83f6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#9a83f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eeeef4" vertical={false} strokeDasharray="4 5" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#9999a9', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9999a9', fontSize: 10 }} />
                    <Tooltip formatter={(value) => [millions(value), 'Global sales']} />
                    <Area dataKey="globalSales" name="Global sales" type="monotone" stroke="#8e75ee" strokeWidth={2.5} fill="url(#historicalYearFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel sales-chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Regional sales mix</h2>
                  <p>Reported sales by region · millions of copies</p>
                </div>
              </div>
              <div className="sales-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={regionData} dataKey="sales" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                      {regionData.map((region, index) => (
                        <Cell key={region.name} fill={PIE_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [millions(value), 'Sales']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="upload-hints">
                {regionData.map((region, index) => (
                  <span key={region.name}>
                    <i style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: PIE_COLORS[index] }} />
                    {region.name}: {millions(region.sales)}
                  </span>
                ))}
              </div>
            </div>

            <div className="panel sales-chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Top genres</h2>
                  <p>Ranked by global sales · millions of copies</p>
                </div>
              </div>
              <div className="sales-chart top-products-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={genreData} layout="vertical" margin={{ left: 4, right: 12 }}>
                    <CartesianGrid stroke="#eeeef4" horizontal={false} strokeDasharray="4 5" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9999a9', fontSize: 10 }} />
                    <YAxis type="category" dataKey="label" width={85} axisLine={false} tickLine={false} tick={{ fill: '#77758d', fontSize: 10 }} />
                    <Tooltip formatter={(value) => [millions(value), 'Global sales']} />
                    <Bar dataKey="globalSales" fill="#6fd7b2" radius={[0, 5, 5, 0]} barSize={15} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel sales-chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Top platforms</h2>
                  <p>Ranked by global sales · millions of copies</p>
                </div>
              </div>
              <div className="sales-chart top-products-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformData} layout="vertical" margin={{ left: 4, right: 12 }}>
                    <CartesianGrid stroke="#eeeef4" horizontal={false} strokeDasharray="4 5" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9999a9', fontSize: 10 }} />
                    <YAxis type="category" dataKey="label" width={55} axisLine={false} tickLine={false} tick={{ fill: '#77758d', fontSize: 10 }} />
                    <Tooltip formatter={(value) => [millions(value), 'Global sales']} />
                    <Bar dataKey="globalSales" fill="#8f79ed" radius={[0, 5, 5, 0]} barSize={15} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="panel sales-table-panel">
            <div className="panel-heading">
              <div>
                <h2>Top publishers</h2>
                <p>Ranked by reported global sales · millions of copies</p>
              </div>
              <span className="total-tag">Top {publisherData.length}</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>PUBLISHER</th><th>GLOBAL SALES (M)</th></tr>
                </thead>
                <tbody>
                  {publisherData.map((publisher) => (
                    <tr key={publisher.label}>
                      <td><strong>{publisher.label}</strong></td>
                      <td className="price-cell">{number(publisher.globalSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="panel empty-state">
          <Trophy size={22} />
          <p>No historical game sales dataset has been imported yet.</p>
          <span>Choose vgsales.csv above to populate this analytics workspace.</span>
        </div>
      )}

      {status?.latestImport && (
        <p className="chart-note">
          Latest import: {status.latestImport.fileName} · {number(status.latestImport.recordCount, 0)} records · {new Date(status.latestImport.importedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
