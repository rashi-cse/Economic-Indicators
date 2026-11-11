import { useState } from 'react';
import Chip from '../Chip.jsx';
import Lead from '../Lead.jsx';
import Sparkline from '../Sparkline.jsx';
import MultiChart, { sinceRange } from '../dashboard/MultiChart.jsx';
import SignalTable from '../dashboard/SignalTable.jsx';
import Icon from '../dashboard/Icon.jsx';
import { useCountUp } from '../dashboard/motion.js';
import { money, useTradeFile } from '../trade/tradeKit.jsx';
import { formatDateTime, formatValue, signed, tipFor } from '../format.js';

// The one-screen dashboard: headline tiles, six themed panels on a shared time
// range, and every indicator in a signal table underneath. Theme and indicator
// pages remain for detail.

const RANGES = [['1Y', 1], ['3Y', 3], ['5Y', 5]];
const TILES = ['gdp', 'cpi', 'wpi', 'repo', 'unemployment', 'credit_nonfood'];
const SHORT = { dt_net: 'Net direct taxes', dt_gdp: 'Direct tax to GDP', itr_filers: 'Return filers', infl_exp_1y: 'Household expectations', capacity_util_sa: 'Capacity use', capacity_util: 'Capacity use', crude_basket: 'Indian basket', real_repo: 'Real repo rate', cpi_rural: 'Rural CPI', iip: 'IIP', credit_services: 'Credit to services', fiscal_deficit: 'Fiscal deficit', services_net: 'Services surplus', ca_usd: 'Current account', remittances: 'Remittances', gdp: 'GDP', cpi: 'CPI', gsec10: '10-yr G-sec', credit_nonfood: 'Credit', trade_balance: 'Trade balance', fdi_net: 'Net FDI', unemployment: 'Unemployment', fx_reserves: 'Reserves', inr_usd: '₹ per US$' };
const S1 = 'var(--eb-s1)';
const S2 = 'var(--eb-s2)';
const S3 = 'var(--eb-s3)';
const pct = (d) => (v) => `${signed(formatValue(v, d))}%`;
const bn = (v) => `${signed(formatValue(v, 1))} bn`;
const lakhCr = (v) => `₹${formatValue(v, 1)} lakh cr`;

const NEW_DAYS = 10;
const TILE_LABEL = { gdp: 'Real GDP growth', cpi: 'CPI inflation', wpi: 'Wholesale price inflation', repo: 'Policy repo rate', unemployment: 'Unemployment rate', credit_nonfood: 'Non-food bank credit growth' };
const TILE_ICON = { gdp: 'growth', cpi: 'prices', wpi: 'wholesale', repo: 'rates', unemployment: 'jobs', credit_nonfood: 'credit' };

function CountUp({ value, decimals }) {
  const v = useCountUp(value);
  return <>{signed(formatValue(v, decimals))}</>;
}

// Faint rising chart drawn behind the header text: decoration only.
function HeroArt() {
  const pts = [[0, 150], [60, 128], [120, 136], [180, 104], [240, 112], [300, 78], [360, 86], [420, 52], [472, 40]];
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join('');
  return (
    <svg className="eb-hero-art" viewBox="0 0 480 180" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {[30, 70, 110, 150].map((y) => <line key={y} x1="0" x2="480" y1={y} y2={y} />)}
      <path d={`${d}L480,180L0,180Z`} className="eb-hero-area" />
      <path d={d} className="eb-hero-line" />
      {pts.slice(-1).map(([x, y]) => <circle key={x} cx={x - 8} cy={y + 2} r="5" />)}
    </svg>
  );
}

// Entry card to the trade section, with the latest full-year headline.
function TradeCard({ base }) {
  const { data: x } = useTradeFile(`${base}exports.json`);
  const { data: m } = useTradeFile(`${base}imports.json`);
  const yr = x && m ? [...x.periods].reverse().find((p) => p.length === 4 && !(x.missing || []).includes(p) && !(m.missing || []).includes(p)) : null;
  const X = yr ? x.total[x.periods.indexOf(yr)] : null;
  const M = yr ? m.total[m.periods.indexOf(yr)] : null;
  return (
    <section className="eb-xcard" aria-labelledby="eb-xcard-t">
      <span className="eb-xcard-icon" aria-hidden="true"><Icon name="trade" size={24} /></span>
      <span>
        <span className="eb-xcard-kicker">Merchandise trade · DGCI&amp;S, HS 8-digit data by country</span>
        <span className="eb-xcard-title" id="eb-xcard-t">Merchandise exports, imports and trade balance by partner</span>
        <span className="eb-xcard-text">
          {yr ? `${yr}: exports ${money(X)}, imports ${money(M)}, and a trade deficit of ${money(M - X)}. Coverage includes every partner country and the 300 highest-value products in each direction.`
            : 'Coverage includes every partner country and the 300 highest-value products in each direction, for 2021 to 2026.'}
        </span>
      </span>
      <span className="eb-xcard-links">
        <a className="eb-xcard-go" href="#/exports">Exports →</a>
        <a className="eb-xcard-go" href="#/imports">Imports →</a>
        <a className="eb-xcard-go" href="#/balance">Balance →</a>
      </span>
    </section>
  );
}

// Indicators whose latest reading reached the board in the last NEW_DAYS days.
function WhatsNew({ indicators, now }) {
  const fresh = indicators
    .filter((i) => i.updated_at && now - Date.parse(i.updated_at) < NEW_DAYS * 86400000)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  return (
    <section className="eb-new" aria-labelledby="eb-new-h">
      <h2 className="eb-new-h" id="eb-new-h">New on the board <span>last {NEW_DAYS} days</span></h2>
      {fresh.length === 0 ? (
        <p className="eb-new-none">No new releases have been recorded during the last {NEW_DAYS} days. Figures are refreshed daily at 6 pm IST.</p>
      ) : (
        <ul>
          {fresh.slice(0, 8).map((i) => (
            <li key={i.id}>
              <a href={`#/indicator/${i.id}`}>{i.label}</a>
              {' '}
              <b>{signed(formatValue(i.value, i.decimals))}{i.unit.startsWith('%') ? '%' : ` ${i.unit}`}</b>
              {' '}
              <span className="eb-new-period">{i.period}</span>
              <Chip item={i} />
            </li>
          ))}
          {fresh.length > 8 && <li className="eb-new-more">{fresh.length - 8} additional indicators are listed in the table below.</li>}
        </ul>
      )}
    </section>
  );
}

function readRange() {
  try { return Number(localStorage.getItem('eb-range')) || 3; } catch { return 3; }
}

function Tile({ item, start }) {
  const pts = sinceRange(item.history, start);
  return (
    <li className="eb-tile">
      <a className="eb-tile-link" href={`#/indicator/${item.id}`}>
        <span className="eb-tile-label">{TILE_ICON[item.id] && <span className="eb-tile-icon"><Icon name={TILE_ICON[item.id]} size={15} /></span>}{TILE_LABEL[item.id] || item.label}</span>
        <span className="eb-tile-value"><CountUp value={item.value} decimals={item.decimals} /><span className="eb-tile-unit">{item.unit}</span></span>
      </a>
      <span className="eb-tile-change"><Chip item={item} /></span>
      {pts.length > 1 && (
        <Sparkline points={pts} kind={item.id === 'gdp' ? 'bar' : 'line'} height={34}
          formatTip={tipFor(item)} label={`${item.label} trend`} />
      )}
      <span className="eb-tile-period">{item.period}{item.compare_period ? ` · vs ${item.compare_period}` : ''}</span>
    </li>
  );
}

export default function Dashboard({ data, title, byId, groups, csvUrl, tradeBase }) {
  const [years, setYears] = useState(readRange);
  const choose = (n) => {
    setYears(n);
    try { localStorage.setItem('eb-range', String(n)); } catch { /* private window: keep in memory only */ }
  };
  const latest = Math.max(...(data.indicators || []).flatMap((i) => (i.history || []).map((p) => (p.date ? Date.parse(p.date) : 0))));
  const start = latest - years * 365.25 * 86400000;
  // Annual series (direct taxes) always show about ten financial years, whatever the range.
  const annualStart = Math.min(start, latest - 12 * 365.25 * 86400000);
  const h = (id) => byId[id]?.history || [];
  const has = (...ids) => ids.some((id) => byId[id]);
  const head = (id) => byId[id] && { value: (byId[id].unit.startsWith('%') ? `${signed(formatValue(byId[id].value, byId[id].decimals))}%` : byId[id].unit.startsWith('US$ bn') ? `US$ ${signed(formatValue(byId[id].value, 1))} bn` : byId[id].unit === 'US$ per barrel' ? `$${formatValue(byId[id].value, 1)}` : byId[id].unit.startsWith('₹ per US$') ? `₹${formatValue(byId[id].value, 2)}` : byId[id].unit === '₹ lakh crore' ? `₹${formatValue(byId[id].value, 2)} lakh cr` : `${signed(formatValue(byId[id].value, byId[id].decimals))} ${byId[id].unit}`), sub: `${SHORT[id] || byId[id].label} · ${byId[id].period.replace(/^(Week|Fortnight) to /, '')}` };

  return (
    <div className="eb-dash">
      <header className="eb-hero">
        <HeroArt />
        <div className="eb-hero-top">
          <div>
            <p className="eb-hero-kicker">NITI Aayog · Economics and Finance II Division</p>
            <h1>{title}</h1>
            <p className="eb-hero-asof">Position as on {formatDateTime(data.generated_at)}</p>
          </div>
          <div className="eb-range" role="group" aria-label="Time range for all charts">
            {RANGES.map(([label, n]) => (
              <button key={label} type="button" aria-pressed={years === n} onClick={() => choose(n)}>{label}</button>
            ))}
          </div>
        </div>
        <Lead byId={byId} />
      </header>

      <h2 className="eb-eyebrow" id="eb-tiles-h">Headline indicators</h2>
      <ul className="eb-tiles" aria-labelledby="eb-tiles-h">
        {TILES.map((id) => byId[id] && <Tile key={id} item={byId[id]} start={start} />)}
      </ul>

      <WhatsNew indicators={data.indicators || []} now={Date.parse(data.generated_at)} />

      <TradeCard base={tradeBase} />

      <h2 className="eb-eyebrow" id="eb-panels-h">Trends</h2>
      <section className="eb-panels" aria-labelledby="eb-panels-h">
        <div className="eb-chart-group eb-chart-group-growth">
          <div className="eb-chart-group-head">
            <h3>Growth and prices</h3>
            <p>Output, inflation, capacity and household expectations</p>
          </div>
        {has('gdp') && (
          <MultiChart title="Real and nominal GDP growth" icon="growth" headline={head('gdp')} note="Year-on-year percentage change by quarter. The GDP deflator measures the price change used to distinguish nominal from real growth. MoSPI." kind="bar" start={start} fmt={pct(1)}
            series={[
              { key: 'gdp', label: 'Real GDP', color: S1, points: h('gdp') },
              { key: 'gdp_nominal', label: 'Nominal GDP', color: S2, points: h('gdp_nominal') },
              { key: 'gdp_deflator', label: 'Deflator', color: S3, points: h('gdp_deflator') },
            ]} />
        )}
        {has('cpi') && (
          <MultiChart title="Consumer and wholesale price inflation" icon="prices" headline={head('cpi')} note="Year-on-year percentage change. Core inflation excludes food and household fuel and is calculated from MoSPI indices and weights. Shaded area: RBI's 2–6% tolerance band. MoSPI." start={start} fmt={pct(2)}
            band={{ lo: 2, hi: 6, label: '2–6% band' }}
            series={[
              { key: 'cpi', label: 'CPI', color: S1, points: h('cpi') },
              { key: 'cpi_core', label: 'Core CPI', color: S2, points: h('cpi_core') },
              { key: 'wpi', label: 'WPI', color: S3, points: h('wpi') },
            ]} />
        )}
        {has('infl_exp_1y', 'cpi') && (
          <MultiChart title="Household inflation expectations" icon="prices" headline={head('infl_exp_1y')} note="Median expected inflation from the RBI's bi-monthly survey of urban households in 19 cities, compared with measured CPI inflation. The direction of expectations is an important indicator for monetary policy. RBI and MoSPI." start={start} fmt={pct(1)}
            series={[
              { key: 'infl_exp_1y', label: 'Expected, a year ahead', color: S1, points: h('infl_exp_1y') },
              { key: 'infl_perception', label: 'Perceived now', color: S2, points: h('infl_perception') },
              { key: 'cpi', label: 'CPI inflation', color: S3, points: h('cpi') },
            ]} />
        )}
        {has('crude_basket') && (
          <MultiChart title="Indian crude oil basket price" icon="wholesale" headline={head('crude_basket')} note="Monthly average price of the Indian crude oil basket, in US dollars per barrel; the latest observation may represent the month to date. PPAC has not published monthly figures for 2022–23. PPAC." start={start} fmt={(v) => '$' + formatValue(v, 0)}
            series={[{ key: 'crude_basket', label: 'Indian basket crude', color: S1, points: h('crude_basket') }]} />
        )}
        {has('real_repo', 'real_gsec10') && (
          <MultiChart title="Real interest rates" icon="rates" headline={head('real_repo')} note="Policy repo rate and 10-year government security yield less CPI inflation, measured at month-end. A negative value indicates that the nominal rate is below inflation. RBI and MoSPI." start={start} fmt={pct(1)}
            series={[
              { key: 'real_repo', label: 'Real repo rate', color: S1, points: h('real_repo') },
              { key: 'real_gsec10', label: 'Real 10-year yield', color: S2, points: h('real_gsec10') },
            ]} />
        )}
        {has('cpi_rural', 'cpi_urban') && (
          <MultiChart title="Rural and urban inflation" icon="prices" headline={head('cpi_rural')} note="All-India CPI inflation, measured year on year. The 2024 base applies from January 2026; the 2012 base applies to earlier observations. MoSPI." start={start} fmt={pct(2)}
            series={[
              { key: 'cpi_rural', label: 'Rural', color: S1, points: h('cpi_rural') },
              { key: 'cpi_urban', label: 'Urban', color: S2, points: h('cpi_urban') },
            ]} />
        )}
        </div>
        <div className="eb-chart-group eb-chart-group-money">
          <div className="eb-chart-group-head">
            <h3>Money and credit</h3>
            <p>Rates, liquidity and lending conditions</p>
          </div>
        {has('tbill_91', 'gsec10') && (
          <MultiChart title="Interest rates" icon="rates" headline={head('gsec10')} note="Percentage rates observed at month-end. RBI DBIE; government-security yields from FBIL." start={start} fmt={pct(2)}
            series={[
              { key: 'tbill_91', label: '91-day T-bill', color: S1, points: h('tbill_91') },
              { key: 'repo', label: 'Repo rate', color: S2, points: h('repo') },
              { key: 'gsec10', label: '10-year G-sec', color: S3, points: h('gsec10') },
            ]} />
        )}
        {has('credit_nonfood', 'deposit_growth', 'm3_growth') && (
          <MultiChart title="Money and credit" icon="money" headline={head('credit_nonfood')} note="Year-on-year percentage change in non-food credit, deposits and broad money (M3). RBI DBIE." start={start} fmt={pct(1)}
            series={[
              { key: 'credit_nonfood', label: 'Non-food credit', color: S1, points: h('credit_nonfood') },
              { key: 'deposit_growth', label: 'Deposits', color: S2, points: h('deposit_growth') },
              { key: 'm3_growth', label: 'M3', color: S3, points: h('m3_growth') },
            ]} />
        )}
        {has('iip') && (
          <MultiChart title="Industrial output" icon="wholesale" headline={head('iip')} note="Index of Industrial Production (IIP), year-on-year percentage change, with 2022–23 as the base year. MoSPI has not published observations for June 2023 to March 2024 on this base. MoSPI." kind="bar" start={start} fmt={pct(1)}
            series={[{ key: 'iip', label: 'IIP growth', color: S1, points: h('iip') }]} />
        )}
        {has('capacity_util') && (
          <MultiChart title="Manufacturing capacity utilisation" icon="wholesale" headline={head('capacity_util_sa') || head('capacity_util')} note="Manufacturing capacity utilisation, reported quarterly for approximately 1,000 companies. The unadjusted series typically peaks during January–March. RBI OBICUS." start={start} fmt={pct(1)}
            series={[
              { key: 'capacity_util', label: 'As reported', color: S1, points: h('capacity_util') },
              { key: 'capacity_util_sa', label: 'Seasonally adjusted', color: S2, points: h('capacity_util_sa') },
            ]} />
        )}
        {has('credit_industry', 'credit_services') && (
          <MultiChart title="Credit by sector" icon="credit" headline={head('credit_services')} note="Year-on-year percentage change, based on the first release published each month. RBI sectoral deployment of bank credit." start={start} fmt={pct(1)}
            series={[
              { key: 'credit_industry', label: 'Industry', color: S1, points: h('credit_industry') },
              { key: 'credit_services', label: 'Services', color: S2, points: h('credit_services') },
              { key: 'credit_personal', label: 'Personal loans', color: S3, points: h('credit_personal') },
            ]} />
        )}
        </div>
        <div className="eb-chart-group eb-chart-group-fiscal">
          <div className="eb-chart-group-head">
            <h3>Fiscal and tax</h3>
            <p>Public finances, direct taxes and the tax base</p>
          </div>
        {has('dt_corporate', 'dt_noncorporate') && (
          <MultiChart title="Direct tax collections" icon="money" headline={head('dt_net')} note="Net collections after refunds, in ₹ lakh crore, by financial year; bars are plotted at March, the financial-year end. Non-corporate tax consists primarily of personal income tax. The latest year is provisional. CBDT." kind="bar" start={annualStart} fmt={lakhCr}
            series={[
              { key: 'dt_corporate', label: 'Corporate tax', color: S1, points: h('dt_corporate') },
              { key: 'dt_noncorporate', label: 'Non-corporate tax', color: S2, points: h('dt_noncorporate') },
            ]} />
        )}
        {has('dt_gdp') && (
          <MultiChart title="Direct taxes as a share of GDP" icon="growth" headline={head('dt_gdp')} note="Net direct-tax collections as a percentage of GDP at current prices, by financial year. CBDT and MoSPI." start={annualStart} fmt={pct(2)}
            series={[{ key: 'dt_gdp', label: 'Direct tax to GDP', color: S1, points: h('dt_gdp') }]} />
        )}
        {has('itr_filers', 'taxpayers') && (
          <MultiChart title="Income-tax taxpayer base" icon="jobs" headline={head('itr_filers')} note="Number of persons in crore. Taxpayers include persons subject to tax deducted at source who did not file a return; taxpayer counts are reported by assessment year. CBDT." start={annualStart} fmt={(v) => `${formatValue(v, 1)} cr`}
            series={[
              { key: 'taxpayers', label: 'Taxpayers', color: S1, points: h('taxpayers') },
              { key: 'itr_filers', label: 'Return filers', color: S2, points: h('itr_filers') },
            ]} />
        )}
        {has('fiscal_deficit', 'capex_centre') && (
          <MultiChart title="Government finances" icon="money" headline={head('fiscal_deficit')} note="Central Government figures, accumulated from April and expressed as a percentage of the full-year budget estimate; the cumulative series resets each April. CGA." start={start} fmt={pct(0)}
            series={[
              { key: 'fiscal_deficit', label: 'Fiscal deficit', color: S2, points: h('fiscal_deficit') },
              { key: 'capex_centre', label: 'Capital spending', color: S1, points: h('capex_centre') },
            ]} />
        )}
        </div>
        <div className="eb-chart-group eb-chart-group-external">
          <div className="eb-chart-group-head">
            <h3>External sector and employment</h3>
            <p>Trade, capital flows, reserves and labour-market conditions</p>
          </div>
        {has('exports', 'imports') && (
          <MultiChart title="Merchandise trade" icon="trade" headline={head('trade_balance')} note="Monthly values in US$ billion. RBI DBIE; the latest month is sourced from the Ministry of Commerce." start={start} fmt={bn}
            series={[
              { key: 'exports', label: 'Exports', color: S1, points: h('exports') },
              { key: 'imports', label: 'Imports', color: S2, points: h('imports') },
              { key: 'trade_balance', label: 'Balance', color: S3, points: h('trade_balance') },
            ]} />
        )}
        {has('services_exports', 'services_imports') && (
          <MultiChart title="Services trade" icon="trade" headline={head('services_net')} note="Monthly values in US$ billion. The services surplus offsets part of the merchandise trade deficit. RBI." start={start} fmt={bn}
            series={[
              { key: 'services_exports', label: 'Services exports', color: S1, points: h('services_exports') },
              { key: 'services_imports', label: 'Services imports', color: S2, points: h('services_imports') },
              { key: 'services_net', label: 'Surplus', color: S3, points: h('services_net') },
            ]} />
        )}
        {has('ca_goods', 'ca_services') && (
          <MultiChart title="Current account" icon="flows" headline={head('ca_usd')} note="Net quarterly values in US$ billion. Services and transfers, primarily remittances, finance a substantial portion of the merchandise trade deficit. RBI balance of payments." kind="bar" start={start} fmt={bn}
            series={[
              { key: 'ca_goods', label: 'Goods', color: S2, points: h('ca_goods') },
              { key: 'ca_services', label: 'Services', color: S1, points: h('ca_services') },
              { key: 'ca_secondary', label: 'Transfers', color: S3, points: h('ca_secondary') },
            ]} />
        )}
        {has('remittances') && (
          <MultiChart title="Remittance receipts" icon="money" headline={head('remittances')} note="Quarterly personal-transfer receipts in US$ billion, consisting primarily of funds sent to India by Indians working abroad. RBI." kind="bar" start={start} fmt={bn}
            series={[{ key: 'remittances', label: 'Remittances', color: S1, points: h('remittances') }]} />
        )}
        {has('fdi_net', 'fpi_net') && (
          <MultiChart title="Capital flows" icon="flows" headline={head('fdi_net')} note="Net monthly capital flows in US$ billion. RBI DBIE." kind="bar" start={start} fmt={bn}
            series={[
              { key: 'fdi_net', label: 'Net FDI', color: S1, points: h('fdi_net') },
              { key: 'fpi_net', label: 'Net portfolio', color: S2, points: h('fpi_net') },
            ]} />
        )}
        {has('unemployment') && (
          <MultiChart title="Unemployment" icon="jobs" headline={head('unemployment')} note="Monthly unemployment rate among persons aged 15 years and above, expressed as a percentage of the labour force. MoSPI PLFS." start={start} fmt={pct(1)}
            series={[{ key: 'unemployment', label: 'Unemployment rate', color: S1, points: h('unemployment') }]} />
        )}
        {has('fx_reserves') && (
          <MultiChart title="Foreign-exchange reserves" icon="reserves" headline={head('fx_reserves')} note="Reserves in US$ billion, measured during the final week of each month; the latest available week is shown. RBI DBIE." start={start} fmt={bn}
            series={[{ key: 'fx_reserves', label: 'Forex reserves', color: S1, points: h('fx_reserves') }]} />
        )}
        {has('inr_usd') && (
          <MultiChart title="Indian rupee per US dollar" icon="rupee" headline={head('inr_usd')} note="RBI reference rate at month-end. A higher value indicates a weaker rupee. RBI DBIE." start={start} fmt={(v) => `₹${formatValue(v, 2)}`}
            series={[{ key: 'inr_usd', label: 'Rupee per US$', color: S1, points: h('inr_usd') }]} />
        )}
        </div>
      </section>

      <section aria-labelledby="eb-signal-h">
        <div className="eb-eyebar">
          <h2 className="eb-eyebrow" id="eb-signal-h">All indicators</h2>
          <span className="eb-eyelinks">
            <a className="eb-more" href={csvUrl} download="ef2-dashboard-data.csv">Download all data (CSV)</a>
            <a className="eb-more" href="#/sources">Sources and notes</a>
          </span>
        </div>
        <SignalTable indicators={data.indicators || []} groups={groups} />
      </section>
    </div>
  );
}
