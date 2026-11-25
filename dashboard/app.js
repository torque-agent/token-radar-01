(() => {
  'use strict';

  const data = window.RADAR;
  const app = document.querySelector('#app');
  if (!data) {
    app.textContent = 'Run main.ts to generate the offline dataset.';
    return;
  }

  const state = {
    query: '',
    filter: 'all',
    selected: null,
    sort: 'rank',
  };

  const escapeHtml = value => String(value ?? '').replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character],
  );

  function money(value) {
    if (value == null) return '—';
    if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
    return '$' + Math.round(value / 1000) + 'K';
  }

  function percent(value) {
    if (value == null) return '—';
    return (value > 0 ? '+' : '') + value.toFixed(1) + '%';
  }

  function risk(row) {
    if (row.change_7d == null) return 'DATA GAP';
    if (row.change_7d < -10) return 'TVL DECLINE';
    if (row.age_days == null) return 'AGE UNKNOWN';
    return 'MONITOR';
  }

  function visibleRows() {
    const query = state.query.trim().toLowerCase();
    let rows = data.rows.filter(row => {
      const searchable = [row.name, row.slug, ...row.chains, row.category]
        .join(' ').toLowerCase();
      return searchable.includes(query);
    });
    if (state.filter === 'solana') {
      rows = rows.filter(row => row.chains.includes('Solana'));
    } else if (state.filter === 'early') {
      rows = rows.filter(row => row.tvl_usd < data.floor_usd);
    } else if (state.filter === 'risk') {
      rows = rows.filter(row => risk(row) !== 'MONITOR');
    }
    if (state.sort === 'tvl') {
      rows.sort((a, b) => b.tvl_usd - a.tvl_usd);
    } else if (state.sort === 'growth') {
      rows.sort((a, b) => (b.change_7d ?? -Infinity) - (a.change_7d ?? -Infinity));
    }
    return rows;
  }

  function header() {
    return `
      <header>
        <div class="brand">
          <span class="mark">✳</span>
          <div><b>SIGNAL<span> / </span>DESK</b><small>PROTOCOL INTELLIGENCE</small></div>
        </div>
        <nav aria-label="Main navigation">
          <a href="#ranking">RANKINGS</a>
          <a href="#method">METHODOLOGY</a>
          <a href="#sources">SOURCES</a>
        </nav>
        <div class="status"><i></i> SEALED SNAPSHOT <strong>${escapeHtml(data.as_of)}</strong></div>
      </header>`;
  }

  function introduction() {
    const top = data.rows[0];
    return `
      <section class="intro">
        <div>
          <div class="eyebrow"><span>01 / MARKET INTELLIGENCE</span><span>RESEARCH NOTE • ${escapeHtml(data.as_of)}</span></div>
          <h1>Find the signal<br><em>before the token.</em></h1>
          <p>A research terminal for protocols with no token recorded in the snapshot. A modelled value, not a launch prediction.</p>
          <div class="intro-foot">
            <span><b>${data.board_size}</b> protocols ranked</span>
            <span><b>${data.watchlist_size}/${data.watchlist_size}</b> watchlist covered</span>
            <span><b>${data.early_size}</b> below the floor</span>
          </div>
        </div>
        <aside class="lead">
          <div class="lead-top">HIGHEST IMPLIED VALUE <span>↗ 01</span></div>
          <h2>${escapeHtml(top.name)}</h2>
          <div class="lead-value">${money(top.implied_value_usd)}</div>
          <div class="lead-meta">
            <span>TVL <b>${money(top.tvl_usd)}</b></span>
            <span>7D CHANGE <b>${percent(top.change_7d)}</b></span>
          </div>
          <div class="lead-bottom">MODEL ESTIMATE <span>NOT A MARKET PRICE</span></div>
        </aside>
      </section>
      <section class="strip" aria-label="Snapshot overview">
        <div><span>THE UNIVERSE</span><b>${data.board_size} <small>ranked protocols</small></b></div>
        <div><span>SCREEN</span><b>${money(data.floor_usd)} <small>watchlist TVL floor</small></b></div>
        <div><span>MODEL</span><b>0.30× <small>TVL starting multiple</small></b></div>
        <div><span>IMPORTANT</span><b>No token recorded <small>≠ no token exists</small></b></div>
      </section>`;
  }

  function rowMarkup(row) {
    const signal = risk(row);
    return `
      <tr data-slug="${escapeHtml(row.slug)}" tabindex="0" aria-label="Open ${escapeHtml(row.name)} detail">
        <td class="rank">${String(row.rank).padStart(2, '0')}</td>
        <td><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.category || 'Unclassified')}</small></td>
        <td>${escapeHtml(row.chains.slice(0, 2).join(' / ') || '—')}</td>
        <td>${money(row.tvl_usd)}</td>
        <td class="${row.change_7d < 0 ? 'negative' : 'positive'}">${percent(row.change_7d)}</td>
        <td class="value">${money(row.implied_value_usd)}</td>
        <td><span class="pill ${signal === 'MONITOR' ? '' : 'warn'}">${signal}</span></td>
        <td class="row-arrow">↗</td>
      </tr>`;
  }

  function board(rows) {
    const filters = [
      ['all', 'All protocols'],
      ['solana', 'Solana'],
      ['early', 'Below floor'],
      ['risk', 'Risk signals'],
    ];
    return `
      <section id="ranking" class="workspace">
        <div class="section-head">
          <div>
            <div class="eyebrow">02 / THE RADAR</div>
            <h2>Opportunity board<span>.</span></h2>
            <p>Ranked by modelled implied value. Select a protocol to inspect the assumptions and farm plan.</p>
          </div>
          <div class="count">${rows.length} <small>RESULTS</small></div>
        </div>
        <div class="board-caption"><span class="token-badge">NO TOKEN RECORDED</span><span>Snapshot status · independently verify before acting</span></div>
        <div class="controls">
          <div class="tabs">
            ${filters.map(([value, label]) => `<button data-filter="${value}" class="${state.filter === value ? 'active' : ''}" aria-pressed="${state.filter === value}">${label}</button>`).join('')}
          </div>
          <div class="inputs">
            <input id="search" aria-label="Search protocols" placeholder="Search name, chain..." value="${escapeHtml(state.query)}">
            <select id="sort" aria-label="Sort">
              <option value="rank">Sort: implied value</option>
              <option value="tvl" ${state.sort === 'tvl' ? 'selected' : ''}>Sort: TVL</option>
              <option value="growth" ${state.sort === 'growth' ? 'selected' : ''}>Sort: 7d change</option>
            </select>
          </div>
        </div>
        <div class="tablewrap">
          <table>
            <thead><tr><th>RANK</th><th>PROTOCOL / CATEGORY</th><th>NETWORK</th><th>TVL</th><th>7D CHANGE</th><th>IMPLIED VALUE</th><th>SIGNAL</th><th></th></tr></thead>
            <tbody>${rows.map(rowMarkup).join('')}</tbody>
          </table>
          ${rows.length ? '' : '<p class="empty">No matching protocols. Try a different search.</p>'}
        </div>
      </section>`;
  }

  function notes() {
    return `
      <section id="method" class="notes">
        <div>
          <div class="eyebrow">03 / HOW TO READ THIS</div>
          <h2>Model, not<br><em>market price.</em></h2>
          <p>One consistent framework applied to the sealed data. The number is a relative research signal, not a forecast or valuation of a tradable asset.</p>
        </div>
        <div class="method-card">
          <span>THE FORMULA</span>
          <h3>TVL × 0.30 × growth × maturity</h3>
          <p>Growth = 1 + 0.35 × seven-day change, clamped to −60% / +120%. Maturity rises from 0.6 to 1 over three years of tracking. Unknown age uses 365 days; missing growth uses zero.</p>
          <div class="rule"></div>
          <p>Tracking age is not proof of time without a token. TVL may include deposits that are not revenue. A token, airdrop, eligibility or return is never guaranteed.</p>
        </div>
        <div id="sources" class="method-card">
          <span>PROVENANCE / LIMITATIONS</span>
          <h3>One fixed view.</h3>
          <p>${escapeHtml(data.source)}</p>
          <p>Watchlist: all ${data.watchlist_size} snapshot entries; ${data.early_size} additional candidates below the floor. Existing-token records appear separately in the live-token view below.</p>
          <p>Verify contract addresses, current terms, liquidity and eligibility independently before acting. Gas and capital estimates are illustrative.</p>
        </div>
      </section>
      <section class="live">
        <div class="eyebrow">04 / SEPARATE UNIVERSE</div>
        <h2>Recorded live tokens <span>${data.live_size} TRACKED</span></h2>
        <p>Market caps from the snapshot; excluded from the implied-value ranking.</p>
        <div>${data.live.slice(0, 8).map(row => `<span>${escapeHtml(row.name)} <b>${money(row.mcap_usd)}</b></span>`).join('')}</div>
      </section>
      <footer>SIGNAL / DESK <span>OFFLINE RESEARCH • ${escapeHtml(data.as_of)} • NOT INVESTMENT ADVICE</span></footer>`;
  }

  function detail(row) {
    return `
      <div class="overlay">
        <aside class="drawer" role="dialog" aria-modal="true" aria-label="${escapeHtml(row.name)} protocol brief">
          <button id="close" aria-label="Close detail">×</button>
          <div class="eyebrow">PROTOCOL BRIEF / ${String(row.rank).padStart(2, '0')}</div>
          <h2>${escapeHtml(row.name)}<span>.</span></h2>
          <p>${escapeHtml(row.category || 'Unclassified')} · ${escapeHtml(row.chains.join(' / ') || 'Chain unspecified')}</p>
          <div class="detail-badges"><span class="token-badge">NO TOKEN RECORDED</span><span class="pill ${risk(row) === 'MONITOR' ? '' : 'warn'}">${risk(row)}</span></div>
          <div class="detail-value"><small>MODELLED IMPLIED VALUE</small><b>${money(row.implied_value_usd)}</b><span>NOT A TRADING PRICE</span></div>
          <div class="detail-grid">
            <div>TVL <b>${money(row.tvl_usd)}</b></div>
            <div>7D CHANGE <b>${percent(row.change_7d)}</b></div>
            <div>TRACKED <b>${row.age_days == null ? 'Unknown' : row.age_days + ' days'}</b></div>
            <div>RISK SIGNAL <b>${risk(row)}</b></div>
          </div>
          <h3>Value bridge <span>01</span></h3>
          <p>${money(row.tvl_usd)} TVL × 0.30 × ${row.growth_multiplier.toFixed(2)} growth × ${row.maturity_multiplier.toFixed(2)} maturity. Rounded to the nearest dollar in the board.</p>
          <h3>Farm plan <span>02</span></h3>
          <p>Illustrative actions, not verified eligibility. Confirm the app and asset before committing capital.</p>
          <ol>${row.farm_steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
          <div class="warning">⚑ Contract, liquidity and capital loss risks apply. No airdrop is promised.</div>
        </aside>
      </div>`;
  }

  function render() {
    const rows = visibleRows();
    const selected = data.rows.find(row => row.slug === state.selected);
    app.innerHTML = header() + '<main>' + introduction() + board(rows) + notes() + '</main>' + (selected ? detail(selected) : '');
    bindEvents(selected);
  }

  function bindEvents(selected) {
    const closeDetail = () => {
      state.selected = null;
      render();
    };
    document.querySelectorAll('[data-filter]').forEach(button => {
      button.onclick = () => {
        state.filter = button.dataset.filter;
        render();
      };
    });
    document.querySelectorAll('[data-slug]').forEach(row => {
      row.onclick = () => {
        state.selected = row.dataset.slug;
        render();
      };
      row.onkeydown = event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          row.click();
        }
      };
    });
    document.querySelector('#search').oninput = event => {
      const position = event.target.selectionStart;
      state.query = event.target.value;
      render();
      const search = document.querySelector('#search');
      search.focus();
      search.setSelectionRange(position, position);
    };
    document.querySelector('#sort').onchange = event => {
      state.sort = event.target.value;
      render();
    };
    if (selected) {
      document.querySelector('#close').onclick = closeDetail;
      document.querySelector('.overlay').onclick = event => {
        if (event.target.classList.contains('overlay')) closeDetail();
      };
    }
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.selected) {
      state.selected = null;
      render();
    }
  });

  render();
})();
