import Chip from '../Chip.jsx';
import TrendChart from '../TrendChart.jsx';
import MultiChart from '../dashboard/MultiChart.jsx';
import { formatChange, formatDate, formatValue, reading, signed, slug, tipFor } from '../format.js';

// Rural against urban inflation, shown on the CPI pages: where are prices rising faster?
function RuralUrban({ byId }) {
  const r = byId?.cpi_rural;
  const u = byId?.cpi_urban;
  if (!r || !u) return null;
  const rh = (r.history || []).filter((p) => p.value != null);
  const uh = new Map((u.history || []).filter((p) => p.value != null).map((p) => [p.date, p.value]));
  const last12 = rh.slice(-12).filter((p) => uh.has(p.date));
  const higher = last12.filter((p) => p.value > uh.get(p.date)).length;
  const gap = r.value - u.value;
  const latest = Math.max(...rh.map((p) => Date.parse(p.date)));
  const start = latest - 5 * 365.25 * 86400000;
  const pct = (v) => `${signed(formatValue(v, 2))}%`;
  return (
    <section className="eb-section" aria-labelledby="eb-in-ru">
      <h2 id="eb-in-ru">Rural and urban inflation</h2>
      <p className="eb-ru-lead">
        In {r.period}, rural and urban inflation stood at <strong>{pct(r.value)}</strong> and <strong>{pct(u.value)}</strong>, respectively;
        inflation was therefore <strong>{formatValue(Math.abs(gap), 2)} percentage points higher in {gap >= 0 ? 'rural' : 'urban'} areas</strong>.
        {' '}Rural inflation exceeded urban inflation in {higher} of the last {last12.length} months.
      </p>
      <MultiChart title="Rural and urban CPI inflation" icon="prices" headline={{ value: `${gap >= 0 ? '+' : '−'}${formatValue(Math.abs(gap), 2)} pts`, sub: `Rural minus urban · ${r.period}` }}
        note="% year on year, All India. 2024 base from January 2026; 2012 base before. Shaded: RBI's 2 to 6% tolerance band. MoSPI."
        start={start} fmt={pct} band={{ lo: 2, hi: 6, label: '2–6% band' }}
        series={[
          { key: 'cpi_rural', label: 'Rural', color: 'var(--eb-s1)', points: r.history },
          { key: 'cpi_urban', label: 'Urban', color: 'var(--eb-s2)', points: u.history },
        ]} />
    </section>
  );
}

export default function IndicatorPage({ item, byId }) {
  if (!item) {
    return (
      <div className="eb-notfound">
        <h1>Indicator not found</h1>
        <p>This indicator is not included in the current data set. <a href="#/">Return to the overview</a> to select another indicator.</p>
      </div>
    );
  }
  const hist = (item.history || []).filter((p) => p.value != null);
  const rows = hist.map((p, i) => ({ ...p, delta: i ? p.value - hist[i - 1].value : null })).reverse();
  const fmt = (v) => signed(formatValue(v, item.decimals));

  return (
    <>
      <nav className="eb-crumbs" aria-label="Breadcrumb">
        <a href="#/">Dashboard</a><span aria-hidden="true">/</span>
        <a href={`#/theme/${slug(item.group)}`}>{item.group}</a><span aria-hidden="true">/</span>
        <span>{item.label}</span>
      </nav>

      <header className="eb-pagehead eb-detailhead">
        <div>
          <h1>{item.label}</h1>
          <p className="eb-asof">{item.period}</p>
        </div>
        <button type="button" className="eb-btn eb-noprint" onClick={() => window.print()}>Print or save as PDF</button>
      </header>

      <section className="eb-section eb-bignumber" aria-label="Latest figure">
        <p className="eb-big">{fmt(item.value)}<span className="eb-figure-unit">{item.unit}</span></p>
        <p className="eb-bigchange"><Chip item={item} /> <span className="eb-muted">{item.compare_period ? `against ${fmt(item.compare_value)} in ${item.compare_period}` : ''}</span></p>
        <p className="eb-reading">{reading(item.up_is_good)}</p>
      </section>

      <section className="eb-section" aria-labelledby="eb-in-trend">
        <h2 id="eb-in-trend">Trend</h2>
        <TrendChart title={`${item.label}, ${item.unit}`} note={item.source} headingLevel={3}
          points={hist} kind={item.id === 'gdp' || item.id === 'iip' ? 'bar' : 'line'}
          formatAxis={(v) => signed(formatValue(v, v % 1 === 0 ? 0 : 1))} formatTip={tipFor(item)} formatEnd={tipFor(item)} />
      </section>

      {['cpi', 'cpi_rural', 'cpi_urban'].includes(item.id) && <RuralUrban byId={byId} />}
      {item.mode === 'cbdt' && (
        <p className="eb-ru-lead">This indicator is presented in the <a href="#/direct-taxes">Direct taxes</a> section, which includes collections by payment mode, taxpayers by category and the state-wise table.</p>
      )}

      <section className="eb-section" aria-labelledby="eb-in-hist">
        <h2 id="eb-in-hist">Release history</h2>
        <div className="eb-tablewrap">
          <table className="eb-table">
            <caption className="eb-sr">{item.label} by period, newest first</caption>
            <thead>
              <tr><th scope="col">Period</th><th scope="col" className="eb-num">Value ({item.unit})</th><th scope="col" className="eb-num">Change on previous</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td className="eb-num"><span className="eb-cell-value">{fmt(r.value)}</span></td>
                  <td className="eb-num eb-muted">{r.delta == null ? 'First entry' : signed(formatChange(r.delta, ''))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="eb-section" aria-labelledby="eb-in-about">
        <h2 id="eb-in-about">About this figure</h2>
        <dl className="eb-facts">
          <div><dt>Source</dt><dd>{item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer">{item.source}</a> : item.source}</dd></div>
          <div><dt>Released</dt><dd>{item.released ? formatDate(item.released) : 'Updated whenever the data set is rebuilt'}</dd></div>
          <div><dt>How it gets here</dt><dd>{item.mode === 'live'
            ? (item.stale ? 'Retrieved from MoSPI. The most recent retrieval attempt was unsuccessful; the figure shown is therefore the last successfully retrieved value.' : 'Retrieved live from MoSPI each time the data set is rebuilt.')
            : item.mode === 'rbi'
              ? "Retrieved from the RBI DBIE Macro-economic Indicators download (data/rbi/macro-indicators.xlsx) or from RBI press releases, with daily refreshes."
              : item.mode === 'ppac'
              ? "Retrieved daily from PPAC's crude-oil price page by scripts/ppac_crude.py."
              : item.mode === 'gstn'
              ? "Retrieved from GSTN's monthly GST revenue report through the GST portal's news feed, using scripts/gst_reports.py."
              : item.mode === 'cbdt'
              ? "Taken from CBDT's annual Time Series Data PDF, stored in data/uploads/direct-taxes/ and processed by scripts/direct_taxes.py. The Income Tax Department's website does not support automated downloads; each new edition must therefore be added manually."
              : item.mode === 'derived'
              ? 'Calculated on the board from the other series shown here; see the accompanying note.'
              : item.mode === 'workbook'
              ? "Taken from the division's indicators workbook (data/uploads/india-economic-indicators.xlsx), compiled from official releases with a citation for each value."
              : 'Entered by the team from the official release in data/manual-indicators.csv. Earlier observations may originate from the RBI DBIE download.'}</dd></div>
          {item.note && <div><dt>Note</dt><dd>{item.note}</dd></div>}
          <div><dt>Unit</dt><dd>{item.unit}</dd></div>
        </dl>
      </section>
    </>
  );
}
