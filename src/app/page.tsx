import { CreateRoom } from "@/components/create-room";

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

      <section className="create-hero shell" id="top">
        <div className="create-copy">
          <div className="eyebrow">麦麦遥控器 · PLAYABLE MVP 0.2</div>
          <h1>
            把午餐的
            <br />
            <span>遥控器交出去。</span>
          </h1>
          <p className="hero-copy">选一家门店，定一个预算，邀请朋友在 60 秒里决定你吃什么。</p>
          <div className="rule-chips">
            <span>每人 ADD ×2</span>
            <span>随机特殊卡 ×1</span>
            <span>永不超预算</span>
          </div>
        </div>
        <CreateRoom />
      </section>

      <section className="quick-rules">
        <div className="shell quick-grid">
          <article>
            <b>01</b>
            <h2>真实菜单</h2>
            <p>配置 MCP Token 后，门店、菜单和核价都来自麦当劳 MCP。</p>
          </article>
          <article>
            <b>02</b>
            <h2>朋友出手</h2>
            <p>ADD、DELETE、SWAP、LOCK，每一次操作都会留下记录。</p>
          </article>
          <article>
            <b>03</b>
            <h2>房主决定</h2>
            <p>游戏结束后再次核价，最终订单仍然只能由房主确认。</p>
          </article>
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
