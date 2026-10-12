"use client";

import { useEffect, useState } from "react";
import type { CatalogMode, StoreOption } from "@/types/mvp";

interface ApiError {
  error?: string;
}

const DEFAULT_CITY = "上海";
const DEFAULT_KEYWORD = "人民广场";

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json()) as T & ApiError;
  if (!response.ok) throw new Error(body.error || "请求失败，请稍后再试");
  return body;
}

export function CreateRoom() {
  const [mode, setMode] = useState<CatalogMode>("demo");
  const [modeMessage, setModeMessage] = useState("正在检查麦当劳 MCP…");
  const [city, setCity] = useState(DEFAULT_CITY);
  const [keyword, setKeyword] = useState(DEFAULT_KEYWORD);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(null);
  const [hostNickname, setHostNickname] = useState("房主");
  const [budgetYuan, setBudgetYuan] = useState(50);
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    jsonRequest<{ mode: CatalogMode; message: string }>("/api/catalog/status")
      .then((status) => {
        if (!active) return;
        setMode(status.mode);
        setModeMessage(status.message);
      })
      .catch(() => {
        if (active) setModeMessage("无法读取 MCP 配置状态");
      });

    setBusy(true);
    jsonRequest<{ mode: CatalogMode; stores: StoreOption[] }>("/api/catalog/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: DEFAULT_CITY, keyword: DEFAULT_KEYWORD }),
    })
      .then((result) => {
        if (!active) return;
        setMode(result.mode);
        setStores(result.stores);
        setSelectedStore(result.stores[0] ?? null);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "查询门店失败");
      })
      .finally(() => {
        if (active) setBusy(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function findStores() {
    setBusy(true);
    setError("");
    try {
      const result = await jsonRequest<{ mode: CatalogMode; stores: StoreOption[] }>(
        "/api/catalog/stores",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city, keyword }),
        },
      );
      setMode(result.mode);
      setStores(result.stores);
      setSelectedStore(result.stores[0] ?? null);
      if (!result.stores.length) setError("附近没有找到当前可用门店，请换个关键词");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "查询门店失败");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedStore) {
      setError("请先查询并选择门店");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await jsonRequest<{ token: string; snapshot: { roomId: string } }>(
        "/api/rooms",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostNickname,
            budgetYuan,
            durationSeconds,
            store: selectedStore,
          }),
        },
      );
      localStorage.setItem(`mcremote:${result.snapshot.roomId}`, result.token);
      window.location.assign(`/room/${result.snapshot.roomId}?token=${result.token}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建房间失败");
      setBusy(false);
    }
  }

  return (
    <form className="create-card" onSubmit={submit}>
      <div className={`mode-banner mode-${mode}`}>
        <span>{mode === "mcp" ? "● MCP LIVE" : "● DEMO MODE"}</span>
        <p>{modeMessage}</p>
      </div>

      <div className="form-step">
        <span className="step-number">1</span>
        <div className="step-content">
          <div className="form-label">找到目标门店</div>
          <div className="field-row">
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="城市"
            />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="商圈 / 地标"
            />
            <button className="small-button" type="button" onClick={findStores} disabled={busy}>
              查询
            </button>
          </div>
          {stores.length > 0 && (
            <>
              <div className="store-list-heading">
                <span>{stores.length} 家可用门店</span>
                <small>数据来自 {mode === "mcp" ? "MCP 实时查询" : "演示目录"}</small>
              </div>
              <div className="store-list">
                {stores.map((store) => {
                  const selected = selectedStore?.storeCode === store.storeCode;
                  return (
                    <button
                      type="button"
                      className={selected ? "store selected" : "store"}
                      aria-pressed={selected}
                      key={store.storeCode}
                      onClick={() => setSelectedStore(store)}
                    >
                      <span className="store-radio" aria-hidden="true">
                        {selected ? "✓" : ""}
                      </span>
                      <span className="store-copy">
                        <b>{store.storeName}</b>
                        <span>{store.address}</span>
                      </span>
                      {store.distance && (
                        <small>
                          {store.distance}
                          {/^\d+$/.test(store.distance) ? "m" : ""}
                        </small>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="form-step">
        <span className="step-number">2</span>
        <div className="step-content two-fields">
          <label>
            你的昵称
            <input
              value={hostNickname}
              onChange={(event) => setHostNickname(event.target.value)}
              maxLength={20}
            />
          </label>
          <label>
            总预算（元）
            <input
              type="number"
              value={budgetYuan}
              min={10}
              max={1000}
              step={1}
              onChange={(event) => setBudgetYuan(Number(event.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="form-step">
        <span className="step-number">3</span>
        <div className="step-content">
          <div className="form-label">游戏时长</div>
          <div className="duration-options">
            {[60, 90, 120].map((seconds) => (
              <button
                type="button"
                className={durationSeconds === seconds ? "duration selected" : "duration"}
                key={seconds}
                onClick={() => setDurationSeconds(seconds)}
              >
                {seconds}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary create-submit" type="submit" disabled={busy}>
        {busy ? "处理中…" : "CREATE ROOM →"}
      </button>
    </form>
  );
}
