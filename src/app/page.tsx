const loop = [
  ["01", "房主开局", "选择真实门店，设好预算和倒计时。"],
  ["02", "朋友接管", "每人两次加购，再抽一张特殊卡。"],
  ["03", "规则守门", "ADD / SWAP 实时校验预算，LOCK 说了算。"],
  ["04", "查看战报", "留下每一次加、删、换、锁的“作案记录”。"],
];

const cards = [
  ["DELETE", "一票否决", "删掉一件未锁定餐品，预算立即返还。"],
  ["SWAP", "偷梁换柱", "在不超预算的前提下，把餐品换成另一件。"],
  ["LOCK", "钉死", "锁住一件餐品，直到本局结束都不能删换。"],
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="主导航">
        <a className="brand" href="#top" aria-label="McRemote 首页">
          <span className="brand-mark">M</span>
          <span>McRemote</span>
        </a>
        <a className="nav-link" href="https://github.com/lllllbbbbbxxx/mcremote">
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </nav>

      <section className="hero shell" id="top">
        <div className="eyebrow">麦麦遥控器 · MCP MULTIPLAYER GAME</div>
        <h1>
          HOW MUCH DO YOU
          <br />
          <span>TRUST YOUR FRIENDS?</span>
        </h1>
        <p className="hero-copy">
          给朋友一笔预算，把这一顿的购物车遥控器交出去。
          <br />
          菜单来自真实门店，混乱来自你最信任的人。
        </p>
        <div className="hero-actions">
          <a className="button primary" href="#how-it-works">
            看看怎么玩
          </a>
          <span className="status">
            <i /> INITIAL BUILD · 0.1.0
          </span>
        </div>
        <div className="ticker">
          <span>REAL STORE MENU</span>
          <b>✦</b>
          <span>NEVER OVER BUDGET</span>
          <b>✦</b>
          <span>HOST CONFIRMS ORDER</span>
          <b>✦</b>
          <span>REAL STORE MENU</span>
        </div>
      </section>

      <section className="rules" id="how-it-works">
        <div className="shell">
          <div className="section-heading">
            <p>THE GAME LOOP</p>
            <h2>
              朋友制造混乱，
              <br />
              规则守住预算。
            </h2>
          </div>
          <div className="loop-grid">
            {loop.map(([number, title, body]) => (
              <article className="loop-card" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cards shell">
        <div className="section-heading compact">
          <p>ONE SHOT. USE IT WISELY.</p>
          <h2>每位朋友，一张特殊卡。</h2>
        </div>
        <div className="card-grid">
          {cards.map(([name, title, body], index) => (
            <article className={`power-card power-${index + 1}`} key={name}>
              <div className="card-top">
                <span>POWER CARD</span>
                <b>0{index + 1}</b>
              </div>
              <strong>{name}</strong>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="promise">
        <div className="shell promise-grid">
          <div>
            <p className="mini-label">THE REAL-WORLD GUARDRAIL</p>
            <h2>好玩，但不乱来。</h2>
          </div>
          <ul>
            <li>
              <b>01</b>
              <span>候选餐品来自目标门店当前可售菜单</span>
            </li>
            <li>
              <b>02</b>
              <span>任何时刻，购物车都不能超过预算</span>
            </li>
            <li>
              <b>03</b>
              <span>下单前重新核价，最终只能由房主确认</span>
            </li>
          </ul>
        </div>
      </section>

      <footer className="shell">
        <div className="brand">
          <span className="brand-mark">M</span>
          <span>McRemote</span>
        </div>
        <p className="footer-tagline">Give your friends a budget. Lose control of your lunch.</p>
        <p className="legal">
          参赛者独立开发，非麦当劳官方产品。餐品、价格与供应状态以官方实时结果为准。
        </p>
      </footer>
    </main>
  );
}
