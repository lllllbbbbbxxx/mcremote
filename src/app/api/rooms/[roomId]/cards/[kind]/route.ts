import QRCode from "qrcode";
import sharp from "sharp";
import { getRoom } from "@/lib/room-store";

export const runtime = "nodejs";

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => {
    return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[
      character
    ] as string;
  });
}

function money(cents: number) {
  return `RMB ${(cents / 100).toFixed(2)}`;
}

function imageResponse(svg: string, filename: string) {
  return sharp(Buffer.from(svg))
    .png()
    .toBuffer()
    .then(
      (body) =>
        new Response(new Uint8Array(body), {
          headers: {
            "Cache-Control": "public, max-age=0, must-revalidate",
            "Content-Disposition": `inline; filename="${filename}"`,
            "Content-Type": "image/png",
          },
        }),
    );
}

function shareSvg(input: {
  roomId: string;
  shareUrl: string;
  qrDataUrl: string;
  budgetInCents: number;
  playerCount: number;
  menuCount: number;
}) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
      <rect width="1200" height="1500" fill="#ffc800"/>
      <rect x="72" y="72" width="1056" height="1356" rx="48" fill="#fffaf0" stroke="#18110c" stroke-width="8"/>
      <text x="120" y="164" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#18110c">McREMOTE</text>
      <text x="1080" y="164" text-anchor="end" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#5f554d">POWERED BY MCD MCP</text>
      <line x1="120" y1="205" x2="1080" y2="205" stroke="#18110c" stroke-width="4"/>
      <text x="120" y="348" font-family="Arial, sans-serif" font-size="122" font-weight="900" fill="#18110c">YOUR LUNCH</text>
      <text x="120" y="468" font-family="Arial, sans-serif" font-size="122" font-weight="900" fill="#d71920">IS NOT YOURS.</text>
      <rect x="120" y="548" width="960" height="164" rx="26" fill="#18110c"/>
      <text x="164" y="616" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#ffc800">ROOM CODE</text>
      <text x="164" y="679" font-family="Arial, sans-serif" font-size="64" font-weight="900" letter-spacing="12" fill="#ffffff">${escapeXml(input.roomId)}</text>
      <text x="1036" y="652" text-anchor="end" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#ffffff">${escapeXml(money(input.budgetInCents))}</text>
      <rect x="120" y="770" width="590" height="530" rx="32" fill="#ffffff" stroke="#18110c" stroke-width="5"/>
      <image href="${input.qrDataUrl}" x="165" y="815" width="500" height="500"/>
      <text x="760" y="852" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#d71920">SCAN TO JOIN</text>
      <text x="760" y="934" font-family="Arial, sans-serif" font-size="52" font-weight="900" fill="#18110c">ADD.</text>
      <text x="760" y="996" font-family="Arial, sans-serif" font-size="52" font-weight="900" fill="#18110c">DELETE.</text>
      <text x="760" y="1058" font-family="Arial, sans-serif" font-size="52" font-weight="900" fill="#18110c">SWAP.</text>
      <text x="760" y="1120" font-family="Arial, sans-serif" font-size="52" font-weight="900" fill="#18110c">LOCK.</text>
      <text x="760" y="1215" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#5f554d">${input.menuCount} LIVE MENU ITEMS</text>
      <text x="760" y="1260" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#5f554d">${input.playerCount} PLAYER READY</text>
      <text x="120" y="1380" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#5f554d">${escapeXml(input.shareUrl)}</text>
    </svg>`;
}

function resultSvg(input: {
  roomId: string;
  totalInCents: number;
  budgetInCents: number;
  playerCount: number;
  cartCount: number;
  eventCount: number;
  source: string;
}) {
  const utilization = input.budgetInCents
    ? Math.round((input.totalInCents / input.budgetInCents) * 100)
    : 0;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
      <rect width="1200" height="1500" fill="#18110c"/>
      <rect x="72" y="72" width="1056" height="1356" rx="48" fill="#ffc800"/>
      <text x="120" y="168" font-family="Arial, sans-serif" font-size="32" font-weight="900" fill="#18110c">McREMOTE / FINAL REPORT</text>
      <text x="1080" y="168" text-anchor="end" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#18110c">ROOM ${escapeXml(input.roomId)}</text>
      <line x1="120" y1="214" x2="1080" y2="214" stroke="#18110c" stroke-width="5"/>
      <text x="120" y="380" font-family="Arial, sans-serif" font-size="142" font-weight="900" fill="#18110c">THE</text>
      <text x="120" y="520" font-family="Arial, sans-serif" font-size="142" font-weight="900" fill="#d71920">DAMAGE.</text>
      <rect x="120" y="590" width="960" height="276" rx="32" fill="#d71920" stroke="#18110c" stroke-width="6"/>
      <text x="168" y="674" font-family="Arial, sans-serif" font-size="27" font-weight="800" fill="#ffc800">YOUR FRIENDS SPENT</text>
      <text x="168" y="794" font-family="Arial, sans-serif" font-size="104" font-weight="900" fill="#ffffff">${escapeXml(money(input.totalInCents))}</text>
      <text x="1030" y="790" text-anchor="end" font-family="Arial, sans-serif" font-size="50" font-weight="900" fill="#ffffff">${utilization}%</text>
      <rect x="120" y="922" width="294" height="260" rx="26" fill="#fffaf0" stroke="#18110c" stroke-width="5"/>
      <rect x="453" y="922" width="294" height="260" rx="26" fill="#fffaf0" stroke="#18110c" stroke-width="5"/>
      <rect x="786" y="922" width="294" height="260" rx="26" fill="#fffaf0" stroke="#18110c" stroke-width="5"/>
      <text x="267" y="1012" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="800" fill="#5f554d">PLAYERS</text>
      <text x="267" y="1110" text-anchor="middle" font-family="Arial, sans-serif" font-size="82" font-weight="900" fill="#18110c">${input.playerCount}</text>
      <text x="600" y="1012" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="800" fill="#5f554d">CART ITEMS</text>
      <text x="600" y="1110" text-anchor="middle" font-family="Arial, sans-serif" font-size="82" font-weight="900" fill="#18110c">${input.cartCount}</text>
      <text x="933" y="1012" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="800" fill="#5f554d">CHAOS MOVES</text>
      <text x="933" y="1110" text-anchor="middle" font-family="Arial, sans-serif" font-size="82" font-weight="900" fill="#18110c">${input.eventCount}</text>
      <text x="120" y="1280" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#18110c">${escapeXml(input.source)}</text>
      <text x="120" y="1340" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#5f554d">REAL MENU. REAL PRICE. HOST-CONTROLLED CHECKOUT.</text>
    </svg>`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ roomId: string; kind: string }> },
) {
  const { roomId, kind } = await context.params;
  if (kind !== "share" && kind !== "result") {
    return Response.json({ error: "Card type not found" }, { status: 404 });
  }
  try {
    const snapshot = await getRoom(roomId, null);
    if (kind === "result") {
      if (snapshot.status !== "finished" && snapshot.status !== "checkout") {
        return Response.json({ error: "游戏结束后才能生成结算图片" }, { status: 409 });
      }
      return imageResponse(
        resultSvg({
          roomId: snapshot.roomId,
          totalInCents: snapshot.totalInCents,
          budgetInCents: snapshot.budgetInCents,
          playerCount: snapshot.players.length,
          cartCount: snapshot.cart.length,
          eventCount: snapshot.events.length,
          source: snapshot.store.source === "mcp" ? "MCD MCP VERIFIED" : "DEMO DATA",
        }),
        `mcremote-${snapshot.roomId}-result.png`,
      );
    }
    const shareUrl = `${new URL(request.url).origin}/room/${snapshot.roomId}`;
    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 500,
      margin: 1,
      color: { dark: "#18110c", light: "#ffffff" },
    });
    return imageResponse(
      shareSvg({
        roomId: snapshot.roomId,
        shareUrl,
        qrDataUrl,
        budgetInCents: snapshot.budgetInCents,
        playerCount: snapshot.players.length,
        menuCount: snapshot.menu.length,
      }),
      `mcremote-${snapshot.roomId}-invite.png`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成图片失败";
    return Response.json({ error: message }, { status: 404 });
  }
}
