#!/usr/bin/env python3
"""
Build Kosovo Banking Intelligence v4 — Analytically Corrected Dashboard
Fixes: stock/flow separation, LTD delta, proxy labels, formatting, branding
"""
import json, os, base64
from PIL import Image
import io

BASE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE, 'clean_data_v3.json'), 'r', encoding='utf-8') as f:
    DATA = json.load(f)

data_js = json.dumps(DATA, separators=(',',':'))

# Load and resize logo
logo_path = os.path.join(BASE, '..', 'Fintech Humans Web', 'Fintech Humans logo.PNG')
img = Image.open(logo_path)
h = 120
img2 = img.resize((int(img.width * h / img.height), h), Image.LANCZOS)
if img2.mode != 'RGBA':
    img2 = img2.convert('RGBA')
buf = io.BytesIO()
img2.save(buf, format='PNG', optimize=True)
LOGO_B64 = base64.b64encode(buf.getvalue()).decode()

CSS = r"""
:root{
  --bg:#fafbfc;--card:#ffffff;--border:#eef0f4;--border-s:#e2e5eb;
  --text:#0f172a;--text-2:#475569;--text-3:#94a3b8;
  --accent:#0f172a;--accent-2:#334155;--gold:#b8860b;
  --green:#059669;--green-bg:#ecfdf5;
  --red:#dc2626;--red-bg:#fef2f2;
  --c1:#0f172a;--c2:#475569;--c3:#94a3b8;--c4:#cbd5e1;--c5:#e2e8f0;
  --shadow:0 1px 2px rgba(0,0,0,.04);
  --r:6px;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.55;-webkit-font-smoothing:antialiased}

.hdr{background:#fff;border-bottom:1px solid var(--border);padding:0 48px;height:56px;display:flex;align-items:center;justify-content:space-between}
.hdr-brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--text)}
.hdr-brand .logo-mark{height:36px;width:auto;object-fit:contain}
.hdr-brand .logo-text{font-size:15px;font-weight:600;letter-spacing:-.3px}
.hdr-brand .logo-text span{font-weight:400;color:var(--text-3);margin-left:6px}
.hdr-meta{font-size:11px;color:var(--text-3);display:flex;gap:20px}

.nav{background:#fff;border-bottom:1px solid var(--border);padding:0 48px;overflow-x:auto}
.nav-inner{display:flex;gap:0;max-width:1440px;margin:0 auto}
.nav-item{padding:11px 18px;font-size:12px;font-weight:500;color:var(--text-3);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap;letter-spacing:.1px}
.nav-item:hover{color:var(--text-2)}
.nav-item.active{color:var(--gold);border-bottom-color:var(--gold);font-weight:600}

.main{max-width:1440px;margin:0 auto;padding:32px 48px}

.pg-title{margin-bottom:28px}
.pg-title h1{font-size:24px;font-weight:700;letter-spacing:-.5px;color:var(--text)}
.pg-title p{font-size:13px;color:var(--text-2);margin-top:4px;max-width:640px}

.fbar{display:flex;gap:10px;align-items:flex-end;margin-bottom:28px;flex-wrap:wrap}
.fg{display:flex;flex-direction:column;gap:3px}
.fg label{font-size:10px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px}
.fg select{padding:6px 10px;border:1px solid var(--border-s);border-radius:var(--r);font-size:12px;font-family:inherit;color:var(--text);background:#fff;min-width:100px}
.fg select:focus{outline:none;border-color:var(--gold)}
.fbar .spacer{flex:1}
.fbtn{padding:7px 14px;border:1px solid var(--border-s);border-radius:var(--r);font-size:11px;font-weight:500;cursor:pointer;background:#fff;color:var(--text-2);font-family:inherit;transition:all .12s}
.fbtn:hover{border-color:var(--accent);color:var(--accent)}
.fbtn.pri{background:var(--accent);color:#fff;border-color:var(--accent)}

.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px}
.kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;box-shadow:var(--shadow)}
.kpi-l{font-size:10px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:5px}
.kpi-v{font-size:22px;font-weight:700;color:var(--text);line-height:1.1}
.kpi-d{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;margin-top:4px;padding:2px 6px;border-radius:3px}
.kpi-d.up{color:var(--green);background:var(--green-bg)}
.kpi-d.dn{color:var(--red);background:var(--red-bg)}
.kpi-s{font-size:10px;color:var(--text-3);margin-top:3px}

.note{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:var(--r);padding:16px 20px;margin-bottom:24px}
.note-tag{font-size:9px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.note h3{font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px}
.note p{font-size:12px;color:var(--text-2);line-height:1.65}
.note.warn{border-left-color:var(--red)}
.note.caveat{border-left-color:var(--gold);background:#fffbf0}

.cgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.ccard{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:20px;box-shadow:var(--shadow)}
.ccard.full{grid-column:1/-1}
.ccard h3{font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px}
.ccard .csub{font-size:10px;color:var(--text-3);margin-bottom:12px}
.ccard canvas{width:100%!important;max-height:280px}

.mod{display:none}.mod.active{display:block}

.tw{background:var(--card);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;margin-bottom:24px}
.th{padding:12px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.th h3{font-size:13px;font-weight:600}
.th input{padding:5px 10px;border:1px solid var(--border-s);border-radius:var(--r);font-size:12px;font-family:inherit;width:200px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;padding:8px 14px;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-3);background:var(--bg);border-bottom:1px solid var(--border)}
td{padding:8px 14px;border-bottom:1px solid var(--border)}
tr:hover td{background:#f8f9fb}
.num{text-align:right;font-variant-numeric:tabular-nums}

.footer{background:var(--accent);border-top:1px solid var(--border);padding:20px 48px;margin-top:32px}
.footer-inner{max-width:1440px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.footer-inner span{font-size:10px;color:rgba(255,255,255,.65);letter-spacing:.2px}
.footer-inner a{color:var(--gold);text-decoration:none;font-weight:500}
.footer-inner a:hover{text-decoration:underline}
.footer-note{font-size:9px;color:rgba(255,255,255,.4);margin-top:4px}

.meth-section{margin-bottom:24px}
.meth-section h3{font-size:14px;font-weight:600;margin-bottom:8px;color:var(--text)}
.meth-section p,.meth-section li{font-size:12px;color:var(--text-2);line-height:1.7}
.meth-section ul{padding-left:18px}
.meth-section table{margin-top:8px}

@media(max-width:1024px){.cgrid{grid-template-columns:1fr}.main{padding:20px}.hdr,.nav,.footer{padding-left:20px;padding-right:20px}}
@media(max-width:768px){.kpis{grid-template-columns:1fr 1fr}.fbar{flex-direction:column;align-items:stretch}.hdr-meta{display:none}}
@media print{body{font-size:11px}.hdr,.nav,.fbar,.fbtn{display:none!important}.mod{display:block!important;page-break-inside:avoid}.main{padding:10px}.ccard{break-inside:avoid}.kpis{grid-template-columns:repeat(3,1fr)}.note{break-inside:avoid}}
"""

NAV_TABS = [
    ('overview','Overview'),('loans','Loans'),('deposits','Deposits'),
    ('rates','Rates'),('payments','Payments'),('atm','ATMs'),('pos','POS'),
    ('cards','Cards'),('remittances','Remittances'),('methodology','Methodology')
]

def nav_html():
    items = ''.join(f'<div class="nav-item{" active" if i==0 else ""}" data-mod="{k}">{v}</div>' for i,(k,v) in enumerate(NAV_TABS))
    return f'<div class="nav"><div class="nav-inner">{items}</div></div>'

def filters_html():
    mos = '<option value="all">All</option>'
    for m,n in [('01','Jan'),('02','Feb'),('03','Mar'),('04','Apr'),('05','May'),('06','Jun'),
                ('07','Jul'),('08','Aug'),('09','Sep'),('10','Oct'),('11','Nov'),('12','Dec')]:
        mos += f'<option value="{m}">{n}</option>'
    return f"""<div class="fbar" id="fbar">
<div class="fg"><label>From</label><select id="f-yf"></select></div>
<div class="fg"><label>To</label><select id="f-yt"></select></div>
<div class="fg"><label>Month</label><select id="f-mo">{mos}</select></div>
<div class="spacer"></div>
<button class="fbtn" onclick="resetF()">Reset</button>
<button class="fbtn" onclick="window.print()" title="Print or save as PDF">Print / PDF</button>
<button class="fbtn pri" onclick="buildAll()">Apply</button>
</div>"""

# ============ PAGE MODULES ============

def mod_overview():
    return """<div class="mod active" id="mod-overview">
<div class="pg-title"><h1>Executive Overview</h1>
<p>Market-level snapshot of the Kosovo banking system. All KPIs use corrected source mapping with proxy disclosures where applicable.</p></div>
<div class="kpis" id="ov-k"></div>
<div class="note"><div class="note-tag">Market Summary</div><h3 id="ov-h"></h3><p id="ov-p"></p></div>
<div class="cgrid">
<div class="ccard"><h3>Total banking credit</h3><div class="csub">Stock, EUR &mdash; source: ODC loans by maturity</div><canvas id="ch-ov-cr"></canvas></div>
<div class="ccard"><h3>Total EUR deposits</h3><div class="csub">Stock, EUR</div><canvas id="ch-ov-dp"></canvas></div>
</div>
<div class="cgrid">
<div class="ccard"><h3>Loan-to-Deposit ratio</h3><div class="csub">Total credit / EUR deposits, %</div><canvas id="ch-ov-ltd"></canvas></div>
<div class="ccard"><h3>Remittance inflows</h3><div class="csub">All channels, EUR</div><canvas id="ch-ov-rm"></canvas></div>
</div>
</div>"""

def mod_loans():
    return """<div class="mod" id="mod-loans">
<div class="pg-title"><h1>Loans &amp; Credit</h1>
<p>Total banking credit, customer segmentation, maturity structure, corporate sector breakdown, and new lending flows.</p></div>
<div class="kpis" id="ln-k"></div>
<div class="note"><div class="note-tag">Credit Structure</div><h3 id="ln-h"></h3><p id="ln-p"></p></div>
<div class="cgrid">
<div class="ccard"><h3>Credit by customer segment</h3><div class="csub">Stock trend, EUR</div><canvas id="ch-ln-cust"></canvas></div>
<div class="ccard"><h3>Customer composition</h3><div class="csub">Share of total, latest period</div><canvas id="ch-ln-pie"></canvas></div>
</div>
<div class="cgrid">
<div class="ccard"><h3>New lending by product (flow only)</h3><div class="csub">Consumer, mortgage, other &mdash; excludes revolving stock</div><canvas id="ch-ln-type"></canvas></div>
<div class="ccard"><h3>New loans: Households vs Corporates</h3><div class="csub">HH total vs NFC total new lending, EUR</div><canvas id="ch-ln-hhcorp"></canvas></div>
</div>
<div class="cgrid">
<div class="ccard"><h3>Household maturity structure</h3><div class="csub">Outstanding by maturity bucket, latest period</div><canvas id="ch-ln-mat"></canvas></div>
<div class="ccard"><h3>Corporate maturity structure</h3><div class="csub">Outstanding by maturity bucket, latest period</div><canvas id="ch-ln-matc"></canvas></div>
</div>
<div class="cgrid">
<div class="ccard full"><h3>Corporate lending by economic sector</h3><div class="csub">Top sectors by latest value &mdash; corporate loans only, dynamically sorted</div><canvas id="ch-ln-sec"></canvas></div>
</div>
<div class="note caveat"><div class="note-tag">Caveat</div><p>The sector breakdown covers corporate/business lending only (~&euro;3.8B). Total market loans including households are ~&euro;6.6B. &ldquo;Overdrafts &amp; Credit Cards&rdquo; is an outstanding stock balance, not a new-lending flow, and is excluded from the product flow chart.</p></div>
</div>"""

def mod_deposits():
    return """<div class="mod" id="mod-deposits">
<div class="pg-title"><h1>Deposits</h1>
<p>EUR deposit base by segment, deposit type composition (stock vs flow separated), and maturity analysis where available.</p></div>
<div class="kpis" id="dp-k"></div>
<div class="note"><div class="note-tag">Deposit Structure</div><h3 id="dp-h"></h3><p id="dp-p"></p></div>
<div class="cgrid">
<div class="ccard"><h3>Deposits by segment</h3><div class="csub">Main depositor categories, EUR</div><canvas id="ch-dp-seg"></canvas></div>
<div class="ccard"><h3>Deposit share: Households vs Corporates</h3><div class="csub">% of total EUR deposits over time</div><canvas id="ch-dp-share"></canvas></div>
</div>
<div class="cgrid">
<div class="ccard"><h3>Deposit stocks: Transferable &amp; Savings</h3><div class="csub">End-of-period balances (stock), EUR</div><canvas id="ch-dp-stock"></canvas></div>
<div class="ccard"><h3>New time deposit origination (flow)</h3><div class="csub">Monthly new time deposits placed, EUR</div><canvas id="ch-dp-flow"></canvas></div>
</div>
<div class="note caveat"><div class="note-tag">Stock vs Flow</div><p>Transferable and savings deposits are stock measures (end-of-period balances). Time deposits in this source are flow-based (new originations per month). They are shown separately to avoid analytical misinterpretation. The type breakdown covers HH and Corporate segments only (~&euro;4.8B of ~&euro;7.6B total).</p></div>
<div class="note warn"><div class="note-tag">Deposit Maturity</div><p>Deposit maturity bucketing (e.g. &lt;1 year, 1&ndash;2 years, etc.) is <strong>not available</strong> in the current CBK time series source. F08 provides segment-level EUR deposit stocks; F11a provides type-level stocks (Transferable, Savings) and flows (Time Deposits). Neither source breaks deposits by remaining or original maturity. This section will be added if CBK publishes maturity-bucketed deposit data.</p></div>
</div>"""

def mod_rates():
    return """<div class="mod" id="mod-rates">
<div class="pg-title"><h1>Interest Rates</h1>
<p>Effective rates on new lending and new time deposits, rate dynamics, and pricing gap analysis.</p></div>
<div class="kpis" id="rt-k"></div>
<div class="note warn"><div class="note-tag">Proxy Disclosure</div><p>The pricing gap indicator is derived from lending and deposit rates on new business. It is <strong>not</strong> equivalent to Net Interest Margin (NIM) and should not be interpreted as a direct profitability measure. It excludes legacy book rates, non-interest income, provisioning, and funding from transferable/savings deposits.</p></div>
<div class="note"><div class="note-tag">Rate Environment</div><h3 id="rt-h"></h3><p id="rt-p"></p></div>
<div class="cgrid">
<div class="ccard"><h3>Lending rates by product</h3><div class="csub">Effective rates on new loans, %</div><canvas id="ch-rt-prod"></canvas></div>
<div class="ccard"><h3>Deposit rates by customer</h3><div class="csub">Effective rates on new time deposits, %</div><canvas id="ch-rt-dep"></canvas></div>
</div>
<div class="cgrid">
<div class="ccard"><h3>Pricing gap trend (proxy)</h3><div class="csub">Lending rate minus deposit rate, pp</div><canvas id="ch-rt-spread"></canvas></div>
<div class="ccard"><h3>Household vs Corporate lending rates</h3><div class="csub">HH consumer rate vs Corp lending rate, %</div><canvas id="ch-rt-hhcorp"></canvas></div>
</div>
<div class="cgrid">
<div class="ccard full"><h3>EUR/USD &amp; effective exchange rates</h3><div class="csub">NEER and REER indices (2005=100)</div><canvas id="ch-rt-neer"></canvas></div>
</div>
</div>"""

def mod_payments():
    return """<div class="mod" id="mod-payments">
<div class="pg-title"><h1>Payments</h1>
<p>Payment system activity: volume, value, average transaction size, digital vs traditional, domestic vs international.</p></div>
<div class="kpis" id="py-k"></div>
<div class="note"><div class="note-tag">Payment System</div><h3 id="py-h"></h3><p id="py-p"></p></div>
<div class="cgrid">
<div class="ccard full"><h3>Payment values by channel</h3><div class="csub">Non-overlapping channels, EUR</div><canvas id="ch-py-val"></canvas></div>
</div>
<div class="cgrid">
<div class="ccard"><h3>Digital vs traditional channels</h3><div class="csub">Retail digital share trend</div><canvas id="ch-py-mix"></canvas></div>
<div class="ccard"><h3>Domestic vs international</h3><div class="csub">Aggregate domestic vs cross-border value</div><canvas id="ch-py-vol"></canvas></div>
</div>
</div>"""

def mod_atm():
    return """<div class="mod" id="mod-atm">
<div class="pg-title"><h1>ATMs</h1>
<p>ATM withdrawals, deposits, cross-border card usage, and average transaction values.</p></div>
<div class="kpis" id="at-k"></div>
<div class="note"><div class="note-tag">ATM Activity</div><h3 id="at-h"></h3><p id="at-p"></p></div>
<div class="cgrid">
<div class="ccard"><h3>ATM withdrawals &mdash; domestic</h3><div class="csub">Amount and count</div><canvas id="ch-at-dom"></canvas></div>
<div class="ccard"><h3>ATM cash deposits</h3><div class="csub">Amount and count</div><canvas id="ch-at-dep"></canvas></div>
</div>
<div class="cgrid">
<div class="ccard"><h3>Foreign cards at Kosovo ATMs</h3><div class="csub">Amount and count</div><canvas id="ch-at-fk"></canvas></div>
<div class="ccard"><h3>Kosovo cards at foreign ATMs</h3><div class="csub">Amount and count</div><canvas id="ch-at-ka"></canvas></div>
</div>
</div>"""

def mod_pos():
    return """<div class="mod" id="mod-pos">
<div class="pg-title"><h1>POS</h1>
<p>Point-of-sale terminal activity: domestic, cross-border, and average transaction values.</p></div>
<div class="kpis" id="po-k"></div>
<div class="note"><div class="note-tag">POS Activity</div><h3 id="po-h"></h3><p id="po-p"></p></div>
<div class="cgrid">
<div class="ccard"><h3>POS domestic</h3><div class="csub">Amount and count</div><canvas id="ch-po-dom"></canvas></div>
<div class="ccard"><h3>POS cross-border total</h3><div class="csub">Amount and count</div><canvas id="ch-po-abr"></canvas></div>
</div>
<div class="cgrid">
<div class="ccard"><h3>Foreign cards at Kosovo POS</h3><div class="csub">Inbound card payments</div><canvas id="ch-po-fk"></canvas></div>
<div class="ccard"><h3>Kosovo cards at foreign POS</h3><div class="csub">Outbound card payments</div><canvas id="ch-po-ka"></canvas></div>
</div>
</div>"""

def mod_cards():
    return """<div class="mod" id="mod-cards">
<div class="pg-title"><h1>Cards</h1>
<p>Card usage patterns derived from ATM and POS payment channels.</p></div>
<div class="note caveat"><div class="note-tag">Scope</div><p>Card issuance and card stock data (active cards, debit vs credit split, contactless share) are not available in CBK time series. This page analyzes card <em>usage</em> patterns from ATM and POS transaction data.</p></div>
<div class="kpis" id="cd-k"></div>
<div class="note"><div class="note-tag">Card Activity</div><h3 id="cd-h"></h3><p id="cd-p"></p></div>
<div class="cgrid">
<div class="ccard"><h3>Card-based transactions: domestic vs cross-border</h3><div class="csub">All card activity at ATM + POS, EUR</div><canvas id="ch-cd-geo"></canvas></div>
<div class="ccard"><h3>Foreign cards in Kosovo vs Kosovo cards abroad</h3><div class="csub">Cross-border card flow direction, EUR</div><canvas id="ch-cd-flow"></canvas></div>
</div>
</div>"""

def mod_remittances():
    return """<div class="mod" id="mod-remittances">
<div class="pg-title"><h1>Remittances</h1>
<p>Diaspora remittance inflows by channel and origin country.</p></div>
<div class="kpis" id="rm-k"></div>
<div class="note"><div class="note-tag">Remittance Flows</div><h3 id="rm-h"></h3><p id="rm-p"></p></div>
<div class="cgrid">
<div class="ccard"><h3>Total remittance inflows</h3><div class="csub">All channels, EUR</div><canvas id="ch-rm-tr"></canvas></div>
<div class="ccard"><h3>Source country share</h3><div class="csub">% of total, latest period</div><canvas id="ch-rm-co"></canvas></div>
</div>
<div class="cgrid">
<div class="ccard full"><h3>Channel composition</h3><div class="csub">Banks vs MTOs vs Other, EUR</div><canvas id="ch-rm-ch"></canvas></div>
</div>
<div class="note caveat"><div class="note-tag">Data Notes</div><p>Remittance transaction counts are not available &mdash; only value (EUR) is reported. Country breakdown shows percentage shares (Total=100%), not absolute EUR amounts. Pre-2014 data is quarterly/annual only; monthly filter may return no results for those periods.</p></div>
</div>"""

def mod_methodology():
    return """<div class="mod" id="mod-methodology">
<div class="pg-title"><h1>Methodology &amp; Data Notes</h1>
<p>Data sources, KPI definitions, caveats, and formatting conventions.</p></div>

<div class="meth-section">
<h3>Data Coverage</h3>
<div class="tw"><table id="ex-t"><thead><tr>
<th onclick="sortC(0)" style="cursor:pointer">Module</th>
<th onclick="sortC(1)" style="cursor:pointer" class="num">Records</th>
<th onclick="sortC(2)" style="cursor:pointer">From</th>
<th onclick="sortC(3)" style="cursor:pointer">To</th>
<th>Frequency</th>
</tr></thead><tbody id="ex-b"></tbody></table></div>
</div>

<div class="meth-section">
<h3>KPI Definitions</h3>
<table><thead><tr><th>KPI</th><th>Definition</th><th>Status</th></tr></thead><tbody>
<tr><td>Total Banking Credit</td><td>Sum of all outstanding loans across customer segments (F10 Col 2). Includes all currencies.</td><td>Verified</td></tr>
<tr><td>Total EUR Deposits</td><td>Sum of all EUR deposit balances across segments (F08 Col 2). EUR only.</td><td>Verified</td></tr>
<tr><td>LTD Ratio</td><td>Total credit / Total EUR deposits &times; 100. Numerator includes ~&euro;0.97M non-EUR loans (0.015%).</td><td>Market Proxy</td></tr>
<tr><td>Pricing Gap</td><td>All new loans rate (F13 series T) minus time deposit rate (F13a series T_3). New-business rates only.</td><td>Proxy &mdash; not NIM</td></tr>
<tr><td>Remittances Total</td><td>Pre-computed Total row from source. Not summed from channels.</td><td>Verified</td></tr>
<tr><td>Retail Digital Share</td><td>(E-Banking + POS) / (E-Banking + POS + ATM) &times; 100. Excludes Interbank and ATM Deposits.</td><td>Verified</td></tr>
<tr><td>Total Payment Volume</td><td>Sum of 7 non-overlapping indicators. Parent totals for ATM/POS Abroad; children excluded from sum.</td><td>Verified</td></tr>
<tr><td>Avg EUR/Transaction</td><td>(amount in M / count in K) &times; 1000. Same period, same indicator.</td><td>Verified</td></tr>
</tbody></table>
</div>

<div class="meth-section">
<h3>Caveats &amp; Limitations</h3>
<ul>
<li>All data represents aggregate banking sector totals as published by CBK. No individual bank breakdowns.</li>
<li>Deposits are EUR only (F08 is titled &ldquo;Depozitat n&euml; Euro&rdquo;).</li>
<li>Loans include a negligible non-EUR component (~&euro;0.97M, 0.015% of total).</li>
<li>The pricing gap is a proxy comparing new-business rates. It is not NIM.</li>
<li>Deposit type breakdown from F11a: Transferable and Savings are stock; Time Deposits are flow. Never combined.</li>
<li>Sector breakdown covers corporate loans only (~&euro;3.8B, not total market ~&euro;6.6B).</li>
<li>Card issuance data (active cards, debit/credit split) is not available.</li>
<li>Remittance country data is percentage shares, not EUR amounts.</li>
<li>Monthly filter may not apply to quarterly remittance or annual payment data.</li>
<li>Maturity data uses original maturity buckets, not residual maturity.</li>
<li>Payments pre-2008 are annual only (mapped to December).</li>
</ul>
</div>

<div class="meth-section">
<h3>Formatting Conventions</h3>
<table><thead><tr><th>Symbol</th><th>Meaning</th><th>Example</th></tr></thead><tbody>
<tr><td>M</td><td>Million EUR</td><td>&euro;842 M</td></tr>
<tr><td>B</td><td>Billion EUR</td><td>&euro;7.58 B</td></tr>
<tr><td>%</td><td>Percentage</td><td>87.7%</td></tr>
<tr><td>pp</td><td>Percentage points (absolute change)</td><td>+2.3 pp</td></tr>
<tr><td>K txns</td><td>Thousand transactions</td><td>1,990.0K txns</td></tr>
</tbody></table>
</div>

<div class="note"><div class="note-tag">Design</div><p>Designed with a clean strategic research aesthetic for executive decision support.</p></div>
</div>"""

# ============ JAVASCRIPT ============
JS_CODE = r"""
const C1='#0f172a',C2='#1e40af',C3='#0d9488',C4='#d97706',C5='#be123c',GRN='#059669',GOLD='#b8860b';
const PAL=[C1,C2,C3,C4,C5,GRN,'#7c3aed','#0284c7','#dc2626','#0891b2','#c026d3','#65a30d'];
const PAL_BAR=['#0f172a','#1e40af','#0d9488','#d97706','#be123c','#059669','#7c3aed','#0284c7','#dc2626','#0891b2'];
Chart.defaults.font.family="'Inter',system-ui,sans-serif";
Chart.defaults.font.size=11;
Chart.defaults.color='#475569';
Chart.defaults.elements.line.borderWidth=2.2;
Chart.defaults.elements.point.radius=1;
Chart.defaults.elements.point.hoverRadius=5;
Chart.defaults.scale.grid={color:'#e8ecf1'};
Chart.defaults.scale.border={color:'#cbd5e1'};

const MM={January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',
July:'07',August:'08',September:'09',October:'10',November:'11',December:'12',
Janar:'01',Shkurt:'02',Mars:'03',Prill:'04',Maj:'05',Qershor:'06',Korrik:'07',
Gusht:'08',Shtator:'09',Tetor:'10','\u004e\u00ebntor':'11',Nentor:'11',Dhjetor:'12'};
const MN={'01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun','07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec'};

// ---- GLOBAL FORMATTERS ----
function pk(p){if(!p)return'0000-00';var s=String(p).replace(/\s*\(p\)\s*/,'').split(' ');if(s.length===1&&/^\d{4}$/.test(s[0]))return s[0]+'-12';if(s.length>=2&&/^\d{4}$/.test(s[0])){var m=MM[s[1]]||MM[s.slice(1).join(' ')]||'00';return s[0]+'-'+m}return p}
function sp(a){return a.slice().sort(function(x,y){return pk(x.period).localeCompare(pk(y.period))})}
function fmtP(p){if(!p)return'';var k=pk(p);var parts=k.split('-');if(parts.length===2&&MN[parts[1]])return MN[parts[1]]+' '+parts[0];return String(p).replace(/\s*\(p\)\s*/,'')}

function fmtMoney(v){
  if(v==null||isNaN(v))return'\u2014';
  var a=Math.abs(v);
  if(a>=1000)return'\u20AC'+(v/1000).toFixed(2)+' B';
  if(a>=1)return'\u20AC'+v.toFixed(1)+' M';
  if(a>=0.01)return'\u20AC'+v.toFixed(2)+' M';
  return'\u20AC'+(v*1000).toFixed(0)+' K';
}
function fmtPct(v){if(v==null||isNaN(v))return'\u2014';return v.toFixed(1)+'%'}
function fmtPP(v){if(v==null||isNaN(v))return'\u2014';return(v>=0?'+':'')+v.toFixed(1)+' pp'}
function fmtDelta(v){if(v==null||isNaN(v))return null;return(v>=0?'+':'')+parseFloat(v).toFixed(1)+'%'}
function fmtAvgEur(amt,cnt){if(!cnt||cnt===0||!amt)return'\u2014';var e=(amt/cnt)*1000;return'\u20AC'+Math.round(e)}
function fmtCount(v){if(v==null||isNaN(v))return'\u2014';return v.toLocaleString('en',{maximumFractionDigits:1})+'K'}
function fmtNum(n){if(n==null||isNaN(n))return'\u2014';if(Math.abs(n)>=1e4)return n.toLocaleString('en',{maximumFractionDigits:0});if(Math.abs(n)>=1)return n.toFixed(1);return n.toFixed(4)}

// ---- TOOLTIP FORMATTERS ----
var ttMoney={callbacks:{label:function(c){return c.dataset.label+': '+fmtMoney(c.parsed.y)}}};
var ttPct={callbacks:{label:function(c){return c.dataset.label+': '+fmtPct(c.parsed.y)}}};
var ttPP={callbacks:{label:function(c){return c.dataset.label+': '+fmtPP(c.parsed.y)}}};

function pctChange(a,b){if(!b||!a||b===0)return null;return((a-b)/Math.abs(b)*100).toFixed(1)}

// ---- FILTERS ----
function getYears(){
  var all=[];
  Object.keys(D).forEach(function(k){
    (D[k]||[]).forEach(function(r){if(!r.period)return;var y=parseInt(pk(r.period));if(y>1990&&y<2100&&all.indexOf(y)<0)all.push(y)});
  });return all.sort();
}
function initFilters(){
  var yrs=getYears();var yf=document.getElementById('f-yf'),yt=document.getElementById('f-yt');
  yf.innerHTML='';yt.innerHTML='';
  yrs.forEach(function(y){yf.innerHTML+='<option value="'+y+'">'+y+'</option>';yt.innerHTML+='<option value="'+y+'">'+y+'</option>'});
  yf.value=Math.max(yrs[0]||2000,2020);yt.value=yrs[yrs.length-1]||2026;
}
function getFilterState(){
  return{yf:parseInt(document.getElementById('f-yf').value)||2020,
         yt:parseInt(document.getElementById('f-yt').value)||2026,
         mo:document.getElementById('f-mo').value};
}
function flt(arr){
  var s=getFilterState();
  return arr.filter(function(r){var p=pk(r.period);var y=parseInt(p);var m=p.split('-')[1];
    if(y<s.yf||y>s.yt)return false;if(s.mo!=='all'&&m!==s.mo)return false;return true});
}
function fltYearOnly(arr){
  var s=getFilterState();
  return arr.filter(function(r){var p=pk(r.period);var y=parseInt(p);
    if(y<s.yf||y>s.yt)return false;return true});
}
function isMonthFiltered(){return getFilterState().mo!=='all'}
function showFilterNote(containerId,msg){
  var c=document.getElementById(containerId);if(!c)return;
  var existing=c.querySelector('.filter-note');if(existing)existing.remove();
  if(!msg)return;
  var d=document.createElement('div');d.className='filter-note';
  d.style.cssText='background:#fffbeb;border:1px solid #fcd34d;border-radius:4px;padding:8px 14px;margin-bottom:12px;font-size:11px;color:#92400e';
  d.textContent=msg;c.prepend(d);
}
function latest(arr,fn){var f=fn?arr.filter(fn):arr;f=flt(f);if(!f.length)return null;return sp(f)[f.length-1]}
function latestYearOnly(arr,fn){var f=fn?arr.filter(fn):arr;f=fltYearOnly(f);if(!f.length)return null;return sp(f)[f.length-1]}
function prior12(arr,latP,fn){
  if(!latP)return null;var p=pk(latP);var y=parseInt(p),m=parseInt(p.split('-')[1])||12;
  var f=fn?arr.filter(fn):arr;var best=null,bd=999;
  f.forEach(function(r){var rp=pk(r.period);var ry=parseInt(rp),rm=parseInt(rp.split('-')[1])||12;
    var d=Math.abs((y*12+m)-(ry*12+rm)-12);if(d<bd){bd=d;best=r}});
  return bd<=2?best:null;
}
function priorMo(arr,latP,fn){
  if(!latP)return null;var p=pk(latP);var y=parseInt(p),m=parseInt(p.split('-')[1])||12;
  var pm=m-1,py=y;if(pm<1){pm=12;py--}var target=py+'-'+(pm<10?'0'+pm:pm);
  var f=fn?arr.filter(fn):arr;
  return f.find(function(r){return pk(r.period)===target})||null;
}
function resetF(){var yrs=getYears();document.getElementById('f-yf').value=Math.max(yrs[0]||2000,2020);document.getElementById('f-yt').value=yrs[yrs.length-1]||2026;document.getElementById('f-mo').value='all';buildAll()}

// Nav
document.querySelectorAll('.nav-item').forEach(function(el){el.addEventListener('click',function(){
  document.querySelectorAll('.nav-item').forEach(function(x){x.classList.remove('active')});
  document.querySelectorAll('.mod').forEach(function(x){x.classList.remove('active')});
  el.classList.add('active');document.getElementById('mod-'+el.dataset.mod).classList.add('active');
  window.scrollTo({top:document.querySelector('.main').offsetTop-60,behavior:'smooth'})})});

// ---- TABLE SORT ----
function sortC(col){
  var tb=document.getElementById('ex-b');if(!tb)return;
  var rows=[].slice.call(tb.rows);
  var asc=tb.dataset.sortCol==col&&tb.dataset.sortDir==='asc'?'desc':'asc';
  tb.dataset.sortCol=col;tb.dataset.sortDir=asc;
  rows.sort(function(a,b){
    var av=a.cells[col].textContent.trim().replace(/,/g,'');
    var bv=b.cells[col].textContent.trim().replace(/,/g,'');
    var an=parseFloat(av),bn=parseFloat(bv);
    if(!isNaN(an)&&!isNaN(bn))return asc==='asc'?an-bn:bn-an;
    return asc==='asc'?av.localeCompare(bv):bv.localeCompare(av);
  });
  rows.forEach(function(r){tb.appendChild(r)});
}

// ---- CHART HELPERS ----
var CHS={};
function mc(id,t,cfg){if(CHS[id])CHS[id].destroy();var ctx=document.getElementById(id);if(!ctx)return null;CHS[id]=new Chart(ctx,Object.assign({type:t},cfg));return CHS[id]}
function lc(id,lbs,ds,o){ds.forEach(function(d,i){if(!d.borderWidth)d.borderWidth=2.2;if(!d.pointRadius&&d.pointRadius!==0)d.pointRadius=ds.length>1?1.5:0;if(!d.pointHoverRadius)d.pointHoverRadius=5});return mc(id,'line',{data:{labels:lbs.map(fmtP),datasets:ds},options:Object.assign({responsive:true,aspectRatio:2,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{font:{size:11},usePointStyle:true,pointStyle:'circle',padding:12}},tooltip:ttMoney},scales:{x:{ticks:{maxTicksAutoSkip:true,maxRotation:0,font:{size:9}}},y:{beginAtZero:false,ticks:{font:{size:10},callback:function(v){return fmtMoney(v)}}}}},o||{})})}
function lcPct(id,lbs,ds,o){ds.forEach(function(d,i){if(!d.borderWidth)d.borderWidth=2.2;if(!d.pointRadius&&d.pointRadius!==0)d.pointRadius=ds.length>1?1.5:0;if(!d.pointHoverRadius)d.pointHoverRadius=5});return mc(id,'line',{data:{labels:lbs.map(fmtP),datasets:ds},options:Object.assign({responsive:true,aspectRatio:2,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{font:{size:11},usePointStyle:true,pointStyle:'circle',padding:12}},tooltip:ttPct},scales:{x:{ticks:{maxTicksAutoSkip:true,maxRotation:0,font:{size:9}}},y:{ticks:{font:{size:10},callback:function(v){return v.toFixed(1)+'%'}}}}},o||{})})}
function bc(id,lbs,d,c,o){return mc(id,'bar',{data:{labels:lbs,datasets:[{data:d,backgroundColor:c||PAL_BAR,borderRadius:3,maxBarThickness:32}]},options:Object.assign({responsive:true,aspectRatio:1.5,indexAxis:'y',plugins:{legend:{display:false},tooltip:ttMoney},scales:{x:{ticks:{font:{size:10},callback:function(v){return fmtMoney(v)}}},y:{ticks:{font:{size:11,color:'#1e293b'}}}}},o||{})})}
function dc(id,lbs,d,cols){return mc(id,'doughnut',{data:{labels:lbs,datasets:[{data:d,backgroundColor:cols||PAL,borderWidth:0,hoverOffset:4}]},options:{responsive:true,aspectRatio:1.3,cutout:'60%',plugins:{legend:{position:'right',labels:{font:{size:10},padding:8}},tooltip:ttMoney}}})}
function dualAxis(id,lbs,ds1,ds2,l1,l2){return mc(id,'line',{data:{labels:lbs.map(fmtP),datasets:[
  {label:l1,data:ds1,borderColor:C1,backgroundColor:C1+'15',fill:true,tension:.3,yAxisID:'y',borderWidth:2.2,pointRadius:1},
  {label:l2,data:ds2,borderColor:'#d97706',borderDash:[4,2],tension:.3,yAxisID:'y1',borderWidth:2,pointRadius:1}
]},options:{responsive:true,aspectRatio:2,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top'},tooltip:{callbacks:{label:function(c){if(c.datasetIndex===0)return c.dataset.label+': '+fmtMoney(c.parsed.y);return c.dataset.label+': '+fmtCount(c.parsed.y)}}}},scales:{x:{ticks:{maxRotation:0,font:{size:9}}},y:{position:'left',title:{display:true,text:l1,font:{size:10}},ticks:{callback:function(v){return fmtMoney(v)}}},y1:{position:'right',grid:{drawOnChartArea:false},title:{display:true,text:l2,font:{size:10}},ticks:{callback:function(v){return fmtCount(v)}}}}}})}

function noData(id,msg){var c=document.getElementById(id);if(!c)return;var p=c.parentElement;if(!p)return;var d=p.querySelector('.no-data');if(d)d.remove();if(!msg)return;c.style.display='none';d=document.createElement('div');d.className='no-data';d.style.cssText='display:flex;align-items:center;justify-content:center;height:140px;color:#94a3b8;font-size:12px;font-style:italic';d.textContent=msg;p.appendChild(d)}
function showCanvas(id){var c=document.getElementById(id);if(c)c.style.display='';var p=c?c.parentElement:null;if(p){var d=p.querySelector('.no-data');if(d)d.remove()}}

// ---- KPI CARD BUILDER ----
function addK(cid,label,val,delta,deltaSuffix,sub){
  var c=document.getElementById(cid);if(!c)return;var d=document.createElement('div');d.className='kpi';
  var dh='';
  if(delta!=null&&!isNaN(parseFloat(delta))){
    var v=parseFloat(delta);var cls=v>=0?'up':'dn';var arrow=v>=0?'&#9650;':'&#9660;';
    var suffix=deltaSuffix||'%';
    dh='<div class="kpi-d '+cls+'">'+arrow+' '+(v>=0?'+':'')+v.toFixed(1)+suffix+' YoY</div>';
  }
  d.innerHTML='<div class="kpi-l">'+label+'</div><div class="kpi-v">'+val+'</div>'+dh+(sub?'<div class="kpi-s">'+sub+'</div>':'');
  c.appendChild(d);
}

// ---- AGGREGATE HELPERS ----
function pyDelta(PY,ind,measure){
  var v=latest(PY,function(r){return r.indicator===ind});
  if(!v)return{v:null,yoy:null,p:'',raw:null};
  var p12=prior12(PY,v.period,function(r){return r.indicator===ind});
  var val=measure==='count'?v.count:v.amount;
  var pv12=p12?(measure==='count'?p12.count:p12.amount):null;
  return{v:val,yoy:val&&pv12?pctChange(val,pv12):null,p:v.period,raw:v};
}
function cardAgg(pyArr,indicators,measure){
  var byP={};
  pyArr.forEach(function(r){
    if(indicators.indexOf(r.indicator)<0)return;
    var val=measure==='count'?r.count:r.amount;
    if(val==null)return;
    if(!byP[r.period])byP[r.period]=0;
    byP[r.period]+=val;
  });return byP;
}

// ======== MAIN BUILD ========
function buildAll(){
['ov-k','ln-k','dp-k','rt-k','py-k','at-k','po-k','cd-k','rm-k'].forEach(function(id){var e=document.getElementById(id);if(e)e.innerHTML=''});
document.querySelectorAll('.no-data').forEach(function(e){e.remove()});
document.querySelectorAll('.filter-note').forEach(function(e){e.remove()});
document.querySelectorAll('canvas').forEach(function(e){e.style.display=''});
var fs=getFilterState();
var moActive=fs.mo!=='all';
// Show filter-context notes for modules with mixed/non-monthly frequency
if(moActive){
  showFilterNote('mod-remittances','Month filter is active. Remittance data before 2014 is quarterly/annual — those periods will not appear. If no data shows, try resetting the month filter.');
  showFilterNote('mod-payments','Month filter is active. Some early payment data (pre-2008) is annual only and mapped to December. Other months may appear empty for those years.');
}

var LC=D.loans_customer||[];var LS=D.loans_sector||[];var LM=D.loans_maturity||[];
var NL=D.new_loans||[];var DS=D.dep_segments||[];var ND=D.new_deposits||[];
var PY=D.payments||[];var FX=D.fx||[];var NR=D.neer||[];
var RC=D.remit_channel||[];var RCO=D.remit_country||[];
var IRL=D.int_rates_loans||[];var IRD=D.int_rates_deposits||[];

// === NON-OVERLAPPING PAYMENT INDICATORS ===
var TOTAL_IND=['Interbank','ATM Domestic','ATM Abroad Total','POS Domestic','POS Abroad Total','ATM Deposits','E-Banking'];
var RETAIL_DIG=['E-Banking','POS Domestic','POS Abroad Total'];
var RETAIL_CASH=['ATM Domestic','ATM Abroad Total'];

// ===================== OVERVIEW =====================
var lCr=latest(LC,function(r){return r.segment==='Total'});
var pCr=lCr?prior12(LC,lCr.period,function(r){return r.segment==='Total'}):null;
var lDp=latest(DS,function(r){return r.segment==='Total'});
var pDp=lDp?prior12(DS,lDp.period,function(r){return r.segment==='Total'}):null;

// LTD with pp delta
var ltd=lCr&&lDp&&lDp.value>0?(lCr.value/lDp.value*100):null;
var pLTD=pCr&&pDp&&pDp.value>0?(pCr.value/pDp.value*100):null;
var ltdDeltaPP=ltd!=null&&pLTD!=null?(ltd-pLTD):null;

addK('ov-k','Total Banking Credit',lCr?fmtMoney(lCr.value):'\u2014',lCr&&pCr?pctChange(lCr.value,pCr.value):null,'%',lCr?fmtP(lCr.period):'');
addK('ov-k','Total EUR Deposits',lDp?fmtMoney(lDp.value):'\u2014',lDp&&pDp?pctChange(lDp.value,pDp.value):null,'%',lDp?fmtP(lDp.period):'');
addK('ov-k','LTD Ratio (Market Proxy)',ltd!=null?fmtPct(ltd):'\u2014',ltdDeltaPP,' pp','Credit / EUR deposits');

var lRm=latest(RC,function(r){return r.channel==='Total'});
var pRm=lRm?prior12(RC,lRm.period,function(r){return r.channel==='Total'}):null;
addK('ov-k','Remittances',lRm?fmtMoney(lRm.value):'\u2014',lRm&&pRm?pctChange(lRm.value,pRm.value):null,'%',lRm?fmtP(lRm.period):'');

var lLR=latest(IRL,function(r){return r.type==='All Loans Rate'});
var pLR=lLR?prior12(IRL,lLR.period,function(r){return r.type==='All Loans Rate'}):null;
var lDR=latest(IRD,function(r){return r.type==='Time Deposit Rate'});
var pDR=lDR?prior12(IRD,lDR.period,function(r){return r.type==='Time Deposit Rate'}):null;
addK('ov-k','Lending Rate',lLR?fmtPct(lLR.value):'\u2014',lLR&&pLR?(lLR.value-pLR.value):null,' pp',lLR?fmtP(lLR.period):'');
addK('ov-k','Deposit Rate',lDR?fmtPct(lDR.value):'\u2014',lDR&&pDR?(lDR.value-pDR.value):null,' pp',lDR?fmtP(lDR.period):'');

// Commentary
var oh=document.getElementById('ov-h'),op=document.getElementById('ov-p');
if(lCr&&lDp&&ltd!=null){
  oh.textContent='Credit '+fmtMoney(lCr.value)+' | Deposits '+fmtMoney(lDp.value)+' | LTD '+fmtPct(ltd);
  var t='As of '+fmtP(lCr.period)+', total banking credit stands at '+fmtMoney(lCr.value)+' against EUR deposits of '+fmtMoney(lDp.value)+'.';
  if(pCr)t+=' Credit changed '+fmtDelta(pctChange(lCr.value,pCr.value))+' YoY.';
  t+=' LTD of '+fmtPct(ltd)+' means '+ltd.toFixed(0)+' cents of every EUR in deposits is deployed as credit.';
  if(lLR&&lDR)t+=' Lending rate: '+fmtPct(lLR.value)+', deposit rate: '+fmtPct(lDR.value)+', pricing gap: '+fmtPP(lLR.value-lDR.value)+'.';
  op.textContent=t;
} else {oh.textContent='No data in selected period';op.textContent='Adjust filters above.'}

// Overview charts
var crF=sp(flt(LC.filter(function(r){return r.segment==='Total'})));
if(crF.length){showCanvas('ch-ov-cr');lc('ch-ov-cr',crF.map(function(r){return r.period}),[{label:'Total Credit',data:crF.map(function(r){return r.value}),borderColor:C1,backgroundColor:C1+'10',fill:true,tension:.3}],{plugins:{legend:{display:false},tooltip:ttMoney}})}
else noData('ch-ov-cr','No credit data in selected period');

var dpF=sp(flt(DS.filter(function(r){return r.segment==='Total'})));
if(dpF.length){showCanvas('ch-ov-dp');lc('ch-ov-dp',dpF.map(function(r){return r.period}),[{label:'Total Deposits',data:dpF.map(function(r){return r.value}),borderColor:C2,backgroundColor:C2+'10',fill:true,tension:.3}],{plugins:{legend:{display:false},tooltip:ttMoney}})}
else noData('ch-ov-dp','No deposit data in selected period');

// LTD trend
var crM={},dpM={};flt(LC.filter(function(r){return r.segment==='Total'})).forEach(function(r){crM[pk(r.period)]=r});
flt(DS.filter(function(r){return r.segment==='Total'})).forEach(function(r){dpM[pk(r.period)]=r});
var ltdK=Object.keys(crM).filter(function(k){return dpM[k]}).sort();
var ltdL=[],ltdD=[];ltdK.forEach(function(k){ltdL.push(crM[k].period);ltdD.push(crM[k].value/dpM[k].value*100)});
if(ltdL.length){showCanvas('ch-ov-ltd');lcPct('ch-ov-ltd',ltdL,[{label:'LTD %',data:ltdD,borderColor:GOLD,tension:.3}],{plugins:{legend:{display:false},tooltip:ttPct},scales:{y:{suggestedMin:40,suggestedMax:100}}})}
else noData('ch-ov-ltd','No LTD data');

var rmF=sp(flt(RC.filter(function(r){return r.channel==='Total'})));
if(rmF.length){showCanvas('ch-ov-rm');lc('ch-ov-rm',rmF.map(function(r){return r.period}),[{label:'Total',data:rmF.map(function(r){return r.value}),borderColor:GRN,backgroundColor:GRN+'10',fill:true,tension:.3}],{plugins:{legend:{display:false},tooltip:ttMoney}})}
else noData('ch-ov-rm','No remittance data');

// ===================== LOANS =====================
var lHH=latest(LC,function(r){return r.segment==='Households'});
var pHH=lHH?prior12(LC,lHH.period,function(r){return r.segment==='Households'}):null;
var lNFC=latest(LC,function(r){return r.segment==='Non-Financial Corporations'});
var pNFC=lNFC?prior12(LC,lNFC.period,function(r){return r.segment==='Non-Financial Corporations'}):null;

addK('ln-k','Total Credit',lCr?fmtMoney(lCr.value):'\u2014',lCr&&pCr?pctChange(lCr.value,pCr.value):null,'%',lCr?fmtP(lCr.period):'');
addK('ln-k','Households',lHH?fmtMoney(lHH.value):'\u2014',lHH&&pHH?pctChange(lHH.value,pHH.value):null,'%',lHH?fmtP(lHH.period):'');
addK('ln-k','Corporates (NFC)',lNFC?fmtMoney(lNFC.value):'\u2014',lNFC&&pNFC?pctChange(lNFC.value,pNFC.value):null,'%',lNFC?fmtP(lNFC.period):'');
if(lCr&&lHH){addK('ln-k','HH Share',fmtPct(lHH.value/lCr.value*100),null,null,'')}

// New loans KPIs
var lNLT=latest(NL,function(r){return r.type==='Total New Loans'});
var pNLT=lNLT?prior12(NL,lNLT.period,function(r){return r.type==='Total New Loans'}):null;
addK('ln-k','New Lending (Flow)',lNLT?fmtMoney(lNLT.value):'\u2014',lNLT&&pNLT?pctChange(lNLT.value,pNLT.value):null,'%',lNLT?fmtP(lNLT.period):'');

// Revolving credit stock KPI (separated from flow)
var lOD=latest(NL,function(r){return r.type==='Overdrafts & Credit Cards'});
addK('ln-k','Revolving Credit (Stock)',lOD?fmtMoney(lOD.value):'\u2014',null,null,lOD?fmtP(lOD.period)+' | End-of-period balance':'');

var lh=document.getElementById('ln-h'),lp2=document.getElementById('ln-p');
if(lCr&&lHH&&lNFC){
  lh.textContent='Households: '+fmtPct(lHH.value/lCr.value*100)+' of total ('+fmtMoney(lHH.value)+'). Corporates: '+fmtPct(lNFC.value/lCr.value*100)+' ('+fmtMoney(lNFC.value)+').';
  lp2.textContent='Total credit '+fmtMoney(lCr.value)+' as of '+fmtP(lCr.period)+'. Customer segmentation from ODC loans file. Sector breakdown covers corporate loans only.';
}

// Customer segment trends
var custSegs=['Households','Non-Financial Corporations','Government','Non-Residents','Financial Corporations'];
var custF=sp(flt(LC));
var custPeriods=[...new Set(custF.filter(function(r){return r.segment==='Total'}).map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
if(custPeriods.length){
  showCanvas('ch-ln-cust');lc('ch-ln-cust',custPeriods,custSegs.map(function(seg,i){
    var pm={};custF.filter(function(r){return r.segment===seg}).forEach(function(r){pm[r.period]=r.value});
    return{label:seg.replace('Non-Financial ','NF '),data:custPeriods.map(function(p){return pm[p]||null}),borderColor:PAL[i],tension:.3,spanGaps:true,borderWidth:i<2?2.5:1.8,pointRadius:0};
  }));
} else noData('ch-ln-cust','No loan data');

// Customer composition pie
var custComp=custSegs.map(function(seg){var v=latest(LC,function(r){return r.segment===seg});return{l:seg,v:v?v.value:0}}).filter(function(x){return x.v>0});
if(custComp.length){showCanvas('ch-ln-pie');dc('ch-ln-pie',custComp.map(function(x){return x.l}),custComp.map(function(x){return x.v}))}
else noData('ch-ln-pie','No data');

// [A1 FIX] New loans by type - FLOW ONLY, no Overdrafts
var nlFlowTypes=['Consumer Loans','Mortgage Loans','Other Loans'];
var nlF=sp(flt(NL));
var nlPeriods=[...new Set(nlF.filter(function(r){return nlFlowTypes.indexOf(r.type)>=0}).map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
if(nlPeriods.length){
  showCanvas('ch-ln-type');lc('ch-ln-type',nlPeriods,nlFlowTypes.map(function(t,i){
    var pm={};nlF.filter(function(r){return r.type===t}).forEach(function(r){pm[r.period]=r.value});
    return{label:t,data:nlPeriods.map(function(p){return pm[p]||null}),borderColor:PAL[i],tension:.3,spanGaps:true};
  }));
} else noData('ch-ln-type','No new loan flow data');

// New loans HH vs Corp
var hhCorpTypes=['Household Total','Corporate Total'];
var hhCorpP=[...new Set(nlF.filter(function(r){return hhCorpTypes.indexOf(r.type)>=0}).map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
if(hhCorpP.length){
  showCanvas('ch-ln-hhcorp');lc('ch-ln-hhcorp',hhCorpP,hhCorpTypes.map(function(t,i){
    var pm={};nlF.filter(function(r){return r.type===t}).forEach(function(r){pm[r.period]=r.value});
    return{label:t,data:hhCorpP.map(function(p){return pm[p]||null}),borderColor:PAL[i],tension:.3,spanGaps:true};
  }));
} else noData('ch-ln-hhcorp','No HH/Corp data');

// HH + Corp maturity
var matSegs=['Up to 1 year','1-2 years','2-5 years','5-10 years','Over 10 years'];
var matHH=matSegs.map(function(m){var v=latest(LM,function(r){return r.segment==='Households'&&r.maturity===m});return{l:m,v:v?v.value:0}}).filter(function(x){return x.v>0});
if(matHH.length){showCanvas('ch-ln-mat');bc('ch-ln-mat',matHH.map(function(x){return x.l}),matHH.map(function(x){return x.v}),PAL_BAR)}
else noData('ch-ln-mat','No HH maturity data in selected period');
var matNFC=matSegs.map(function(m){var v=latest(LM,function(r){return r.segment==='Non-Financial Corporations'&&r.maturity===m});return{l:m,v:v?v.value:0}}).filter(function(x){return x.v>0});
if(matNFC.length){showCanvas('ch-ln-matc');bc('ch-ln-matc',matNFC.map(function(x){return x.l}),matNFC.map(function(x){return x.v}),PAL_BAR.slice(2))}
else noData('ch-ln-matc','No NFC maturity data in selected period');

// [A6 FIX] Corporate sector - DATA-DRIVEN, not hardcoded
var allSectors=LS.filter(function(r){return r.sector!=='Total'});
var sectorLatest={};
allSectors.forEach(function(r){var curr=sectorLatest[r.sector];if(!curr||pk(r.period)>pk(curr.period))sectorLatest[r.sector]=r});
var sortedSectors=Object.values(sectorLatest).sort(function(a,b){return b.value-a.value}).slice(0,10);
if(sortedSectors.length){showCanvas('ch-ln-sec');bc('ch-ln-sec',sortedSectors.map(function(s){return s.sector}),sortedSectors.map(function(s){return s.value}),PAL_BAR)}
else noData('ch-ln-sec','No sector data');

// ===================== DEPOSITS =====================
var dSegs=['Households & NPISH','Non-Financial Corporations','Government','Financial Corporations','Non-Residents'];
dSegs.forEach(function(seg){
  var v=latest(DS,function(r){return r.segment===seg});
  var p12=v?prior12(DS,v.period,function(r){return r.segment===seg}):null;
  addK('dp-k',seg.replace('& NPISH','').replace('Non-Financial ','NF '),v?fmtMoney(v.value):'\u2014',
    v&&p12?pctChange(v.value,p12.value):null,'%',v?fmtP(v.period):'');
});

var dh=document.getElementById('dp-h'),dpEl=document.getElementById('dp-p');
var lHHD=latest(DS,function(r){return r.segment==='Households & NPISH'});
if(lDp&&lHHD){
  dh.textContent='Households: '+fmtPct(lHHD.value/lDp.value*100)+' of EUR deposits ('+fmtMoney(lHHD.value)+'). Total: '+fmtMoney(lDp.value)+'.';
  dpEl.textContent='Total EUR deposits '+fmtMoney(lDp.value)+' as of '+fmtP(lDp.period)+'. Type breakdown covers HH and Corporate only. Stock and flow series are shown separately.';
}

// Deposit segment trends
var dsF=sp(flt(DS));
var dsPeriods=[...new Set(dsF.filter(function(r){return r.segment==='Total'}).map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
if(dsPeriods.length){
  showCanvas('ch-dp-seg');lc('ch-dp-seg',dsPeriods,dSegs.map(function(seg,i){
    var pm={};dsF.filter(function(r){return r.segment===seg}).forEach(function(r){pm[r.period]=r.value});
    return{label:seg.replace('& NPISH','').replace('Non-Financial ','NF '),data:dsPeriods.map(function(p){return pm[p]||null}),borderColor:PAL[i],tension:.3,spanGaps:true};
  }));
} else noData('ch-dp-seg','No deposit data');

// [C3] HH vs NFC deposit share trend
if(dsPeriods.length){
  var hhPm={},nfcPm={},totPm={};
  dsF.filter(function(r){return r.segment==='Households & NPISH'}).forEach(function(r){hhPm[r.period]=r.value});
  dsF.filter(function(r){return r.segment==='Non-Financial Corporations'}).forEach(function(r){nfcPm[r.period]=r.value});
  dsF.filter(function(r){return r.segment==='Total'}).forEach(function(r){totPm[r.period]=r.value});
  showCanvas('ch-dp-share');lcPct('ch-dp-share',dsPeriods,[
    {label:'Households',data:dsPeriods.map(function(p){return totPm[p]?hhPm[p]/totPm[p]*100:null}),borderColor:C1,tension:.3},
    {label:'NFC',data:dsPeriods.map(function(p){return totPm[p]?nfcPm[p]/totPm[p]*100:null}),borderColor:'#d97706',tension:.3,borderWidth:2.2}
  ]);
} else noData('ch-dp-share','No data');

// [A2 FIX] Deposit stock chart - ONLY Transferable + Savings (stock)
var stockTypes=['Total Transferable','Total Savings'];
var ndF=sp(flt(ND));
var stockP=[...new Set(ndF.filter(function(r){return stockTypes.indexOf(r.type)>=0}).map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
if(stockP.length){
  showCanvas('ch-dp-stock');lc('ch-dp-stock',stockP,stockTypes.map(function(t,i){
    var pm={};ndF.filter(function(r){return r.type===t}).forEach(function(r){pm[r.period]=r.value});
    return{label:t.replace('Total ',''),data:stockP.map(function(p){return pm[p]||null}),borderColor:PAL[i],tension:.3,spanGaps:true};
  }));
} else noData('ch-dp-stock','No deposit stock data');

// [A2 FIX] Deposit flow chart - ONLY Time Deposits (flow)
var flowTypes=['Total Time Deposits','HH Time Deposits','Corp Time Deposits'];
var flowP=[...new Set(ndF.filter(function(r){return flowTypes.indexOf(r.type)>=0}).map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
if(flowP.length){
  showCanvas('ch-dp-flow');lc('ch-dp-flow',flowP,flowTypes.map(function(t,i){
    var pm={};ndF.filter(function(r){return r.type===t}).forEach(function(r){pm[r.period]=r.value});
    return{label:t.replace('Total ',''),data:flowP.map(function(p){return pm[p]||null}),borderColor:PAL[i],tension:.3,spanGaps:true};
  }));
} else noData('ch-dp-flow','No time deposit flow data');

// ===================== RATES =====================
addK('rt-k','Lending Rate',lLR?fmtPct(lLR.value):'\u2014',lLR&&pLR?(lLR.value-pLR.value):null,' pp',lLR?fmtP(lLR.period)+' | New loans':'');
addK('rt-k','Deposit Rate',lDR?fmtPct(lDR.value):'\u2014',lDR&&pDR?(lDR.value-pDR.value):null,' pp',lDR?fmtP(lDR.period)+' | New time deposits':'');
if(lLR&&lDR){addK('rt-k','Pricing Gap (Proxy)',fmtPP(lLR.value-lDR.value),null,null,'Lending minus deposit rate')}

var lCons=latest(IRL,function(r){return r.type==='Consumer Loan Rate'});
var lMort=latest(IRL,function(r){return r.type==='Mortgage Rate'});
var lCorpR=latest(IRL,function(r){return r.type==='Corp Loan Rate'});
var lHHCons=latest(IRL,function(r){return r.type==='HH Consumer Rate'});
addK('rt-k','Consumer Rate',lCons?fmtPct(lCons.value):'\u2014',null,null,'');
addK('rt-k','Mortgage Rate',lMort?fmtPct(lMort.value):'\u2014',null,null,'');
addK('rt-k','Corp Lending',lCorpR?fmtPct(lCorpR.value):'\u2014',null,null,'');

var rth=document.getElementById('rt-h'),rtp=document.getElementById('rt-p');
if(lLR&&lDR){
  rth.textContent='Lending '+fmtPct(lLR.value)+' | Deposit '+fmtPct(lDR.value)+' | Gap '+fmtPP(lLR.value-lDR.value);
  rtp.textContent='Effective rates on new business. Consumer: '+fmtPct(lCons?lCons.value:0)+', mortgage: '+fmtPct(lMort?lMort.value:0)+', corporate: '+fmtPct(lCorpR?lCorpR.value:0)+'.';
}

// Lending rates by product
var lrTypes=['All Loans Rate','Consumer Loan Rate','Mortgage Rate','Corp Loan Rate'];
var lrLabels=['All New Loans','Consumer','Mortgage','Corporate'];
var lrF=sp(flt(IRL));
var lrP=[...new Set(lrF.filter(function(r){return r.type==='All Loans Rate'}).map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
if(lrP.length){
  showCanvas('ch-rt-prod');lcPct('ch-rt-prod',lrP,lrTypes.map(function(t,i){
    var pm={};lrF.filter(function(r){return r.type===t}).forEach(function(r){pm[r.period]=r.value});
    return{label:lrLabels[i],data:lrP.map(function(p){return pm[p]||null}),borderColor:PAL[i],tension:.3,spanGaps:true};
  }));
} else noData('ch-rt-prod','No lending rate data');

// Deposit rates
var drTypes=['Time Deposit Rate','HH Time Deposit Rate','Corp Time Deposit Rate'];
var drLabels=['All Time Deposits','Household','Corporate'];
var drF=sp(flt(IRD));
var drP=[...new Set(drF.filter(function(r){return r.type==='Time Deposit Rate'}).map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
if(drP.length){
  showCanvas('ch-rt-dep');lcPct('ch-rt-dep',drP,drTypes.map(function(t,i){
    var pm={};drF.filter(function(r){return r.type===t}).forEach(function(r){pm[r.period]=r.value});
    return{label:drLabels[i],data:drP.map(function(p){return pm[p]||null}),borderColor:PAL[i],tension:.3,spanGaps:true};
  }));
} else noData('ch-rt-dep','No deposit rate data');

// [C1] Pricing gap trend with shaded area
var spreadP=lrP.filter(function(p){
  var lr=lrF.find(function(r){return r.period===p&&r.type==='All Loans Rate'});
  var dr=drF.find(function(r){return r.period===p&&r.type==='Time Deposit Rate'});
  return lr&&dr;
});
if(spreadP.length){
  var lrMap={},drMap2={};
  lrF.filter(function(r){return r.type==='All Loans Rate'}).forEach(function(r){lrMap[r.period]=r.value});
  drF.filter(function(r){return r.type==='Time Deposit Rate'}).forEach(function(r){drMap2[r.period]=r.value});
  showCanvas('ch-rt-spread');
  lcPct('ch-rt-spread',spreadP,[
    {label:'Lending Rate',data:spreadP.map(function(p){return lrMap[p]||null}),borderColor:C1,tension:.3},
    {label:'Deposit Rate',data:spreadP.map(function(p){return drMap2[p]||null}),borderColor:C3,tension:.3},
    {label:'Gap',data:spreadP.map(function(p){return lrMap[p]&&drMap2[p]?(lrMap[p]-drMap2[p]):null}),borderColor:GOLD,backgroundColor:GOLD+'20',fill:true,tension:.3}
  ]);
} else noData('ch-rt-spread','No spread data');

// [C2] HH vs Corp lending rates
var hhCorpRP=lrP;
if(hhCorpRP.length){
  var hhRMap={},coRMap={};
  lrF.filter(function(r){return r.type==='HH Consumer Rate'}).forEach(function(r){hhRMap[r.period]=r.value});
  lrF.filter(function(r){return r.type==='Corp Loan Rate'}).forEach(function(r){coRMap[r.period]=r.value});
  showCanvas('ch-rt-hhcorp');lcPct('ch-rt-hhcorp',hhCorpRP,[
    {label:'HH Consumer',data:hhCorpRP.map(function(p){return hhRMap[p]||null}),borderColor:C1,tension:.3,spanGaps:true},
    {label:'Corporate',data:hhCorpRP.map(function(p){return coRMap[p]||null}),borderColor:C3,tension:.3,spanGaps:true}
  ]);
} else noData('ch-rt-hhcorp','No rate data');

// NEER/REER
var nrF=sp(flt(NR));
var nrP=[...new Set(nrF.map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
if(nrP.length){
  showCanvas('ch-rt-neer');lc('ch-rt-neer',nrP,['NEER','REER_Total','REER_EU','REER_CEFTA'].map(function(idx,i){
    var pm={};nrF.filter(function(r){return r.index===idx}).forEach(function(r){pm[r.period]=r.value});
    return{label:idx.replace(/_/g,' '),data:nrP.map(function(p){return pm[p]||null}),borderColor:PAL[i],tension:.3,spanGaps:true};
  }),{plugins:{tooltip:{callbacks:{label:function(c){return c.dataset.label+': '+fmtNum(c.parsed.y)}}}}});
} else noData('ch-rt-neer','No NEER/REER data');

// ===================== PAYMENTS =====================
// Total payment KPI (7 non-overlapping)
var pyFiltered=flt(PY);
var totalPayAmt=cardAgg(pyFiltered,TOTAL_IND,'amount');
var totalPayCnt=cardAgg(pyFiltered,TOTAL_IND,'count');
var tpPeriods=Object.keys(totalPayAmt).sort();
var tpLatest=tpPeriods[tpPeriods.length-1];
var tpPrior=tpPeriods.length>12?tpPeriods[tpPeriods.length-13]:null;
var tpLatVal=tpLatest?totalPayAmt[tpLatest]:null;
var tpPriVal=tpPrior?totalPayAmt[tpPrior]:null;
addK('py-k','Total Payment Volume',tpLatVal!=null?fmtMoney(tpLatVal):'\u2014',tpLatVal&&tpPriVal?pctChange(tpLatVal,tpPriVal):null,'%','7 non-overlapping channels');

// Digital share KPI (retail only)
var digAmt=cardAgg(pyFiltered,RETAIL_DIG,'amount');
var cashAmt=cardAgg(pyFiltered,RETAIL_CASH,'amount');
var dShareLatP=Object.keys(digAmt).sort();
var dShareP=dShareLatP[dShareLatP.length-1];
var digV=dShareP?digAmt[dShareP]:null;
var cashV=dShareP?cashAmt[dShareP]:null;
var digitalShare=digV!=null&&cashV!=null&&(digV+cashV)>0?digV/(digV+cashV)*100:null;
addK('py-k','Retail Digital Share',digitalShare!=null?fmtPct(digitalShare):'\u2014',null,null,'E-Banking + POS / (+ ATM)');

// Individual payment KPIs with avg EUR
var payKPIs=['E-Banking','ATM Domestic','POS Domestic','Interbank'];
payKPIs.forEach(function(ind){
  var d=pyDelta(PY,ind,'amount');
  var avgStr='';
  if(d.raw&&d.raw.count>0&&d.raw.amount!=null){avgStr=' | Avg '+fmtAvgEur(d.raw.amount,d.raw.count)}
  addK('py-k',ind,d.v!=null?fmtMoney(d.v):'\u2014',d.yoy,'%',d.p?fmtP(d.p)+avgStr:'');
});

// POS/ATM ratio
var lATMd=latest(PY,function(r){return r.indicator==='ATM Domestic'});
var lPOSd=latest(PY,function(r){return r.indicator==='POS Domestic'});
if(lATMd&&lPOSd&&lATMd.count>0){
  var posAtmRatio=(lPOSd.count/lATMd.count).toFixed(1);
  addK('py-k','POS/ATM Ratio',posAtmRatio+'\u00d7',null,null,'Card payments per cash withdrawal');
}

var pyh=document.getElementById('py-h'),pyp=document.getElementById('py-p');
if(tpLatVal!=null){
  pyh.textContent='Total: '+fmtMoney(tpLatVal)+' across 7 channels';
  pyp.textContent='Payment system data covers 11 channels. Totals use 7 non-overlapping indicators (parent totals for ATM/POS Abroad). Digital share excludes Interbank and ATM Deposits.';
} else {pyh.textContent='No payment data';pyp.textContent=''}

// Payment value chart (7 indicators)
var mainPay=['E-Banking','Interbank','ATM Domestic','POS Domestic','ATM Abroad Total','POS Abroad Total','ATM Deposits'];
var pyF=sp(pyFiltered);
var pyP=[...new Set(pyF.filter(function(r){return r.indicator==='E-Banking'&&r.amount!=null}).map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
if(pyP.length){
  showCanvas('ch-py-val');lc('ch-py-val',pyP,mainPay.map(function(ind,i){
    var pm={};pyF.filter(function(r){return r.indicator===ind}).forEach(function(r){if(r.amount!=null)pm[r.period]=r.amount});
    return{label:ind,data:pyP.map(function(p){return pm[p]||null}),borderColor:PAL[i],tension:.3,spanGaps:true};
  }));
} else noData('ch-py-val','No payment data');

// Digital vs traditional trend
if(pyP.length){
  var digMap=cardAgg(pyF,RETAIL_DIG,'amount');var cashMap=cardAgg(pyF,RETAIL_CASH,'amount');
  showCanvas('ch-py-mix');lc('ch-py-mix',pyP,[
    {label:'Digital (E-Bank+POS)',data:pyP.map(function(p){return digMap[p]||null}),borderColor:C1,backgroundColor:C1+'10',fill:true,tension:.3},
    {label:'Cash (ATM)',data:pyP.map(function(p){return cashMap[p]||null}),borderColor:C3,backgroundColor:C3+'10',fill:true,tension:.3}
  ]);
} else noData('ch-py-mix','No data');

// Domestic vs international
if(pyP.length){
  var domInds=['ATM Domestic','POS Domestic','ATM Deposits','E-Banking','Interbank'];
  var intInds=['ATM Abroad Total','POS Abroad Total'];
  var domA=cardAgg(pyF,domInds,'amount');var intA=cardAgg(pyF,intInds,'amount');
  showCanvas('ch-py-vol');lc('ch-py-vol',pyP,[
    {label:'Domestic',data:pyP.map(function(p){return domA[p]||null}),borderColor:C1,tension:.3},
    {label:'International',data:pyP.map(function(p){return intA[p]||null}),borderColor:GOLD,borderDash:[4,2],tension:.3}
  ]);
} else noData('ch-py-vol','No data');

// ===================== ATMs =====================
var atInds=['ATM Domestic','ATM Deposits','ATM Foreign Cards in Kosovo','ATM Resident Cards Abroad'];
var atLabels=['Domestic Withdrawals','ATM Deposits','Foreign Cards (Kosovo)','Kosovo Cards (Abroad)'];
atInds.forEach(function(ind,i){
  var d=pyDelta(PY,ind,'amount');
  var avgStr='';if(d.raw&&d.raw.count>0&&d.raw.amount!=null){avgStr=' | Avg '+fmtAvgEur(d.raw.amount,d.raw.count)}
  addK('at-k',atLabels[i],d.v!=null?fmtMoney(d.v):'\u2014',d.yoy,'%',d.p?fmtP(d.p)+' | '+fmtCount(d.raw?d.raw.count:0)+' txns'+avgStr:'');
});

var ath=document.getElementById('at-h'),atp=document.getElementById('at-p');
var aDom=latest(PY,function(r){return r.indicator==='ATM Domestic'});
if(aDom){ath.textContent='Domestic: '+fmtMoney(aDom.amount)+', '+fmtCount(aDom.count)+' txns, avg '+fmtAvgEur(aDom.amount,aDom.count);atp.textContent='ATM operations: withdrawals, deposits, cross-border card usage. ATM machine counts not available.'}
else{ath.textContent='No ATM data';atp.textContent=''}

var atmCharts=[['ATM Domestic','ch-at-dom'],['ATM Deposits','ch-at-dep'],['ATM Foreign Cards in Kosovo','ch-at-fk'],['ATM Resident Cards Abroad','ch-at-ka']];
atmCharts.forEach(function(pair){
  var f=sp(flt(PY.filter(function(r){return r.indicator===pair[0]})));
  if(f.length){showCanvas(pair[1]);dualAxis(pair[1],f.map(function(r){return r.period}),f.map(function(r){return r.amount}),f.map(function(r){return r.count}),'Amount (EUR)','Count (K)')}
  else noData(pair[1],'No '+pair[0]+' data');
});

// ===================== POS =====================
var poInds=['POS Domestic','POS Abroad Total','POS Foreign Cards in Kosovo','POS Resident Cards Abroad'];
var poLabels=['Domestic POS','Cross-Border POS','Foreign Cards (Kosovo)','Kosovo Cards (Abroad)'];
poInds.forEach(function(ind,i){
  var d=pyDelta(PY,ind,'amount');
  var avgStr='';if(d.raw&&d.raw.count>0&&d.raw.amount!=null){avgStr=' | Avg '+fmtAvgEur(d.raw.amount,d.raw.count)}
  addK('po-k',poLabels[i],d.v!=null?fmtMoney(d.v):'\u2014',d.yoy,'%',d.p?fmtP(d.p)+' | '+fmtCount(d.raw?d.raw.count:0)+' txns'+avgStr:'');
});

var poh=document.getElementById('po-h'),pop=document.getElementById('po-p');
var pDomV=latest(PY,function(r){return r.indicator==='POS Domestic'});
if(pDomV){poh.textContent='Domestic: '+fmtMoney(pDomV.amount)+', '+fmtCount(pDomV.count)+' txns, avg '+fmtAvgEur(pDomV.amount,pDomV.count);pop.textContent='POS transaction data. Terminal counts and merchant categories not available.'}
else{poh.textContent='No POS data';pop.textContent=''}

var posCharts=[['POS Domestic','ch-po-dom'],['POS Abroad Total','ch-po-abr'],['POS Foreign Cards in Kosovo','ch-po-fk'],['POS Resident Cards Abroad','ch-po-ka']];
posCharts.forEach(function(pair){
  var f=sp(flt(PY.filter(function(r){return r.indicator===pair[0]})));
  if(f.length){showCanvas(pair[1]);dualAxis(pair[1],f.map(function(r){return r.period}),f.map(function(r){return r.amount}),f.map(function(r){return r.count}),'Amount (EUR)','Count (K)')}
  else noData(pair[1],'No '+pair[0]+' data');
});

// ===================== CARDS =====================
var domCardMap=cardAgg(flt(PY),['ATM Domestic','POS Domestic'],'amount');
var abrCardMap=cardAgg(flt(PY),['ATM Abroad Total','POS Abroad Total'],'amount');
var fkCardMap=cardAgg(flt(PY),['ATM Foreign Cards in Kosovo','POS Foreign Cards in Kosovo'],'amount');
var kaCardMap=cardAgg(flt(PY),['ATM Resident Cards Abroad','POS Resident Cards Abroad'],'amount');
var allCardPeriods=Object.keys(domCardMap).sort();
var cardLatP=allCardPeriods[allCardPeriods.length-1];
var cardPriorP=allCardPeriods.length>12?allCardPeriods[allCardPeriods.length-13]:null;

function cardKPI(label,map,cid){
  var lv=cardLatP?map[cardLatP]:null;
  var pv=cardPriorP?map[cardPriorP]:null;
  addK(cid,label,lv!=null?fmtMoney(lv):'\u2014',lv&&pv?pctChange(lv,pv):null,'%',cardLatP?fmtP(cardLatP):'');
}
cardKPI('Domestic Card Spend',domCardMap,'cd-k');
cardKPI('Cross-Border Card Spend',abrCardMap,'cd-k');
cardKPI('Foreign Cards in Kosovo',fkCardMap,'cd-k');
cardKPI('Kosovo Cards Abroad',kaCardMap,'cd-k');

var cdh=document.getElementById('cd-h'),cdp=document.getElementById('cd-p');
if(cardLatP){
  cdh.textContent='Domestic: '+fmtMoney(domCardMap[cardLatP]||0)+' | Cross-border: '+fmtMoney(abrCardMap[cardLatP]||0);
  cdp.textContent='Card activity aggregated from ATM + POS channels. No debit/credit type split available.';
}

var cardTrendP=Object.keys(domCardMap).filter(function(k){return abrCardMap[k]!=null}).sort();
var cardTrendLabels=cardTrendP.map(function(k){var rec=flt(PY).find(function(r){return pk(r.period)===k});return rec?rec.period:k});
if(cardTrendP.length){
  showCanvas('ch-cd-geo');lc('ch-cd-geo',cardTrendLabels,[
    {label:'Domestic (ATM+POS)',data:cardTrendP.map(function(k){return domCardMap[k]||0}),borderColor:C1,tension:.3},
    {label:'Cross-border',data:cardTrendP.map(function(k){return abrCardMap[k]||0}),borderColor:GOLD,tension:.3}
  ]);
} else noData('ch-cd-geo','No card data');

if(cardTrendP.length){
  showCanvas('ch-cd-flow');lc('ch-cd-flow',cardTrendLabels,[
    {label:'Foreign cards in Kosovo',data:cardTrendP.map(function(k){return fkCardMap[k]||0}),borderColor:C1,tension:.3},
    {label:'Kosovo cards abroad',data:cardTrendP.map(function(k){return kaCardMap[k]||0}),borderColor:C3,borderDash:[4,2],tension:.3}
  ]);
} else noData('ch-cd-flow','No card flow data');

// ===================== REMITTANCES =====================
addK('rm-k','Total',lRm?fmtMoney(lRm.value):'\u2014',lRm&&pRm?pctChange(lRm.value,pRm.value):null,'%',lRm?fmtP(lRm.period):'');
['Banks','MTOs','Other'].forEach(function(ch){
  var v=latest(RC,function(r){return r.channel===ch});
  var p12=v?prior12(RC,v.period,function(r){return r.channel===ch}):null;
  addK('rm-k',ch,v?fmtMoney(v.value):'\u2014',v&&p12?pctChange(v.value,p12.value):null,'%',v?fmtP(v.period):'');
});

var rmh=document.getElementById('rm-h'),rmp=document.getElementById('rm-p');
if(lRm){
  rmh.textContent='Remittances: '+fmtMoney(lRm.value)+' ('+fmtP(lRm.period)+')';
  var rcoFiltered=flt(RCO);
  var rcoAllP=[...new Set(rcoFiltered.map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
  var rcoLatP=rcoAllP[rcoAllP.length-1];
  var topCountries=rcoFiltered.filter(function(r){return r.period===rcoLatP&&r.country!=='Total'&&r.country!=='Other'&&r.value>0}).sort(function(a,b){return b.value-a.value}).slice(0,2);
  rmp.textContent='Three channels: Banks, MTOs, Other.'+(topCountries.length?' Top corridors: '+topCountries.map(function(r){return r.country}).join(', ')+'.':'')+' Country data shows percentage shares.';
} else {rmh.textContent='No remittance data';rmp.textContent=''}

if(rmF.length){showCanvas('ch-rm-tr');lc('ch-rm-tr',rmF.map(function(r){return r.period}),[{label:'Total',data:rmF.map(function(r){return r.value}),borderColor:C1,backgroundColor:C1+'10',fill:true,tension:.3}],{plugins:{legend:{display:false},tooltip:ttMoney}})}
else noData('ch-rm-tr','No data');

var rcoFilt=flt(RCO);
var rcoPF=[...new Set(rcoFilt.map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
var rcoLP=rcoPF[rcoPF.length-1];
var rcoB=rcoFilt.filter(function(r){return r.period===rcoLP&&r.country!=='Total'&&r.country!=='Other'&&r.value>0}).sort(function(a,b){return b.value-a.value}).slice(0,10);
if(rcoB.length){showCanvas('ch-rm-co');bc('ch-rm-co',rcoB.map(function(r){return r.country}),rcoB.map(function(r){return r.value}),PAL_BAR,{plugins:{tooltip:ttPct},scales:{x:{title:{display:true,text:'% share'},ticks:{callback:function(v){return v.toFixed(1)+'%'}}}}})}
else noData('ch-rm-co','No country data');

var rmChF=sp(flt(RC.filter(function(r){return r.channel!=='Total'})));
var rmChP=[...new Set(rmChF.map(function(r){return r.period}))].sort(function(a,b){return pk(a).localeCompare(pk(b))});
if(rmChP.length){
  showCanvas('ch-rm-ch');lc('ch-rm-ch',rmChP,['Banks','MTOs','Other'].map(function(ch,i){
    var pm={};rmChF.filter(function(r){return r.channel===ch}).forEach(function(r){pm[r.period]=r.value});
    return{label:ch,data:rmChP.map(function(p){return pm[p]||null}),borderColor:PAL[i],backgroundColor:PAL[i]+'15',fill:true,tension:.3,spanGaps:true};
  }));
} else noData('ch-rm-ch','No channel data');

// ===================== METHODOLOGY TABLE =====================
function yr(arr){
  if(!arr||!arr.length)return['--','--'];
  var sorted=arr.map(function(r){return pk(r.period)}).filter(function(x){return x&&x!=='0000-00'}).sort();
  if(!sorted.length)return['--','--'];
  return[sorted[0],sorted[sorted.length-1]];
}
var tb=document.getElementById('ex-b');if(tb){tb.innerHTML='';
var datasets=[
  {n:'Loans (Customer)',d:LC},{n:'Loans (Maturity)',d:LM},{n:'Loans (Sector)',d:LS},
  {n:'New Loans',d:NL},{n:'Deposits (Segments)',d:DS},{n:'New Deposits',d:ND},
  {n:'Payments',d:PY},{n:'FX Rates',d:FX},{n:'NEER/REER',d:NR},
  {n:'Remittances (Channel)',d:RC},{n:'Remittances (Country)',d:RCO},
  {n:'Interest Rates (Loans)',d:IRL},{n:'Interest Rates (Deposits)',d:IRD}
];
datasets.forEach(function(ds){
  var r=yr(ds.d);var freq='Monthly';
  if(ds.n.indexOf('Remittance')>=0)freq='Mixed (Q/M)';
  if(ds.n==='FX Rates')freq='Monthly';
  var tr=document.createElement('tr');
  tr.innerHTML='<td>'+ds.n+'</td><td class="num">'+ds.d.length.toLocaleString()+'</td><td>'+fmtP(r[0])+'</td><td>'+fmtP(r[1])+'</td><td>'+freq+'</td>';
  tb.appendChild(tr);
});}

} // end buildAll

initFilters();
buildAll();
"""

# ============ ASSEMBLE HTML ============

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Kosovo Banking Intelligence</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<noscript><div style="padding:40px;font-family:sans-serif">This dashboard requires JavaScript.</div></noscript>
<style>{CSS}</style>
</head>
<body>

<div class="hdr">
<a href="https://fintechhumans.com" target="_blank" rel="noopener" class="hdr-brand">
<img class="logo-mark" src="data:image/png;base64,{LOGO_B64}" alt="Fintech Humans">
<div class="logo-text">Kosovo Banking Intelligence</div>
</a>
<div class="hdr-meta"><span>Source: Central Bank of Kosovo</span><span>Analytically corrected</span></div>
</div>
{nav_html()}
<div class="main">
{filters_html()}
{mod_overview()}
{mod_loans()}
{mod_deposits()}
{mod_rates()}
{mod_payments()}
{mod_atm()}
{mod_pos()}
{mod_cards()}
{mod_remittances()}
{mod_methodology()}
</div>
<div class="footer"><div class="footer-inner">
<span>Curated by Orik Drancolli</span>
</div>
</div>

<script>
const D={data_js};
{JS_CODE}
</script>
</body>
</html>"""

out_path = os.path.join(BASE, 'Kosovo_Banking_Intelligence_v4_1.html')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"v4 written to: {out_path}")
print(f"File size: {os.path.getsize(out_path)/1024:.0f} KB")
