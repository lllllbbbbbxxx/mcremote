"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MenuProduct } from "@/domain/game";
import type { RoomSnapshot } from "@/types/mvp";

interface ApiError {
  error?: string;
}

const cardLabels = { delete: "DELETE / 一票否决", swap: "SWAP / 偷梁换柱", lock: "LOCK / 钉死" };

function money(cents: number) {
  return `¥${(cents / 100).toFixed(cents % 100 ? 1 : 0)}`;
}

function actionText(action: string) {
  return { add: "添加了", delete: "删除了", swap: "替换成", lock: "锁定了" }[action] ?? action;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & ApiError;
  if (!response.ok) throw new Error(body.error || "请求失败");
  return body;
}

export function RoomGame({ roomId }: { roomId: string }) {
  const [token, setToken] = useState("");
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState("全部");
  const [menuSearch, setMenuSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const loadRoom = useCallback(
    async (activeToken: string) => {
      const response = await fetch(`/api/rooms/${roomId}`, {
        headers: activeToken ? { "x-player-token": activeToken } : {},
        cache: "no-store",
      });
      setSnapshot(await readJson<RoomSnapshot>(response));
    },
    [roomId],
  );

  useEffect(() => {
    const queryToken = new URLSearchParams(window.location.search).get("token") || "";
    const saved = localStorage.getItem(`mcremote:${roomId}`) || "";
    const activeToken = queryToken || saved;
    if (activeToken) localStorage.setItem(`mcremote:${roomId}`, activeToken);
    setToken(activeToken);
    loadRoom(activeToken)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "加载失败"),
      )
      .finally(() => setLoading(false));
  }, [loadRoom, roomId]);

  const roomStatus = snapshot?.status;

  useEffect(() => {
    if (roomStatus !== "waiting" && roomStatus !== "playing") return;
    const interval = window.setInterval(
      () => {
        setNow(Date.now());
        loadRoom(token).catch(() => undefined);
      },
      roomStatus === "playing" ? 1000 : 2000,
    );
    return () => window.clearInterval(interval);
  }, [loadRoom, roomStatus, token]);

  const secondsLeft = snapshot
    ? Math.max(0, Math.ceil((new Date(snapshot.expiresAt).getTime() - now) / 1000))
    : 0;

  const playerNames = useMemo(
    () => new Map(snapshot?.players.map((player) => [player.id, player.nickname]) ?? []),
    [snapshot?.players],
  );
  const productNames = useMemo(
    () => new Map(snapshot?.menu.map((product) => [product.productId, product.name]) ?? []),
    [snapshot?.menu],
  );
  const categories = useMemo(
    () => ["全部", ...new Set((snapshot?.menu ?? []).map((product) => product.category || "其他"))],
    [snapshot?.menu],
  );
  const visibleMenu = useMemo(() => {
    const query = menuSearch.trim().toLowerCase();
    return (snapshot?.menu ?? []).filter((product) => {
      const categoryMatch = activeCategory === "全部" || product.category === activeCategory;
      const searchMatch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.tags?.some((tag) => tag.toLowerCase().includes(query));
      return categoryMatch && searchMatch;
    });
  }, [activeCategory, menuSearch, snapshot?.menu]);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const result = await readJson<{ token: string; snapshot: RoomSnapshot }>(response);
      setToken(result.token);
      setSnapshot(result.snapshot);
      localStorage.setItem(`mcremote:${roomId}`, result.token);
      window.history.replaceState(null, "", `/room/${roomId}?token=${result.token}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加入失败");
    } finally {
      setBusy(false);
    }
  }

  async function act(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-player-token": token },
        body: JSON.stringify(body),
      });
      setSnapshot(await readJson<RoomSnapshot>(response));
      setSwapTarget(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/checkout`, {
        method: "POST",
        headers: { "x-player-token": token },
      });
      setSnapshot(await readJson<RoomSnapshot>(response));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "核价失败");
    } finally {
      setBusy(false);
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  if (loading) return <main className="center-screen">正在打开房间…</main>;

  if (!snapshot) {
    return (
      <main className="center-screen">
        <div className="join-card">
          <h1>找不到房间</h1>
          <p>{error}</p>
          <a href="/">返回首页</a>
        </div>
      </main>
    );
  }

  if (!snapshot.viewer) {
    return (
      <main className="center-screen join-screen">
        <form className="join-card" onSubmit={join}>
          <div className="eyebrow">ROOM {roomId}</div>
          <h1>
            加入这场
            <br />
            <span>午餐混战</span>
          </h1>
          <p>
            {snapshot.store.storeName} · 预算 {money(snapshot.budgetInCents)}
          </p>
          <label>
            你的昵称
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={20}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? "加入中…" : "JOIN ROOM →"}
          </button>
        </form>
      </main>
    );
  }

  if (snapshot.status === "waiting") {
    return (
      <main className="room-page waiting-page">
        <RoomHeader roomId={roomId} snapshot={snapshot} secondsLeft={secondsLeft} />
        <section className="waiting-content app-shell">
          <div>
            <div className="eyebrow">WAITING ROOM</div>
            <h1>
              Your lunch is
              <br />
              <span>no longer yours.</span>
            </h1>
            <div className="invite-box">
              <code>
                {typeof window !== "undefined"
                  ? `${window.location.origin}/room/${roomId}`
                  : roomId}
              </code>
              <button type="button" onClick={copyInvite}>
                {copied ? "已复制" : "复制邀请链接"}
              </button>
            </div>
            {snapshot.viewer.isHost ? (
              <button
                className="button primary"
                type="button"
                disabled={busy || snapshot.players.length < 2}
                onClick={() => act({ type: "start" })}
              >
                {snapshot.players.length < 2 ? "等待至少 1 位朋友" : "START GAME →"}
              </button>
            ) : (
              <div className="my-card">
                <span>你的特殊卡</span>
                <strong>
                  {snapshot.viewer.specialCard ? cardLabels[snapshot.viewer.specialCard] : "—"}
                </strong>
                <p>游戏开始后只能使用一次。</p>
              </div>
            )}
          </div>
          <PlayerList snapshot={snapshot} />
        </section>
        {error && <Toast message={error} />}
      </main>
    );
  }

  if (snapshot.status === "finished" || snapshot.status === "checkout") {
    return (
      <DamageReport
        snapshot={snapshot}
        playerNames={playerNames}
        onCheckout={checkout}
        busy={busy}
        error={error}
      />
    );
  }

  return (
    <main className="room-page game-page">
      <RoomHeader roomId={roomId} snapshot={snapshot} secondsLeft={secondsLeft} />
      <section className="game-layout app-shell">
        <div className="menu-panel">
          <div className="panel-title">
            <div>
              <span>当前门店菜单</span>
              <h2>{snapshot.store.storeName}</h2>
            </div>
            <span className={`source-badge source-${snapshot.store.source}`}>
              {snapshot.store.source === "mcp" ? "MCP LIVE" : "DEMO"}
            </span>
          </div>
          {swapTarget && (
            <div className="swap-banner">
              已选择购物车餐品，现在选择一个新餐品完成 SWAP。
              <button type="button" onClick={() => setSwapTarget(null)}>
                取消
              </button>
            </div>
          )}
          <div className="menu-tools">
            <label className="menu-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={menuSearch}
                onChange={(event) => setMenuSearch(event.target.value)}
                placeholder={`搜索 ${snapshot.menu.length} 个真实餐品`}
                aria-label="搜索菜单"
              />
            </label>
            <fieldset className="category-strip">
              <legend className="sr-only">菜单分类</legend>
              {categories.map((category) => (
                <button
                  type="button"
                  className={activeCategory === category ? "category-chip active" : "category-chip"}
                  aria-pressed={activeCategory === category}
                  key={category}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </fieldset>
            <small>
              显示 {visibleMenu.length} / {snapshot.menu.length} 项
            </small>
          </div>
          <div className="menu-grid">
            {visibleMenu.map((product) => (
              <MenuCard
                key={product.productId}
                product={product}
                snapshot={snapshot}
                swapTarget={swapTarget}
                busy={busy}
                onAct={act}
              />
            ))}
            {!visibleMenu.length && (
              <div className="menu-empty">
                <b>没有匹配的餐品</b>
                <span>换个关键词或切换到其他分类。</span>
              </div>
            )}
          </div>
        </div>

        {cartOpen && (
          <button
            className="cart-backdrop"
            type="button"
            aria-label="关闭购物车"
            onClick={() => setCartOpen(false)}
          />
        )}
        <aside
          className={cartOpen ? "cart-panel mobile-open" : "cart-panel"}
          id="shared-cart"
          aria-label="共享购物车"
        >
          <button
            className="cart-close"
            type="button"
            aria-label="关闭购物车"
            onClick={() => setCartOpen(false)}
          >
            <span>共享购物车</span>
            <b>×</b>
          </button>
          <div className="budget-block">
            <span>剩余预算</span>
            <strong>{money(snapshot.remainingInCents)}</strong>
            <div>
              <i
                style={{
                  width: `${Math.min(100, (snapshot.totalInCents / snapshot.budgetInCents) * 100)}%`,
                }}
              />
            </div>
            <small>
              {money(snapshot.totalInCents)} / {money(snapshot.budgetInCents)}
            </small>
          </div>

          {!snapshot.viewer.isHost && (
            <div className="player-power">
              <span>你的特殊卡</span>
              <b>{snapshot.viewer.specialCard ? cardLabels[snapshot.viewer.specialCard] : "—"}</b>
              <small>
                {snapshot.viewer.specialCardUsed ? "已使用" : "可使用 1 次"} · ADD 剩余{" "}
                {snapshot.viewer.addTokensRemaining}
              </small>
            </div>
          )}

          <div className="cart-items">
            <h2>
              共享购物车 <span className="cart-count">{snapshot.cart.length}</span>
            </h2>
            {!snapshot.cart.length && <p className="empty-cart">还没有餐品，快让朋友开始加。</p>}
            {snapshot.cart.map((item) => (
              <article className={item.lockedBy ? "cart-item locked" : "cart-item"} key={item.id}>
                <div>
                  <b>{item.name}</b>
                  <span>
                    {money(item.priceInCents)} · {playerNames.get(item.addedBy)}
                  </span>
                </div>
                {item.lockedBy && <em>🔒 {playerNames.get(item.lockedBy)}</em>}
                {!snapshot.viewer?.isHost &&
                  !snapshot.viewer?.specialCardUsed &&
                  !item.lockedBy &&
                  snapshot.viewer?.specialCard === "delete" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act({ type: "delete", itemId: item.id })}
                    >
                      DELETE
                    </button>
                  )}
                {!snapshot.viewer?.isHost &&
                  !snapshot.viewer?.specialCardUsed &&
                  !item.lockedBy &&
                  snapshot.viewer?.specialCard === "lock" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act({ type: "lock", itemId: item.id })}
                    >
                      LOCK
                    </button>
                  )}
                {!snapshot.viewer?.isHost &&
                  !snapshot.viewer?.specialCardUsed &&
                  !item.lockedBy &&
                  snapshot.viewer?.specialCard === "swap" && (
                    <button type="button" disabled={busy} onClick={() => setSwapTarget(item.id)}>
                      SWAP
                    </button>
                  )}
              </article>
            ))}
          </div>

          <div className="event-log">
            <h3>实时记录</h3>
            {[...snapshot.events]
              .reverse()
              .slice(0, 12)
              .map((event) => (
                <p key={event.id}>
                  <b>{playerNames.get(event.playerId)}</b> {actionText(event.action)}{" "}
                  {productNames.get(event.productId) || "餐品"}
                </p>
              ))}
          </div>
        </aside>
      </section>
      <button className="mobile-cart-trigger" type="button" onClick={() => setCartOpen(true)}>
        <span>
          购物车 <b>{snapshot.cart.length}</b>
        </span>
        <strong>{money(snapshot.totalInCents)}</strong>
        <small>查看订单 ↑</small>
      </button>
      {error && <Toast message={error} />}
    </main>
  );
}

function RoomHeader({
  roomId,
  snapshot,
  secondsLeft,
}: {
  roomId: string;
  snapshot: RoomSnapshot;
  secondsLeft: number;
}) {
  return (
    <header className="room-header app-shell">
      <a className="brand" href="/">
        <span className="brand-mark">M</span>
        <span>McRemote</span>
      </a>
      <div className="room-meta">
        <span>ROOM</span>
        <b>{roomId}</b>
      </div>
      <div className="room-meta">
        <span>PLAYERS</span>
        <b>{snapshot.players.length}</b>
      </div>
      <div className="timer">
        <span>TIME LEFT</span>
        <b>
          {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
          {String(secondsLeft % 60).padStart(2, "0")}
        </b>
      </div>
    </header>
  );
}

function PlayerList({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <div className="player-list">
      <div className="panel-title">
        <div>
          <span>已加入</span>
          <h2>{snapshot.players.length} players</h2>
        </div>
      </div>
      {snapshot.players.map((player, index) => (
        <div className="player-row" key={player.id}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <b>{player.nickname}</b>
          <em>{player.isHost ? "HOST" : "READY"}</em>
        </div>
      ))}
    </div>
  );
}

function MenuCard({
  product,
  snapshot,
  swapTarget,
  busy,
  onAct,
}: {
  product: MenuProduct;
  snapshot: RoomSnapshot;
  swapTarget: string | null;
  busy: boolean;
  onAct: (body: Record<string, string>) => void;
}) {
  const viewer = snapshot.viewer;
  const affordable = product.priceInCents <= snapshot.remainingInCents;
  const canAdd = Boolean(viewer && !viewer.isHost && viewer.addTokensRemaining > 0 && affordable);
  const swapItem = swapTarget ? snapshot.cart.find((item) => item.id === swapTarget) : null;
  const canSwap = Boolean(
    swapItem &&
      snapshot.totalInCents - (swapItem?.priceInCents ?? 0) + product.priceInCents <=
        snapshot.budgetInCents,
  );
  return (
    <article className="menu-card">
      <div className="menu-card-image">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt=""
            width={320}
            height={320}
            unoptimized
            sizes="(max-width: 700px) 46vw, (max-width: 1100px) 28vw, 220px"
          />
        ) : (
          <span className="menu-image-fallback" aria-hidden="true">
            M
          </span>
        )}
        {product.tags?.[0] && <em>{product.tags[0]}</em>}
      </div>
      <div className="menu-card-content">
        <span>{product.category || "餐品"}</span>
        <h3>{product.name}</h3>
        <div>
          <b>{money(product.priceInCents)}</b>
          <button
            type="button"
            disabled={busy || (swapTarget ? !canSwap : !canAdd)}
            onClick={() =>
              swapTarget
                ? onAct({ type: "swap", itemId: swapTarget, productId: product.productId })
                : onAct({ type: "add", productId: product.productId })
            }
          >
            {swapTarget ? "换成它" : "ADD +"}
          </button>
        </div>
      </div>
    </article>
  );
}

function DamageReport({
  snapshot,
  playerNames,
  onCheckout,
  busy,
  error,
}: {
  snapshot: RoomSnapshot;
  playerNames: Map<string, string>;
  onCheckout: () => void;
  busy: boolean;
  error: string;
}) {
  const grouped = new Map<string, { name: string; count: number; total: number }>();
  for (const item of snapshot.cart) {
    const group = grouped.get(item.productId);
    if (group) {
      group.count += 1;
      group.total += item.priceInCents;
    } else grouped.set(item.productId, { name: item.name, count: 1, total: item.priceInCents });
  }
  const nonHostPlayers = snapshot.players.filter((player) => !player.isHost);
  const addCounts = new Map<string, number>();
  for (const event of snapshot.events.filter((entry) => entry.action === "add"))
    addCounts.set(event.playerId, (addCounts.get(event.playerId) ?? 0) + 1);
  const chaosPlayer = [...nonHostPlayers].sort(
    (a, b) => (addCounts.get(b.id) ?? 0) - (addCounts.get(a.id) ?? 0),
  )[0];
  return (
    <main className="damage-page">
      <header className="damage-header app-shell">
        <a className="brand" href="/">
          <span className="brand-mark">M</span>
          <span>McRemote</span>
        </a>
        <span>ROOM {snapshot.roomId}</span>
      </header>
      <section className="damage-hero app-shell">
        <div className="eyebrow">FINAL REPORT</div>
        <h1>
          🍟 THE
          <br />
          <span>DAMAGE</span>
        </h1>
        <div className="damage-total">
          <span className="damage-total-label">Your friends spent</span>
          <strong>{money(snapshot.totalInCents)}</strong>
          <small>
            of {money(snapshot.budgetInCents)} ·{" "}
            {Math.round((snapshot.totalInCents / snapshot.budgetInCents) * 100)}% budget used
          </small>
        </div>
      </section>
      <section className="damage-grid app-shell">
        <div className="receipt">
          <div className="receipt-head">
            <b>{snapshot.store.storeName}</b>
            <span className="receipt-source">
              {snapshot.store.source === "mcp" ? "MCP REAL MENU" : "DEMO MENU"}
            </span>
          </div>
          {[...grouped.values()].map((item) => (
            <div className="receipt-line" key={item.name}>
              <span className="price-check-label">
                {item.name} ×{item.count}
              </span>
              <b>{money(item.total)}</b>
            </div>
          ))}
          {!grouped.size && <p>购物车是空的——朋友们选择了克制。</p>}
          <div className="receipt-total">
            <span>TOTAL</span>
            <b>{money(snapshot.totalInCents)}</b>
          </div>
        </div>
        <div className="stats-panel">
          <h2>WHO DID THIS?</h2>
          <div className="stat">
            <span>😈 最大加购者</span>
            <b>{chaosPlayer?.nickname || "无人"}</b>
          </div>
          <div className="stat">
            <span>👥 参与好友</span>
            <b>{nonHostPlayers.length}</b>
          </div>
          <div className="stat">
            <span>🔒 被锁餐品</span>
            <b>{snapshot.cart.filter((item) => item.lockedBy).length}</b>
          </div>
          <div className="evidence">
            {[...snapshot.events]
              .reverse()
              .slice(0, 8)
              .map((event) => (
                <p key={event.id}>
                  <b>{playerNames.get(event.playerId)}</b> {actionText(event.action)}
                </p>
              ))}
          </div>
          {snapshot.viewer?.isHost && !snapshot.priceCheck && (
            <button
              className="button primary"
              type="button"
              onClick={onCheckout}
              disabled={busy || !snapshot.cart.length}
            >
              {busy ? "正在重新核价…" : "接受命运，重新核价 →"}
            </button>
          )}
          {snapshot.priceCheck && (
            <div className={`price-check ${snapshot.priceCheck.source}`}>
              <span>
                {snapshot.priceCheck.source === "mcp"
                  ? "✓ MCP REAL-TIME CHECK"
                  : "ⓘ DEMO PRICE CHECK"}
              </span>
              <strong>{money(snapshot.priceCheck.priceInCents)}</strong>
              <p>{snapshot.priceCheck.message}</p>
              <small>
                {snapshot.priceCheck.available
                  ? "全部餐品可核价"
                  : "部分餐品状态发生变化，请重新选择"}
              </small>
            </div>
          )}
          {!snapshot.viewer?.isHost && (
            <p className="host-note">只有房主可以进行最终核价和确认。</p>
          )}
          <a className="text-link" href="/">
            放弃 / 再开一局
          </a>
        </div>
      </section>
      {error && <Toast message={error} />}
    </main>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="toast" role="alert">
      {message}
    </div>
  );
}
