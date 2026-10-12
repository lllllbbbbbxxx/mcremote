"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import styles from "./design-lab.module.css";

type ScreenId = "landing" | "create" | "waiting" | "game" | "hell" | "damage";
type ActionKind = "delete" | "swap" | "lock";

interface Food {
  id: string;
  emoji: string;
  category: string;
  name: string;
  price: number;
}

interface CartEntry extends Food {
  cartId: string;
  player: string;
  locked?: boolean;
}

interface FeedEvent {
  id: string;
  avatar: string;
  text: string;
  meta: string;
  tone?: "default" | "danger" | "lock";
}

const screens: Array<{ id: ScreenId; label: string; number: string }> = [
  { id: "landing", label: "Landing", number: "01" },
  { id: "create", label: "Create", number: "02" },
  { id: "waiting", label: "Waiting", number: "03" },
  { id: "game", label: "Game", number: "04" },
  { id: "hell", label: "Hell", number: "05" },
  { id: "damage", label: "Damage", number: "06" },
];

const foods: Food[] = [
  { id: "big-mac", emoji: "🍔", category: "BURGERS", name: "Big Mac", price: 25 },
  { id: "mcnuggets", emoji: "◉", category: "SIDES", name: "McNuggets 6pc", price: 18 },
  { id: "fries", emoji: "🍟", category: "SIDES", name: "Large Fries", price: 12 },
  { id: "pie", emoji: "▰", category: "DESSERTS", name: "Apple Pie", price: 10 },
  { id: "mcflurry", emoji: "🍦", category: "DESSERTS", name: "McFlurry", price: 16 },
  { id: "cola", emoji: "🥤", category: "DRINKS", name: "Coke Zero", price: 10 },
];

const initialCart: CartEntry[] = [
  { ...foods[2], cartId: "cart-fries", player: "Bob" },
  { ...foods[4], cartId: "cart-mcflurry", player: "Carol", locked: true },
  { ...foods[5], cartId: "cart-cola", player: "Alice" },
];

const initialEvents: FeedEvent[] = [
  { id: "event-3", avatar: "C", text: "Carol LOCKED McFlurry", meta: "12s ago", tone: "lock" },
  { id: "event-2", avatar: "B", text: "Bob added Large Fries", meta: "18s ago" },
  { id: "event-1", avatar: "A", text: "Alice added Coke Zero", meta: "28s ago" },
];

const actionCopy: Record<ActionKind, { title: string; description: string; note: string }> = {
  delete: { title: "DELETE", description: "Remove one item.", note: "No questions asked." },
  swap: { title: "SWAP", description: "Replace a choice.", note: "Same slot. New problem." },
  lock: { title: "LOCK", description: "This item stays.", note: "Future chaos denied." },
};

function money(value: number) {
  return `¥${value.toFixed(value % 1 === 0 ? 0 : 1)}`;
}

function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={`${styles.wordmark} ${inverse ? styles.wordmarkInverse : ""}`}>
      <span className={styles.wordmarkDot} aria-hidden="true" />
      <strong>McRemote</strong>
      <span>/ 麦我一顿</span>
    </div>
  );
}

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

function SceneHeader({ right, inverse = false }: { right?: React.ReactNode; inverse?: boolean }) {
  return (
    <header className={`${styles.sceneHeader} ${inverse ? styles.sceneHeaderInverse : ""}`}>
      <Wordmark inverse={inverse} />
      <div className={styles.sceneHeaderRight}>{right}</div>
    </header>
  );
}

function PrimaryButton({
  children,
  onClick,
  variant = "yellow",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "yellow" | "dark" | "light";
  type?: "button" | "submit";
}) {
  return (
    <motion.button
      className={`${styles.primaryButton} ${styles[`button${variant}`]}`}
      type={type}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scaleY: 0.96, y: 1 }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.button>
  );
}

function PlayerAvatar({ label, tone }: { label: string; tone: number }) {
  return (
    <span className={styles.playerAvatar} data-tone={tone % 4}>
      {label}
    </span>
  );
}

function ScreenShell({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`${styles.screenShell} ${dark ? styles.screenShellDark : ""}`}>{children}</div>
  );
}

export function DesignLab() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("landing");
  const reduceMotion = useReducedMotion();

  return (
    <main className={styles.labRoot}>
      <header className={styles.labBar}>
        <div>
          <span className={styles.labKicker}>MCREMOTE · INTERACTIVE DESIGN SYSTEM</span>
          <strong>Quiet UI. Chaotic people.</strong>
        </div>
        <a href="/" className={styles.backLink}>
          返回 MVP <ArrowIcon />
        </a>
      </header>

      <nav className={styles.screenNav} aria-label="设计状态">
        {screens.map((screen) => (
          <button
            type="button"
            key={screen.id}
            className={activeScreen === screen.id ? styles.screenNavActive : ""}
            onClick={() => setActiveScreen(screen.id)}
          >
            <span>{screen.number}</span>
            {screen.label}
          </button>
        ))}
      </nav>

      <div className={styles.canvasWrap}>
        <AnimatePresence mode="wait">
          <motion.div
            className={styles.canvas}
            key={activeScreen}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: reduceMotion ? 0.08 : 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeScreen === "landing" && <LandingScreen onNavigate={setActiveScreen} />}
            {activeScreen === "create" && <CreateScreen onNavigate={setActiveScreen} />}
            {activeScreen === "waiting" && <WaitingScreen onNavigate={setActiveScreen} />}
            {activeScreen === "game" && <GameScreen onNavigate={setActiveScreen} />}
            {activeScreen === "hell" && <HellScreen onNavigate={setActiveScreen} />}
            {activeScreen === "damage" && <DamageScreen onNavigate={setActiveScreen} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className={styles.labFooter}>
        <span>Reference v1 · 6 states · responsive</span>
        <span>Motion: 80–180ms micro · 180–420ms gameplay · 400–900ms reveal</span>
      </footer>
    </main>
  );
}

function LandingScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  return (
    <ScreenShell>
      <SceneHeader
        right={
          <div className={styles.headerLinks}>
            <span>PLAY</span>
            <span>HOW IT WORKS</span>
            <span>ABOUT</span>
          </div>
        }
      />
      <section className={styles.landingBody}>
        <div className={styles.heroLockup}>
          <span className={styles.heroSpark} aria-hidden="true">
            ✦
          </span>
          <h1>麦我一顿</h1>
          <strong>McRemote</strong>
        </div>
        <div className={styles.landingIntro}>
          <h2>把一顿麦当劳交给你的朋友。</h2>
          <p>A multiplayer party game about trust, chaos and one shared meal.</p>
        </div>
        <div className={styles.modeGrid}>
          <motion.button
            type="button"
            className={styles.modeCard}
            onClick={() => onNavigate("create")}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.985 }}
          >
            <span>NORMAL</span>
            <p>Real items. Real choices.</p>
            <small>(Still questionable.)</small>
          </motion.button>
          <motion.button
            type="button"
            className={`${styles.modeCard} ${styles.modeCardDark}`}
            onClick={() => onNavigate("hell")}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.985 }}
          >
            <span>HELL MODE</span>
            <p>No information.</p>
            <small>All chaos.</small>
          </motion.button>
        </div>
        <div className={styles.landingFooterLine}>
          <span>Good food. Bad decisions. Great friends.</span>
          <strong>How much do you trust your friends?</strong>
          <span>Same meal. Stronger friendships? Maybe.</span>
        </div>
      </section>
    </ScreenShell>
  );
}

function CreateScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [budget, setBudget] = useState(50);
  const [duration, setDuration] = useState(90);
  return (
    <ScreenShell>
      <SceneHeader
        right={
          <div className={styles.headerLinks}>
            <span>STEP 1/2</span>
            <span>ROOM SETUP</span>
          </div>
        }
      />
      <section className={styles.createBody}>
        <span className={styles.sectionPill}>CREATE A ROOM</span>
        <h1>你愿意交出多少钱？</h1>
        <p>Set the budget. Hand it over. Let chaos begin.</p>
        <motion.div
          className={styles.budgetInput}
          key={budget}
          initial={{ scale: 0.97 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.16 }}
        >
          ¥{budget}
        </motion.div>
        <div className={styles.budgetOptions}>
          {[30, 50, 80, 100].map((value) => (
            <button
              type="button"
              key={value}
              className={budget === value ? styles.optionSelected : ""}
              onClick={() => setBudget(value)}
            >
              ¥{value}
            </button>
          ))}
        </div>
        <div className={styles.createFields}>
          <label>
            <span>选择门店 / Choose a store</span>
            <select defaultValue="jingan">
              <option value="jingan">上海 · 静安寺店</option>
              <option value="people">上海 · 人民广场店</option>
            </select>
          </label>
          <fieldset>
            <legend>游戏时长 / Game time</legend>
            <div>
              {[60, 90, 120].map((value) => (
                <button
                  type="button"
                  key={value}
                  className={duration === value ? styles.optionSelected : ""}
                  onClick={() => setDuration(value)}
                >
                  {value}s
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <PrimaryButton onClick={() => onNavigate("waiting")}>
          <span>把这顿交出去</span>
          <small>CREATE ROOM</small>
        </PrimaryButton>
      </section>
    </ScreenShell>
  );
}

function QrCode() {
  const cells = Array.from({ length: 121 }, (_, index) => {
    const row = Math.floor(index / 11);
    const col = index % 11;
    const finder = (row < 4 && col < 4) || (row < 4 && col > 6) || (row > 6 && col < 4);
    return {
      active: finder || (row * 7 + col * 5 + row * col) % 7 < 3,
      id: `qr-${row}-${col}`,
    };
  });
  return (
    <div className={styles.qrCode} aria-label="房间二维码示意图" role="img">
      {cells.map((cell) => (
        <i className={cell.active ? styles.qrOn : ""} key={cell.id} />
      ))}
    </div>
  );
}

function WaitingScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [players, setPlayers] = useState(["Alice", "Bob", "Carol", "David"]);
  const nextPlayers = ["Erin", "Frank", "Grace", "Henry"];
  function addPlayer() {
    const next = nextPlayers[players.length - 4];
    if (next) setPlayers((current) => [...current, next]);
  }
  return (
    <ScreenShell>
      <SceneHeader right={<span className={styles.headerSolo}>LEAVE</span>} />
      <section className={styles.waitingBody}>
        <div className={styles.roomShare}>
          <span className={styles.roomLabel}>ROOM</span>
          <h1>1024</h1>
          <p>Scan the QR code and join!</p>
          <QrCode />
          <div className={styles.readyCallout}>
            <strong>{players.length} friends are ready.</strong>
            <span>More chaos. Better meals.</span>
          </div>
        </div>
        <div className={styles.playersPanel}>
          <div className={styles.panelHeading}>
            <strong>PLAYERS</strong>
            <span>{players.length}/8</span>
          </div>
          <LayoutGroup>
            <AnimatePresence initial={false}>
              {players.map((player, index) => (
                <motion.div
                  layout
                  className={styles.playerRow}
                  key={player}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <PlayerAvatar label={player.slice(0, 1)} tone={index} />
                  <strong>{player}</strong>
                  <span>Ready!</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </LayoutGroup>
          {players.length < 8 && (
            <button type="button" className={styles.addPlayerButton} onClick={addPlayer}>
              <span>+</span> Simulate friend joining
            </button>
          )}
          <PrimaryButton onClick={() => onNavigate("game")}>▶ START CHAOS</PrimaryButton>
          <small className={styles.panelNote}>Everyone ready? Let&apos;s go!</small>
        </div>
      </section>
    </ScreenShell>
  );
}

function FoodCard({
  food,
  affordable,
  onAdd,
}: {
  food: Food;
  affordable: boolean;
  onAdd: () => void;
}) {
  return (
    <motion.article
      className={styles.foodCard}
      layout
      whileHover={affordable ? { y: -3 } : undefined}
    >
      <span className={styles.foodCategory}>{food.category}</span>
      <div className={styles.foodArt} aria-hidden="true">
        {food.emoji}
      </div>
      <h3>{food.name}</h3>
      <div className={styles.foodCardFooter}>
        <strong>{money(food.price)}</strong>
        <motion.button
          type="button"
          disabled={!affordable}
          onClick={onAdd}
          whileTap={affordable ? { scale: 0.94 } : undefined}
        >
          ADD +
        </motion.button>
      </div>
    </motion.article>
  );
}

function ActionCard({
  kind,
  selected,
  onSelect,
}: {
  kind: ActionKind;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = actionCopy[kind];
  return (
    <motion.button
      type="button"
      className={`${styles.actionCard} ${styles[`action${kind}`]} ${selected ? styles.actionSelected : ""}`}
      onClick={onSelect}
      whileHover={{ y: -3 }}
      whileTap={{ scaleY: 0.96 }}
    >
      <span>{kind === "delete" ? "╱" : kind === "swap" ? "⇄" : "▣"}</span>
      <strong>{copy.title}</strong>
      <p>{copy.description}</p>
      <small>{copy.note}</small>
    </motion.button>
  );
}

function EventRow({ event }: { event: FeedEvent }) {
  return (
    <motion.div
      className={styles.eventRow}
      data-tone={event.tone ?? "default"}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <span>{event.avatar}</span>
      <strong>{event.text}</strong>
      <small>{event.meta}</small>
    </motion.div>
  );
}

function GameScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [cart, setCart] = useState<CartEntry[]>(initialCart);
  const [events, setEvents] = useState<FeedEvent[]>(initialEvents);
  const [action, setAction] = useState<ActionKind>("delete");
  const [urgent, setUrgent] = useState(false);
  const eventSequence = useRef(10);
  const budget = 50;
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);
  const remaining = budget - total;

  function prependEvent(event: Omit<FeedEvent, "id">) {
    eventSequence.current += 1;
    setEvents((current) => [
      { ...event, id: `event-${eventSequence.current}` },
      ...current.slice(0, 4),
    ]);
  }

  function addFood(food: Food) {
    if (food.price > remaining) return;
    const cartId = `cart-${food.id}-${eventSequence.current + 1}`;
    setCart((current) => [...current, { ...food, cartId, player: "You" }]);
    prependEvent({ avatar: "Y", text: `You added ${food.name}`, meta: `-${money(food.price)}` });
  }

  function applyAction(item: CartEntry) {
    if (item.locked) {
      prependEvent({ avatar: "!", text: `${item.name} is LOCKED`, meta: "DENIED", tone: "lock" });
      return;
    }
    if (action === "delete") {
      setCart((current) => current.filter((entry) => entry.cartId !== item.cartId));
      prependEvent({
        avatar: "Y",
        text: `You deleted ${item.name}`,
        meta: `+${money(item.price)}`,
        tone: "danger",
      });
      return;
    }
    if (action === "lock") {
      setCart((current) =>
        current.map((entry) => (entry.cartId === item.cartId ? { ...entry, locked: true } : entry)),
      );
      prependEvent({ avatar: "Y", text: `You LOCKED ${item.name}`, meta: "STAYS", tone: "lock" });
      return;
    }
    const replacement = foods.find(
      (food) => food.id !== item.id && food.price <= remaining + item.price,
    );
    if (!replacement) return;
    setCart((current) =>
      current.map((entry) =>
        entry.cartId === item.cartId
          ? { ...replacement, cartId: item.cartId, player: "You" }
          : entry,
      ),
    );
    prependEvent({
      avatar: "Y",
      text: `You swapped ${item.name} → ${replacement.name}`,
      meta: "SWAP",
    });
  }

  return (
    <ScreenShell>
      <SceneHeader
        right={
          <div className={styles.gameMeta}>
            <span>ROOM 1024</span>
            <span>4 PLAYERS</span>
            <button type="button" onClick={() => setUrgent((value) => !value)}>
              {urgent ? "CALM MODE" : "LAST 10 SEC"}
            </button>
          </div>
        }
      />
      <section className={styles.gameBody} data-urgent={urgent}>
        <div className={styles.gameTopbar}>
          <div className={styles.timerBlock}>
            <span>TIME LEFT</span>
            <motion.strong
              key={urgent ? "urgent" : "calm"}
              initial={{ scale: urgent ? 1.18 : 1 }}
              animate={{ scale: 1 }}
            >
              {urgent ? "00:07" : "00:37"}
            </motion.strong>
          </div>
          <div className={styles.budgetBlock}>
            <span>BUDGET</span>
            <strong>
              {money(total)} <small>/ {money(budget)}</small>
            </strong>
            <div className={styles.progressTrack}>
              <motion.i animate={{ width: `${Math.min(100, (total / budget) * 100)}%` }} />
            </div>
            <small>{money(Math.max(0, remaining))} left</small>
          </div>
          <div className={styles.avatarBlock}>
            <span>4 PLAYERS</span>
            <div>
              {["A", "B", "C", "Y"].map((player, index) => (
                <PlayerAvatar key={player} label={player} tone={index} />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.gameColumns}>
          <div className={styles.menuColumn}>
            <div className={styles.categoryTabs}>
              <b>BURGERS</b>
              <span>SIDES</span>
              <span>DRINKS</span>
              <span>DESSERTS</span>
              <span>OTHERS</span>
            </div>
            <div className={styles.foodGrid}>
              {foods.map((food) => (
                <FoodCard
                  key={food.id}
                  food={food}
                  affordable={food.price <= remaining}
                  onAdd={() => addFood(food)}
                />
              ))}
            </div>
            <div className={styles.actionDeck}>
              {(["delete", "swap", "lock"] as ActionKind[]).map((kind) => (
                <ActionCard
                  key={kind}
                  kind={kind}
                  selected={action === kind}
                  onSelect={() => setAction(kind)}
                />
              ))}
            </div>
          </div>

          <aside className={styles.cartColumn}>
            <div className={styles.panelHeading}>
              <strong>SHARED CART</strong>
              <span>{cart.length}</span>
            </div>
            <LayoutGroup>
              <div className={styles.cartList}>
                <AnimatePresence initial={false}>
                  {cart.map((item) => (
                    <motion.button
                      layout
                      type="button"
                      className={`${styles.cartItem} ${item.locked ? styles.cartItemLocked : ""}`}
                      key={item.cartId}
                      onClick={() => applyAction(item)}
                      exit={{ opacity: 0, x: -24, height: 0 }}
                      whileTap={item.locked ? { x: [0, -3, 3, 0] } : { scale: 0.985 }}
                    >
                      <span className={styles.cartEmoji}>{item.emoji}</span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>Added by {item.player}</small>
                      </span>
                      <b>{money(item.price)}</b>
                      {item.locked && <em>LOCKED</em>}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </LayoutGroup>
            <div className={styles.cartTotal}>
              <span>TOTAL</span>
              <strong>{money(total)}</strong>
            </div>
            <div className={styles.eventFeed}>
              <div className={styles.panelHeading}>
                <strong>RECENT EVENTS</strong>
                <span>LIVE</span>
              </div>
              <AnimatePresence initial={false}>
                {events.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </AnimatePresence>
            </div>
            <button
              type="button"
              className={styles.finishLink}
              onClick={() => onNavigate("damage")}
            >
              Preview game ending →
            </button>
          </aside>
        </div>
      </section>
    </ScreenShell>
  );
}

function HellScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [count, setCount] = useState(4);
  const anonymous = [
    ["?", "Someone added something.", "8s ago"],
    ["╱", "An item was removed.", "15s ago"],
    ["▣", "Something has been LOCKED.", "22s ago"],
    ["?", "Someone added something.", "28s ago"],
    ["⇄", "Two items were swapped.", "41s ago"],
    ["?", "Someone added something.", "52s ago"],
  ];
  return (
    <ScreenShell dark>
      <SceneHeader
        inverse
        right={
          <div className={styles.hellHeaderMeta}>
            <span>ROOM 2025</span>
            <b>HELL MODE</b>
          </div>
        }
      />
      <section className={styles.hellBody}>
        <div className={styles.hellMetrics}>
          <div>
            <span>TIME LEFT</span>
            <strong>00:28</strong>
          </div>
          <div>
            <span>BUDGET</span>
            <strong>
              ¥43 <small>/ ¥80</small>
            </strong>
            <div>
              <i />
            </div>
          </div>
        </div>
        <div className={styles.anonymousFeed}>
          <AnimatePresence initial={false}>
            {anonymous.slice(0, count).map(([icon, text, time], index) => (
              <motion.div
                key={`${text}-${time}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span>{icon}</span>
                <strong>{text}</strong>
                <small>{time}</small>
                {index === 2 && <em>PERMANENT</em>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className={styles.hellFooter}>
          <strong>Your friends are laughing.</strong>
          <div>
            {count < anonymous.length && (
              <button type="button" onClick={() => setCount((value) => value + 1)}>
                Simulate event +
              </button>
            )}
            <button type="button" onClick={() => onNavigate("damage")}>
              Reveal fate →
            </button>
          </div>
        </div>
      </section>
    </ScreenShell>
  );
}

function DamageScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const receipt = [
    ["Large Fries × 2", 20],
    ["McFlurry", 16],
    ["Apple Pie", 7.5],
    ["Coke Zero", 6],
  ] as const;
  const stats = [
    { icon: "♛", label: "TOP MENACE", value: "Bob", note: "Most money spent." },
    { icon: "▣", label: "MOST STUBBORN", value: "McFlurry", note: "Locked and loved." },
    { icon: "╱", label: "FIRST CASUALTY", value: "Big Mac", note: "First to be deleted." },
  ];
  return (
    <ScreenShell>
      <SceneHeader
        right={
          <div className={styles.headerLinks}>
            <button type="button" onClick={() => onNavigate("landing")}>
              PLAY AGAIN
            </button>
            <span>SHARE</span>
          </div>
        }
      />
      <section className={styles.damageBody}>
        <div className={styles.damageTitle}>
          <span>FINAL REPORT</span>
          <h1>THE DAMAGE</h1>
          <p>Here&apos;s what your friends have done.</p>
        </div>
        <div className={styles.damageGrid}>
          <motion.div
            className={styles.receiptCard}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.panelHeading}>
              <strong>ORDER SUMMARY</strong>
              <span>MCP LIVE</span>
            </div>
            {receipt.map(([name, price], index) => (
              <motion.div
                className={styles.receiptLine}
                key={name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + index * 0.08 }}
              >
                <span>{name}</span>
                <strong>{money(price)}</strong>
              </motion.div>
            ))}
            <div className={styles.receiptTotal}>
              <span>TOTAL</span>
              <strong>
                ¥49.5 <small>/ ¥50</small>
              </strong>
            </div>
          </motion.div>
          <div className={styles.statStack}>
            {stats.map((stat, index) => (
              <motion.article
                className={styles.statCard}
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.48 + index * 0.1 }}
              >
                <span>{stat.icon}</span>
                <div>
                  <small>{stat.label}</small>
                  <strong>{stat.value}</strong>
                  <p>{stat.note}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
        <motion.div
          className={styles.damageQuote}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.82 }}
        >
          5 friends. ¥50. Zero adult supervision.
        </motion.div>
      </section>
    </ScreenShell>
  );
}
