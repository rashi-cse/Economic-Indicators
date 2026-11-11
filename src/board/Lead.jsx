import { formatValue, signed } from './format.js';
import { useLanguage } from '../i18n.jsx';

// The position in brief: a concise formal summary of the latest official figures.
export default function Lead({ byId }) {
  const { language } = useLanguage();
  const hindi = language === 'hi';
  const { gdp, cpi, repo, fx_reserves: fx, inr_usd: inr, trade_balance: tb, wpi, unemployment: ur, services_net: sv } = byId;
  const parts = [];

  if (gdp) {
    parts.push(
      <span key="gdp">
        {hindi ? <>वास्तविक सकल घरेलू उत्पाद में {gdp.period} में <strong>{formatValue(gdp.value, 1)}%</strong> की वृद्धि दर्ज की गई
          {gdp.compare_period ? `; ${gdp.compare_period} में यह ${formatValue(gdp.compare_value, 1)}% थी` : ''}।</> : <>Real GDP recorded growth of <strong>{formatValue(gdp.value, 1)}%</strong> in {gdp.period}
          {gdp.compare_period ? `, compared with ${formatValue(gdp.compare_value, 1)}% in ${gdp.compare_period}` : ''}.</>}
      </span>,
    );
  }
  if (cpi) {
    parts.push(
      <span key="cpi">
        {hindi ? <>उपभोक्ता मूल्य सूचकांक मुद्रास्फीति {cpi.period} में <strong>{formatValue(cpi.value, 2)}%</strong> रही
          {cpi.compare_period ? `; ${cpi.compare_period} में यह ${formatValue(cpi.compare_value, 2)}% थी` : ''}
          {repo ? <> और नीतिगत रेपो दर <strong>{formatValue(repo.value, 2)}%</strong> रही</> : null}।</> : <>CPI inflation stood at <strong>{formatValue(cpi.value, 2)}%</strong> in {cpi.period}
          {cpi.compare_period ? `, compared with ${formatValue(cpi.compare_value, 2)}% in ${cpi.compare_period}` : ''}
          {repo ? <>, alongside a policy repo rate of <strong>{formatValue(repo.value, 2)}%</strong></> : null}.</>}
      </span>,
    );
  }
  if (wpi || ur) {
    parts.push(
      <span key="wpi">
        {hindi ? (wpi ? <>थोक मूल्य सूचकांक मुद्रास्फीति {wpi.period} में <strong>{formatValue(wpi.value, 2)}%</strong> रही</> : null) : (wpi ? <>Wholesale Price Index (WPI) inflation stood at <strong>{formatValue(wpi.value, 2)}%</strong> in {wpi.period}</> : null)}
        {wpi && ur ? (hindi ? ' तथा ' : ' and ') : null}
        {ur ? (hindi ? <>बेरोजगारी दर {ur.period} में <strong>{formatValue(ur.value, 1)}%</strong> रही</> : <>{wpi ? 'the' : 'The'} unemployment rate stood at <strong>{formatValue(ur.value, 1)}%</strong> in {ur.period}</>) : null}
        {hindi ? '।' : '.'}
      </span>,
    );
  }
  if (tb) {
    parts.push(
      <span key="tb">
        {hindi ? <>वस्तु व्यापार संतुलन {tb.period} में <strong>{signed(formatValue(tb.value, 2))} अरब अमेरिकी डॉलर</strong> रहा
          {sv && sv.period === tb.period ? <>; सेवा अधिशेष <strong>{formatValue(sv.value, 1)} अरब अमेरिकी डॉलर</strong> से इसकी आंशिक भरपाई हुई</> : null}।</> : <>The merchandise trade balance amounted to <strong>US$ {signed(formatValue(tb.value, 2))} bn</strong> in {tb.period}
          {sv && sv.period === tb.period ? <>, partly offset by a services surplus of <strong>US$ {formatValue(sv.value, 1)} bn</strong></> : null}.</>}
      </span>,
    );
  }
  if (fx || inr) {
    parts.push(
      <span key="ext">
        {hindi ? (fx ? <>विदेशी मुद्रा भंडार <strong>{formatValue(fx.value, 1)} अरब अमेरिकी डॉलर</strong> ({fx.period}) रहे</> : null) : (fx ? <>Foreign-exchange reserves stood at <strong>US$ {formatValue(fx.value, 1)} bn</strong> ({fx.period})</> : null)}
        {fx && inr ? (hindi ? ' तथा ' : ' and ') : null}
        {inr ? (hindi ? <>भारतीय रुपया {inr.period} में प्रति अमेरिकी डॉलर <strong>₹{formatValue(inr.value, 2)}</strong> पर बंद हुआ</> : <>{fx ? 'the' : 'The'} Indian rupee closed at <strong>{'₹'}{formatValue(inr.value, 2)}</strong> per US$ ({inr.period})</>) : null}
        {hindi ? '।' : '.'}
      </span>,
    );
  }
  if (!parts.length) return null;
  return <p className="eb-lead">{parts.map((p, i) => <span key={i}>{p}{' '}</span>)}</p>;
}
