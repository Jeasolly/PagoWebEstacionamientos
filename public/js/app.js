// ==========================
// Central Parking - app.js
// versión: 20260227-8
// CAMBIOS:
// - Soporte para Boleta SIN DNI / CON DNI
// - Correo obligatorio para emisión de CPE
// - Separación de nombre para boleta y factura
// - Limpieza de funciones duplicadas de validarCPE
// - Protección si validarVoucher no existe
// - Ocultar subtítulos de Boleta/Factura desde JS
// - Ocultar Sin DNI / Con DNI al seleccionar Factura
// - NUEVO: Soporte tolerancia inicial (entryGrace)
// - NUEVO: UI diferenciada para tolerancia inicial y tolerancia post-pago
// - NUEVO: Ya no mostrar S/ 0.00 como si fuera monto cuando aplica tolerancia
// - FIX: firstName y lastName siempre vacíos en billing Izipay
// ==========================
console.log("✅ app.js cargado versión 20260227-8");

// ==========================
// Config centralizada
// ==========================
const CONFIG = {
  API_BASE: "https://api.parkinventario.com/api",
  FACT_API:
    window.FACT_API_URL ||
    "https://val.parkinventario.com/facturacion/fact_api.php",

  IZIPAY_TOKEN_URL: "../izipay/generar_token.php",
  MERCHANT_CODE: "4004353",
  PAYMENT_CHANNEL_IZIPAY: 2,

  DEFAULT_OPERATOR_NAME: "Weblink",
  DEFAULT_PROMO_OPERATOR: "admin",

  DEFAULT_CURRENCY: "PEN",
  DEFAULT_CAJA: "Weblink",

  DEFAULT_CUSTOMER_EMAIL: "opcional@gmail.com",
  DEFAULT_CUSTOMER_NAME: "CLIENTE GENERAL",
  DEFAULT_PHONE: "999999999",
  DEFAULT_SERVICE_DESCRIPTION: "SERVICIO ESTACIONAMIENTO",
  DISCOUNT_BRAND_NAME: "DESCUENTO",

  DEFAULT_ADDRESS: {
    street: "Av. Santa Clara 123",
    city: "Lima",
    state: "Lima",
    country: "PE",
    postalCode: "15001",
  },

  DEFAULT_DOCS: {
    DNI: "00000000",
    RUC: "00000000000",
  },

  EMAIL_STORAGE_KEY: "cpe_email_cliente",
};

// ==========================
// Estado global
// ==========================
let token = "";
let currentCardNo = "";
let montoActual = 0;
let montoPagado = 0;

let promoCodeActual = "";
let promoNameActual = "";
let descuentoAplicado = 0;

let invoiceQrCodeActual = "";
let mediaStream = null;

let operatorNameFront = CONFIG.DEFAULT_OPERATOR_NAME;
let stayTimeMinutes = 0;

let estanciaActual = "—";
let inTimeEpochMs = 0;
let plateActual = "";
let plateFromQr = "";

let paymentStatusActual = null;
let entryGraceActual = null;
let toleranceModalShownForCard = "";

function createDefaultPayInfo() {
  return {
    brand: "",
    maskedPan: "",
    currency: CONFIG.DEFAULT_CURRENCY,
    caja: CONFIG.DEFAULT_CAJA,
    amount: "",
    orderNumber: "",
    transactionId: "",
  };
}

let payInfo = createDefaultPayInfo();

let pendingCpePayload = null;
let izipayEnProceso = false;
let emitiendo = false;

// ==========================
// DOM helpers
// ==========================
const qs = (sel) => document.querySelector(sel);
const qsi = (id) => document.getElementById(id);

// ==========================
// Utilidades básicas
// ==========================
const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

function setText(id, value) {
  const el = qsi(id);
  if (el) el.textContent = value ?? "";
}

function setHtml(id, value) {
  const el = qsi(id);
  if (el) el.innerHTML = value ?? "";
}

function disable(el, v) {
  if (el) el.disabled = !!v;
}

function setMsg(text) {
  const el = qsi("estadoTxt");
  if (el) el.innerText = text || "—";
}

function setMonto(n) {
  const el = qsi("montoTxt");
  if (!el) return;

  if (typeof n === "number") {
    el.innerText = "S/ " + round2(n).toFixed(2);
  } else {
    el.innerText = "S/ —";
  }
}

function formatMoney(n) {
  return "S/ " + round2(n || 0).toFixed(2);
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtDateTimeEsFromMs(ms) {
  if (!ms || Number(ms) <= 0) return "—";
  try {
    return new Date(Number(ms)).toLocaleString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function extractFirstName(fullname) {
  let s = (fullname || "").toString().replace(/\s+/g, " ").trim();
  if (!s) return CONFIG.DEFAULT_OPERATOR_NAME;

  const parts = s.split(" ");
  let first = parts[0];

  if (parts.length > 1) {
    const A = (first || "").toUpperCase();
    const B = (parts[1] || "").toUpperCase();
    const compuestos = /^(JEAN|MARIA|JOSE|LUIS|ANA)$/i;
    if (compuestos.test(A) && /^[A-ZÁÉÍÓÚÑ]+$/.test(B)) {
      first = (parts[0] + " " + parts[1]).replace(/\s+/g, "");
    }
  }

  return first;
}

function splitName(full) {
  const s = (full || "").toString().replace(/\s+/g, " ").trim();
  if (!s) return { firstName: "", lastName: "" };
  const parts = s.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function getTipoSeleccionado() {
  return qs("input[name='tipo']:checked")?.value || "boleta";
}

function getBoletaModoSeleccionado() {
  return qs("input[name='boletaModo']:checked")?.value || "sin_dni";
}

function minutesToHuman(mins) {
  const m = Math.max(0, Number(mins || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}h ${r}m`;
}

function hasMeaningfulValue(v) {
  return v !== undefined && v !== null && v !== "";
}

function isInsidePostPaymentTolerance() {
  return Boolean(
    paymentStatusActual?.hasPaymentRecord &&
      !paymentStatusActual?.graceExpired
  );
}

function isExpiredPostPaymentTolerance() {
  return Boolean(
    paymentStatusActual?.hasPaymentRecord &&
      paymentStatusActual?.graceExpired === true
  );
}

function isInsideEntryGrace() {
  return Boolean(
    !paymentStatusActual?.hasPaymentRecord && entryGraceActual?.insideEntryGrace
  );
}

// ==========================
// Parse ticket compuesto desde QR
// Formato esperado:
// S|AUN-CLDG|I01|{plate}|2|{ticket}
// ==========================
function parseIncomingTicketPayload(rawValue) {
  let raw = String(rawValue || "").trim();

  if (!raw) {
    return { raw: "", cardNo: "", plate: "", parts: [], isComposite: false };
  }

  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      raw =
        (u.searchParams.get("ticket") || u.searchParams.get("cardNo") || "").trim();
    }
  } catch {
    // ignorar
  }

  if (!raw) {
    return { raw: "", cardNo: "", plate: "", parts: [], isComposite: false };
  }

  if (!raw.includes("|")) {
    return { raw, cardNo: raw, plate: "", parts: [raw], isComposite: false };
  }

  const parts = raw
    .split("|")
    .map((x) => String(x || "").trim())
    .filter((x) => x !== "");

  const cardNo = parts.length ? parts[parts.length - 1] : raw;
  const plate = parts.length >= 6 ? (parts[3] || "").toUpperCase() : "";

  return { raw, cardNo, plate, parts, isComposite: true };
}

// ==========================
// Correo persistente
// ==========================
function getCorreo() {
  return (qsi("correoDoc")?.value || "").trim();
}

function setCorreo(v) {
  const el = qsi("correoDoc");
  if (el) el.value = v || "";
}

function guardarCorreo() {
  const v = getCorreo();
  localStorage.setItem(CONFIG.EMAIL_STORAGE_KEY, v);
}

function cargarCorreo() {
  const v = localStorage.getItem(CONFIG.EMAIL_STORAGE_KEY) || "";
  setCorreo(v);
}

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==========================
// Helpers Izipay
// ==========================
function safeGet(obj, path) {
  try {
    return path
      .split(".")
      .reduce((a, k) => (a && a[k] != null ? a[k] : undefined), obj);
  } catch {
    return undefined;
  }
}

function getMaskedPanFromRes(res) {
  return (
    res.maskedPan ||
    res.maskedPAN ||
    res.pan ||
    res.cardNumber ||
    res.cardPan ||
    safeGet(res, "payment.card.maskedPan") ||
    safeGet(res, "payment.card.pan") ||
    safeGet(res, "data.card.maskedPan") ||
    safeGet(res, "data.pan") ||
    ""
  );
}

function getBrandFromRes(res) {
  return (
    res.brand ||
    res.paymentMethod ||
    res.cardBrand ||
    res.paymentMethodType ||
    safeGet(res, "payment.card.brand") ||
    safeGet(res, "payment.brand") ||
    safeGet(res, "data.brand") ||
    ""
  );
}

// ==========================
// Billing Izipay
// ✅ FIX: firstName y lastName siempre vacíos
// ==========================
function buildIzipayBillingFromPayload(payload) {
  const tipo = payload?.tipo || "boleta";
  const cliente = payload?.cliente || {};

  const correo =
    (cliente.email || "").trim() || CONFIG.DEFAULT_CUSTOMER_EMAIL;
  const numeroDocumento = (cliente.numeroDocumento || "").trim();

  // ✅ Siempre vacíos — Izipay no los requiere y causan confusión
  const firstName = "";
  const lastName  = "";

  let documentType = "DNI";
  let document = CONFIG.DEFAULT_DOCS.DNI;

  if (tipo === "factura") {
    documentType = "RUC";
    document = numeroDocumento || CONFIG.DEFAULT_DOCS.RUC;
  } else if (
    tipo === "boleta" &&
    numeroDocumento &&
    numeroDocumento !== CONFIG.DEFAULT_DOCS.DNI
  ) {
    documentType = "DNI";
    document = numeroDocumento;
  } else {
    documentType = "DNI";
    document = CONFIG.DEFAULT_DOCS.DNI;
  }

  return {
    firstName,
    lastName,
    email: correo,
    phoneNumber: CONFIG.DEFAULT_PHONE,
    street: CONFIG.DEFAULT_ADDRESS.street,
    city: CONFIG.DEFAULT_ADDRESS.city,
    state: CONFIG.DEFAULT_ADDRESS.state,
    country: CONFIG.DEFAULT_ADDRESS.country,
    postalCode: CONFIG.DEFAULT_ADDRESS.postalCode,
    documentType,
    document,
  };
}

function clearPendingPaymentProcess() {
  pendingCpePayload = null;
  izipayEnProceso = false;
}

// ==========================
// Vistas
// ==========================
function showFormView() {
  const formView = qsi("formView");
  const ticketView = qsi("ticketView");
  if (ticketView) ticketView.style.display = "none";
  if (formView) formView.style.display = "block";
}

function showTicketView() {
  const formView = qsi("formView");
  const ticketView = qsi("ticketView");
  if (formView) formView.style.display = "none";
  if (ticketView) ticketView.style.display = "block";
}

function volverAConsulta() {
  showFormView();
  const input = qsi("cardNo");
  if (input) input.focus();
}

// ==========================
// Render QR real
// ==========================
function renderTicketQr(value) {
  const box = qsi("t_qr");
  if (!box) return;

  box.innerHTML = "";

  const qrValue = String(value || "").trim();
  if (!qrValue) {
    box.innerHTML =
      "<span style='font-size:10px;color:#6b7280;'>QR no disponible</span>";
    return;
  }

  if (window.QRCode && typeof window.QRCode.toCanvas === "function") {
    const canvas = document.createElement("canvas");
    box.appendChild(canvas);

    QRCode.toCanvas(
      canvas,
      qrValue,
      { width: 140, margin: 1, color: { dark: "#111111", light: "#ffffff" } },
      function (err) {
        if (err) {
          box.innerHTML =
            "<span style='font-size:10px;color:#6b7280;'>QR no disponible</span>";
        }
      }
    );
  } else {
    box.innerHTML =
      "<span style='font-size:10px;color:#6b7280;'>QR no disponible</span>";
  }
}

// ==========================
// Acciones UI
// ==========================
function setDisplayById(id, show, displayValue = "") {
  const el = qsi(id);
  if (!el) return;
  el.style.display = show ? displayValue : "none";
}

function setActionVisibility(show) {
  setDisplayById("ticketActions", show, "flex");
  setDisplayById("ticketVoucherBlock", show, "flex");
  setDisplayById("ticketPayBlock", show, "flex");
}

function setTicketNormalMode(showNormal) {
  setDisplayById("ticketNormalContent", showNormal, "block");
  setDisplayById("ticketActions", showNormal, "flex");
  setDisplayById("ticketNormalHeader", showNormal, "flex");
  setDisplayById("ticketNormalDivider1", showNormal, "block");
  setDisplayById("ticketNormalGrid", showNormal, "grid");
  setDisplayById("ticketNormalDivider2", showNormal, "block");
}

function getCardLogoHtml() {
  const img =
    qs(".ticket-mini-logo") ||
    qs(".logo-large") ||
    qs(".logo") ||
    qs(".ticket-brand-mini img") ||
    qs("header img") ||
    qs("img[alt*='Central']");

  const src = img?.getAttribute("src") || "";
  if (!src) return "";

  return `
    <div style="display:flex;justify-content:center;align-items:center;margin-bottom:14px;">
      <img src="${escapeHtml(src)}" alt="Central Parking" style="height:44px;object-fit:contain;">
    </div>
  `;
}

function ensureInlineToleranceHost() {
  let host = qsi("inlineToleranceHost");
  if (host) return host;

  const ticketView = qsi("ticketView");
  if (!ticketView) return null;

  host = document.createElement("div");
  host.id = "inlineToleranceHost";
  ticketView.appendChild(host);
  return host;
}

function clearInlineToleranceHost() {
  const host = qsi("inlineToleranceHost");
  if (host) host.innerHTML = "";
}

// ==========================
// Tarjeta inline: dentro de tolerancia post-pago
// ==========================
function buildInlineToleranceHtml(status) {
  const totalStay = status?.totalStayHuman || estanciaActual || "—";
  const paidAt = status?.paidAtLocal || "—";
  const stayLbl = hasMeaningfulValue(status?.stayTimeMinutes)
    ? `${status.stayTimeMinutes} min`
    : "—";

  const sincePay = hasMeaningfulValue(status?.minutesSincePayment)
    ? minutesToHuman(status.minutesSincePayment)
    : "—";

  const remain = hasMeaningfulValue(status?.graceRemainingMinutes)
    ? `${status.graceRemainingMinutes} min`
    : "—";

  const parkName = status?.parkName || "Central Parking";
  const plate = status?.plate || plateActual || "—";
  const ticket = status?.cardNo || currentCardNo || "—";
  const summary =
    status?.summary ||
    `Aún está dentro de la tolerancia de salida (${stayLbl}).`;

  return `
    <div style="
      border:1px solid #bfd7ff;
      background: linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
      border-radius: 22px;
      padding: 14px 14px 14px 14px;
      box-shadow: 0 10px 30px rgba(0, 54, 135, 0.08);
    ">
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:22px;font-weight:900;color:#0f172a;line-height:1.15;">
          Dentro de tolerancia
        </div>
        <div style="
          display:inline-flex;
          margin-top:10px;
          background:#dbeafe;
          color:#1d4ed8;
          padding:8px 14px;
          border-radius:999px;
          font-size:12px;
          font-weight:800;
          letter-spacing:.3px;
        ">
          SALIDA HABILITADA
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
        <div style="background:#fff;border:1px solid #e5edf9;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Sede</div>
          <div style="font-size:14px;font-weight:800;color:#111827;">${escapeHtml(parkName)}</div>
        </div>
        <div style="background:#fff;border:1px solid #e5edf9;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Ticket</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(ticket)}</div>
        </div>
        <div style="background:#fff;border:1px solid #e5edf9;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Placa</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(plate)}</div>
        </div>
        <div style="background:#fff;border:1px solid #e5edf9;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Tiempo estacionado</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(totalStay)}</div>
        </div>
        <div style="background:#fff;border:1px solid #e5edf9;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Último pago</div>
          <div style="font-size:14px;font-weight:800;color:#111827;">${escapeHtml(paidAt)}</div>
        </div>
        <div style="background:#fff;border:1px solid #e5edf9;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Tolerancia</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(stayLbl)}</div>
        </div>
        <div style="background:#fff;border:1px solid #e5edf9;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Tiempo desde pago</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(sincePay)}</div>
        </div>
        <div style="background:#fff;border:1px solid #d1fae5;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#065f46;margin-bottom:4px;">Minutos restantes</div>
          <div style="font-size:20px;font-weight:900;color:#16a34a;">${escapeHtml(remain)}</div>
        </div>
      </div>

      <div style="
        margin-top:14px;
        background:#ffffff;
        border:1px dashed #bfd7ff;
        border-radius:14px;
        padding:12px;
        color:#334155;
        font-size:14px;
        line-height:1.55;
        text-align:center;
      ">
        ${escapeHtml(summary)}
      </div>
    </div>
  `;
}

// ==========================
// Tarjeta inline: tolerancia inicial
// ==========================
function buildInlineEntryGraceHtml(status) {
  const totalStay = status?.totalStayHuman || estanciaActual || "—";
  const entryAt = status?.entryTimeLocal || fmtDateTimeEsFromMs(inTimeEpochMs);
  const freeLbl = hasMeaningfulValue(status?.freeMinutes)
    ? `${status.freeMinutes} min`
    : "—";

  const used = hasMeaningfulValue(status?.usedMinutes)
    ? `${status.usedMinutes} min`
    : "—";

  const remain = hasMeaningfulValue(status?.remainingMinutes)
    ? `${status.remainingMinutes} min`
    : "—";

  const plate = status?.plate || plateActual || "—";
  const ticket = status?.cardNo || currentCardNo || "—";
  const summary =
    status?.summary ||
    `Aún está dentro de la tolerancia inicial (${freeLbl}).`;

  return `
    <div style="
      border:1px solid #bbf7d0;
      background: linear-gradient(180deg, #f7fff8 0%, #ecfdf3 100%);
      border-radius: 22px;
      padding: 14px 14px 14px 14px;
      box-shadow: 0 10px 30px rgba(22, 163, 74, 0.08);
    ">
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:22px;font-weight:900;color:#14532d;line-height:1.15;">
          Tolerancia inicial vigente
        </div>
        <div style="
          display:inline-flex;
          margin-top:10px;
          background:#dcfce7;
          color:#15803d;
          padding:8px 14px;
          border-radius:999px;
          font-size:12px;
          font-weight:800;
          letter-spacing:.3px;
        ">
          SALIDA SIN PAGO
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
        <div style="background:#fff;border:1px solid #dcfce7;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Ticket</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(ticket)}</div>
        </div>
        <div style="background:#fff;border:1px solid #dcfce7;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Placa</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(plate)}</div>
        </div>
        <div style="background:#fff;border:1px solid #dcfce7;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Hora de ingreso</div>
          <div style="font-size:14px;font-weight:800;color:#111827;">${escapeHtml(entryAt || "—")}</div>
        </div>
        <div style="background:#fff;border:1px solid #dcfce7;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Tiempo estacionado</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(totalStay)}</div>
        </div>
        <div style="background:#fff;border:1px solid #dcfce7;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Tolerancia inicial</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(freeLbl)}</div>
        </div>
        <div style="background:#fff;border:1px solid #dcfce7;border-radius:16px;padding:12px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Tiempo usado</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(used)}</div>
        </div>
        <div style="background:#fff;border:1px solid #bbf7d0;border-radius:16px;padding:12px;grid-column:1 / -1;">
          <div style="font-size:11px;color:#166534;margin-bottom:4px;">Minutos restantes</div>
          <div style="font-size:22px;font-weight:900;color:#16a34a;">${escapeHtml(remain)}</div>
        </div>
      </div>

      <div style="
        margin-top:14px;
        background:#ffffff;
        border:1px dashed #bbf7d0;
        border-radius:14px;
        padding:12px;
        color:#334155;
        font-size:14px;
        line-height:1.55;
        text-align:center;
      ">
        ${escapeHtml(summary)}
      </div>
    </div>
  `;
}

// ==========================
// Mostrar / ocultar tarjeta de tolerancia
// ==========================
function renderInlineToleranceCardIfNeeded() {
  const host = ensureInlineToleranceHost();
  if (!host) return;

  const insidePostPaymentTolerance = isInsidePostPaymentTolerance();
  const insideEntryGraceNow = isInsideEntryGrace();

  if (insidePostPaymentTolerance) {
    host.innerHTML = buildInlineToleranceHtml(paymentStatusActual);
    setTicketNormalMode(false);
    setActionVisibility(false);
    return;
  }

  if (insideEntryGraceNow) {
    host.innerHTML = buildInlineEntryGraceHtml(entryGraceActual);
    setTicketNormalMode(false);
    setActionVisibility(false);
    return;
  }

  host.innerHTML = "";
  setTicketNormalMode(true);
  setActionVisibility(true);
}

// ==========================
// Modal tolerancia vencida
// ==========================
async function showGraceExpiredModalIfNeeded() {
  const expired = isExpiredPostPaymentTolerance();
  if (!expired) return;

  const modalKey = `${currentCardNo}|${paymentStatusActual?.paidAtMs || ""}|${montoActual}`;
  if (toleranceModalShownForCard === modalKey) return;
  toleranceModalShownForCard = modalKey;

  const totalStay = paymentStatusActual?.totalStayHuman || estanciaActual || "—";
  const paidAt = paymentStatusActual?.paidAtLocal || "—";
  const sincePay = hasMeaningfulValue(paymentStatusActual?.minutesSincePayment)
    ? minutesToHuman(paymentStatusActual.minutesSincePayment)
    : "—";
  const expiredBy = hasMeaningfulValue(paymentStatusActual?.minutesAfterGrace)
    ? `${paymentStatusActual.minutesAfterGrace} min`
    : "0 min";
  const stayLbl = hasMeaningfulValue(paymentStatusActual?.stayTimeMinutes)
    ? `${paymentStatusActual.stayTimeMinutes} min`
    : "—";

  const html = `
    <div style="text-align:left;">
      <div style="
        margin-bottom:12px;
        padding:12px 14px;
        border-radius:14px;
        background:#fff7ed;
        border:1px solid #fdba74;
        color:#9a3412;
        font-weight:700;
        text-align:center;
        line-height:1.45;
      ">
        ⚠️ Ya se pasó el tiempo de tolerancia de salida.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;">
          <div style="font-size:12px;color:#64748b;">Ticket</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(currentCardNo || "—")}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;">
          <div style="font-size:12px;color:#64748b;">Placa</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(paymentStatusActual?.plate || plateActual || "—")}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;">
          <div style="font-size:12px;color:#64748b;">Tiempo estacionado</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(totalStay)}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;">
          <div style="font-size:12px;color:#64748b;">Último pago</div>
          <div style="font-size:15px;font-weight:800;color:#111827;">${escapeHtml(paidAt)}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;">
          <div style="font-size:12px;color:#64748b;">Tolerancia</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(stayLbl)}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;">
          <div style="font-size:12px;color:#64748b;">Tiempo desde pago</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(sincePay)}</div>
        </div>
        <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:10px;grid-column:1 / -1;">
          <div style="font-size:12px;color:#9f1239;">Tiempo excedido</div>
          <div style="font-size:20px;font-weight:800;color:#be123c;">${escapeHtml(expiredBy)}</div>
        </div>
      </div>
      <div style="margin-top:14px;color:#475569;font-size:14px;line-height:1.5;text-align:center;">
        Al aceptar, se mostrará el resumen normal para que puedas continuar con el cálculo y pago del nuevo monto.
      </div>
    </div>
  `;

  if (window.Swal) {
    await Swal.fire({
      title: "Tolerancia vencida",
      html,
      width: 720,
      confirmButtonText: "Aceptar",
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
  } else {
    alert(
      `Tolerancia vencida\n\nTicket: ${currentCardNo}\nPlaca: ${paymentStatusActual?.plate || plateActual || "—"}\nÚltimo pago: ${paidAt}\nTiempo desde pago: ${sincePay}\nExcedido: ${expiredBy}`
    );
  }
}

// ==========================
// Render ticket
// ==========================
function renderTicketUI() {
  const insidePostPaymentTolerance = isInsidePostPaymentTolerance();
  const insideEntryGraceNow = isInsideEntryGrace();

  setText("t_cardNo", currentCardNo || "—");
  setText("t_plate", plateActual || "—");
  setText("t_entryTime", fmtDateTimeEsFromMs(inTimeEpochMs));
  setText("t_stay", estanciaActual || "—");

  if (insidePostPaymentTolerance) {
    setText("t_amount", "SALIDA HABILITADA");
  } else if (insideEntryGraceNow) {
    setText("t_amount", "SALIDA SIN PAGO");
  } else {
    setText("t_amount", formatMoney(montoActual));
  }

  renderTicketQr(currentCardNo);
  renderInlineToleranceCardIfNeeded();
  showTicketView();
}

// ==========================
// Config / token
// ==========================
async function loadStayTime() {
  try {
    const r = await fetch(CONFIG.API_BASE + "/config");
    if (!r.ok) { stayTimeMinutes = 0; return; }
    const txt = await r.text();
    if (!txt || !txt.trim()) { stayTimeMinutes = 0; return; }
    const d = JSON.parse(txt);
    stayTimeMinutes = Number(d.stayTime || d.data?.stayTime || 0);
  } catch (e) {
    stayTimeMinutes = 0;
  }
}

async function getToken() {
  if (token) return;
  const r = await fetch(CONFIG.API_BASE + "/getToken", { method: "POST" });
  const d = await r.json();
  token = d.token || "";
}

// ==========================
// Datos ticket
// ==========================
async function getOnsiteTime(cardNo) {
  await getToken();

  const r = await fetch(CONFIG.API_BASE + "/getOnSiteCar", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ cardNo }),
  });

  const txt = await r.text();
  let d = {};
  try { d = JSON.parse(txt); } catch { d = {}; }

  inTimeEpochMs = 0;
  plateActual = "";

  if (d.code === 0) {
    const p = (d.data?.plate || d.data?.plateNo || d.data?.carPlate || d.data?.plateNumber || "").toString().trim();
    if (p) plateActual = p.toUpperCase();
  }

  if (d.code === 0 && d.data?.inTime) {
    let t = d.data.inTime;
    if (typeof t === "number") {
      inTimeEpochMs = t < 20000000000 ? t * 1000 : t;
    } else {
      const dt = new Date(t);
      if (!isNaN(dt.getTime())) inTimeEpochMs = dt.getTime();
    }

    if (inTimeEpochMs > 0) {
      const diff = Date.now() - inTimeEpochMs;
      const hrs = Math.floor(diff / 3.6e6);
      const mins = Math.floor((diff % 3.6e6) / 6e4);
      return `${hrs}h ${mins}m`;
    }
  }

  return "—";
}

async function fetchPaymentStatus(cardNo) {
  await getToken();

  const r = await fetch(CONFIG.API_BASE + "/ticket/payment-status", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ cardNo }),
  });

  const txt = await r.text();
  let d = {};
  try { d = JSON.parse(txt); } catch { d = {}; }

  if (d.ok && d.code === 0 && d.data) {
    paymentStatusActual = d.data;
    if (!plateActual && d.data?.plate && String(d.data.plate).trim()) {
      plateActual = String(d.data.plate).trim().toUpperCase();
    }
    if (d.data?.stayTimeMinutes !== undefined && d.data?.stayTimeMinutes !== null) {
      stayTimeMinutes = Number(d.data.stayTimeMinutes || 0);
    }
    return d.data;
  }

  return null;
}

async function fetchEntryGrace(cardNo) {
  await getToken();

  const r = await fetch(CONFIG.API_BASE + "/ticket/entry-grace", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ cardNo }),
  });

  const txt = await r.text();
  let d = {};
  try { d = JSON.parse(txt); } catch { d = {}; }

  if (d.ok && d.code === 0 && d.data) {
    entryGraceActual = d.data;
    if (!plateActual && d.data?.plate && String(d.data.plate).trim()) {
      plateActual = String(d.data.plate).trim().toUpperCase();
    }
    return d.data;
  }

  return null;
}

// ==========================
// Estado principal
// ==========================
function buildEstadoPrincipal() {
  const insidePostPaymentTolerance = isInsidePostPaymentTolerance();
  const insideEntryGraceNow = isInsideEntryGrace();

  if (insidePostPaymentTolerance) {
    return `✅ Ticket pagado. Aún tiene ${paymentStatusActual?.graceRemainingMinutes ?? 0} min de tolerancia de salida.`;
  }
  if (insideEntryGraceNow) {
    return `✅ Ticket dentro de tolerancia inicial. Puede salir sin pagar. Le quedan ${entryGraceActual?.remainingMinutes ?? 0} min.`;
  }
  if (typeof montoActual === "number" && montoActual > 0) {
    return `✅ Ticket consultado. Monto pendiente ${formatMoney(montoActual)}.`;
  }
  if (paymentStatusActual?.warning) return paymentStatusActual.warning;
  if (paymentStatusActual?.canRecalculateNow) {
    return "⚠️ Ya venció la tolerancia. Revisa el nuevo monto generado para continuar con el pago.";
  }
  if (entryGraceActual?.expiredEntryGrace) {
    return "✅ La tolerancia inicial ya venció. Se está mostrando el monto actual a pagar.";
  }
  return "✅ Ticket consultado correctamente.";
}

// ==========================
// Consultar ticket
// ==========================
async function consultarTicket() {
  const input = qsi("cardNo");
  const rawInput = (input?.value || "").trim();

  if (!rawInput) { alert("Ingrese un número de ticket"); return; }

  const parsed = parseIncomingTicketPayload(rawInput);
  const cardNo = (parsed.cardNo || "").trim();

  if (!cardNo) { alert("No se pudo identificar el ticket."); return; }

  if (parsed.plate) plateFromQr = parsed.plate;
  if (input) input.value = cardNo;

  if (currentCardNo && currentCardNo !== cardNo) {
    const url = new URL(window.location.href);
    url.searchParams.set("ticket", cardNo);
    if (plateFromQr) url.searchParams.set("plate", plateFromQr);
    window.location.replace(url.toString());
    return;
  }

  currentCardNo = cardNo;

  promoCodeActual = "";
  promoNameActual = "";
  descuentoAplicado = 0;
  invoiceQrCodeActual = "";
  paymentStatusActual = null;
  entryGraceActual = null;
  clearPendingPaymentProcess();
  clearInlineToleranceHost();
  setTicketNormalMode(true);
  setActionVisibility(true);

  setMsg("Consultando…");
  await getToken();

  const t = await getOnsiteTime(cardNo);
  estanciaActual = t || "—";

  if (!plateActual && plateFromQr) plateActual = plateFromQr;

  const r = await fetch(CONFIG.API_BASE + "/charge", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ cardNo }),
  });

  const txt = await r.text();
  let d = {};
  try { d = JSON.parse(txt); } catch { d = {}; }

  if (!(d && (d.code === 0 || d.success === true))) {
    montoActual = 0;
    montoPagado = 0;
    setMsg(d.msg || d.message || "Error consultando monto");
    return;
  }

  montoActual = Number(d.data?.needAmount ?? 0);
  montoPagado = montoActual;

  if (d.ticket?.plate && String(d.ticket.plate).trim()) {
    plateActual = String(d.ticket.plate).trim().toUpperCase();
  }

  if (!plateActual && plateFromQr) plateActual = plateFromQr;

  if (d.paymentStatus) {
    paymentStatusActual = d.paymentStatus;
    if (d.paymentStatus?.stayTimeMinutes !== undefined && d.paymentStatus?.stayTimeMinutes !== null) {
      stayTimeMinutes = Number(d.paymentStatus.stayTimeMinutes || 0);
    }
    if (!plateActual && d.paymentStatus?.plate && String(d.paymentStatus.plate).trim()) {
      plateActual = String(d.paymentStatus.plate).trim().toUpperCase();
    }
  } else {
    await fetchPaymentStatus(cardNo);
  }

  if (d.entryGrace && typeof d.entryGrace.insideEntryGrace !== "undefined") {
    entryGraceActual = d.entryGrace;
    if (!plateActual && d.entryGrace?.plate && String(d.entryGrace.plate).trim()) {
      plateActual = String(d.entryGrace.plate).trim().toUpperCase();
    }
  } else {
    await fetchEntryGrace(cardNo);
  }

  if (!plateActual && plateFromQr) plateActual = plateFromQr;

  const insidePostPaymentTolerance = isInsidePostPaymentTolerance();
  const insideEntryGraceNow = isInsideEntryGrace();

  if (insidePostPaymentTolerance || insideEntryGraceNow) montoPagado = 0;

  setMsg(buildEstadoPrincipal());
  payInfo = createDefaultPayInfo();

  if (isExpiredPostPaymentTolerance()) await showGraceExpiredModalIfNeeded();

  renderTicketUI();
}

// ==========================
// Preparar modal CPE y cobro
// ==========================
async function pagarYModal() {
  if (!currentCardNo) {
    if (window.Swal) Swal.fire({ icon: "warning", title: "Atención", text: "Debes consultar un ticket primero." });
    else alert("Debes consultar un ticket primero.");
    return;
  }

  if (isInsidePostPaymentTolerance()) {
    const msg = "Este ticket ya fue pagado y aún está dentro del tiempo de tolerancia de salida. No corresponde un nuevo cobro.";
    if (window.Swal) Swal.fire({ icon: "info", title: "Dentro de tolerancia", text: msg });
    else alert(msg);
    return;
  }

  if (isInsideEntryGrace()) {
    const msg = "Este ticket aún está dentro del tiempo de tolerancia inicial. Puede salir sin pagar.";
    if (window.Swal) Swal.fire({ icon: "info", title: "Dentro de tolerancia inicial", text: msg });
    else alert(msg);
    return;
  }

  if (montoActual <= 0) {
    let extraText = "El monto a pagar es 0 o no se ha calculado.";
    if (paymentStatusActual?.canRecalculateNow) {
      extraText = "La tolerancia ya venció, pero el sistema local todavía no devuelve un nuevo monto.";
    }
    if (window.Swal) Swal.fire({ icon: "info", title: "Monto no disponible", text: extraText });
    else alert(extraText);
    return;
  }

  const mp = qsi("montoPagado");
  if (mp) mp.value = round2(montoActual).toFixed(2);

  const btnEmitir = qsi("btnEmitir");
  if (btnEmitir) btnEmitir.textContent = "Continuar al pago";

  pendingCpePayload = null;
  izipayEnProceso = false;
  abrirModal();
}

async function buildComprobantePayloadFromModal() {
  const tipo = qs("input[name='tipo']:checked")?.value || "boleta";
  const boletaModo = getBoletaModoSeleccionado();

  const rucEl = qsi("nroDoc");
  const dniEl = qsi("dniDoc");
  const nomBoletaEl = qsi("nombreManual");
  const nomFacturaEl = qsi("nombreManualFactura");
  const montoEl = qsi("montoPagado");

  const correo = getCorreo();
  if (!correo) throw new Error("El correo es obligatorio.");
  if (!isValidEmail(correo)) throw new Error("Correo inválido.");
  guardarCorreo();

  let monto = parseFloat(montoEl?.value || "0");
  if (monto <= 0 && montoActual > 0) monto = round2(montoActual);
  monto = round2(monto);
  if (monto <= 0) throw new Error("Monto debe ser mayor a 0");

  let nombre = CONFIG.DEFAULT_CUSTOMER_NAME;
  let tipoDocCli = "1";
  let numeroDocumento = CONFIG.DEFAULT_DOCS.DNI;
  let direccion = "";

  if (tipo === "factura") {
    const ruc = (rucEl?.value || "").trim();
    const razonSocial = (nomFacturaEl?.value || "").trim();
    if (ruc.length !== 11) throw new Error("RUC debe tener 11 dígitos");
    if (!razonSocial || razonSocial === "Consultando…") throw new Error("Debes validar un RUC correcto antes de continuar");
    nombre = razonSocial.replace(/\s+/g, " ");
    tipoDocCli = "6";
    numeroDocumento = ruc;
    operatorNameFront = nombre || CONFIG.DEFAULT_OPERATOR_NAME;
  } else {
    if (boletaModo === "sin_dni") {
      numeroDocumento = CONFIG.DEFAULT_DOCS.DNI;
      nombre = CONFIG.DEFAULT_CUSTOMER_NAME;
      tipoDocCli = "1";
      operatorNameFront = CONFIG.DEFAULT_OPERATOR_NAME;
    } else {
      const dni = (dniEl?.value || "").trim();
      if (dni.length !== 8) throw new Error("El DNI debe tener 8 dígitos.");

      let nombreDetectado = (nomBoletaEl?.value || "").trim();
      if (!nombreDetectado || nombreDetectado === "Consultando…") {
        try {
          const r = await fetch(`${CONFIG.FACT_API}?action=consulta&tipo=dni&numero=${encodeURIComponent(dni)}`);
          const txt = await r.text();
          const d = JSON.parse(txt || "{}");
          nombreDetectado = d.nombreCompleto || d.nombre || d.razonSocial || d.data?.nombreCompleto || d.data?.nombre || d.data?.razonSocial || "";
        } catch { nombreDetectado = ""; }
      }

      if (!nombreDetectado) throw new Error("DNI no encontrado o inválido.");
      nombre = nombreDetectado.trim();
      numeroDocumento = dni;
      tipoDocCli = "1";
      if (nomBoletaEl) nomBoletaEl.value = nombre;
      operatorNameFront = extractFirstName(nombre);
    }
  }

  const base = round2(monto / 1.18);
  const igv = round2(monto - base);

  return {
    tipo,
    cardNo: (currentCardNo || "").trim(),
    plate: (plateActual || "").toString().trim().toUpperCase(),
    ingreso: inTimeEpochMs ? Math.floor(inTimeEpochMs / 1000) : 0,
    estancia: (estanciaActual || "—").toString(),
    buyerEmail: correo,
    cliente: {
      tipoDocumento: tipoDocCli,
      numeroDocumento,
      razonSocial: nombre,
      direccion,
      email: correo,
    },
    totales: { total: monto, gravada: base, igv },
    detalle: [
      {
        codigo: "-",
        descripcion: CONFIG.DEFAULT_SERVICE_DESCRIPTION,
        cantidad: 1,
        precioUnitario: monto,
        importe: monto,
        codigoUnidadMedida: "ZZ",
      },
    ],
    operatorName: operatorNameFront || CONFIG.DEFAULT_OPERATOR_NAME,
    payInfo: { ...createDefaultPayInfo(), amount: round2(monto).toFixed(2) },
  };
}

async function iniciarCobroIzipayConPayload(payload) {
  try {
    const amount = round2(payload?.totales?.total || 0);
    if (amount <= 0) throw new Error("Monto inválido para Izipay.");

    const resp = await fetch(CONFIG.IZIPAY_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amount.toFixed(2) }),
    });

    const izTxt = await resp.text();
    let iz = {};
    try { iz = JSON.parse(izTxt || "{}"); } catch { iz = {}; }

    if (!iz.authorization || !iz.transactionId) throw new Error("No se pudo obtener credenciales de pago.");

    if (typeof window.Izipay !== "function") throw new Error("Izipay SDK no cargó. Revisa el <script> del SDK.");

    const billing = buildIzipayBillingFromPayload(payload);
    const nowMillis = Date.now();

    const config = {
      transactionId: iz.transactionId,
      action: "pay",
      merchantCode: CONFIG.MERCHANT_CODE,
      order: {
        orderNumber: iz.orderNumber,
        currency: CONFIG.DEFAULT_CURRENCY,
        amount: amount.toFixed(2),
        processType: "AT",
        merchantBuyerId: "ticket_" + currentCardNo,
        dateTimeTransaction: String(nowMillis) + "000",
      },
      billing,
      render: { typeForm: "pop-up", showButtonProcessForm: true },
    };

    const checkout = new Izipay({ config });

    checkout.LoadForm({
      authorization: iz.authorization,
      keyRSA: iz.keyRSA,

      callbackResponse: async (res) => {
        if (String(res?.code || "") === "00") {
          try {
            const brandRaw = getBrandFromRes(res);
            const maskedRaw = getMaskedPanFromRes(res);

            payInfo.brand = (brandRaw || "VISA_ONLINE").toString().trim();
            payInfo.maskedPan = (maskedRaw || "").toString().trim();
            payInfo.currency = CONFIG.DEFAULT_CURRENCY;
            payInfo.caja = CONFIG.DEFAULT_CAJA;
            payInfo.amount = amount.toFixed(2);
            payInfo.orderNumber = (iz.orderNumber || "").toString();
            payInfo.transactionId = (iz.transactionId || "").toString();

            payload.payInfo = {
              brand: payInfo.brand,
              maskedPan: payInfo.maskedPan,
              currency: CONFIG.DEFAULT_CURRENCY,
              caja: CONFIG.DEFAULT_CAJA,
              amount: amount.toFixed(2),
              orderNumber: payInfo.orderNumber,
              transactionId: payInfo.transactionId,
            };

            const okPago = await pagar(amount);
            if (!okPago) { clearPendingPaymentProcess(); return; }

            const d = await emitirPayloadDirecto(payload);
            if (!d.ok) {
              clearPendingPaymentProcess();
              if (window.Swal) {
                Swal.fire({ icon: "warning", title: "Pago registrado", text: d.message || d.msg || "El pago fue exitoso, pero no se pudo emitir el comprobante." });
              } else {
                alert(d.message || d.msg || "El pago fue exitoso, pero no se pudo emitir el comprobante.");
              }
              await fetchPaymentStatus(currentCardNo);
              renderTicketUI();
              return;
            }

            clearPendingPaymentProcess();
            cerrarModal(false);
            await fetchPaymentStatus(currentCardNo);
            renderTicketUI();
            onPagoYCpeEmitidoOK(d, payload);
          } catch (e) {
            clearPendingPaymentProcess();
            if (window.Swal) Swal.fire({ icon: "error", title: "Error después del pago", text: e?.message || "Ocurrió un error luego de aprobar el pago." });
            else alert(e?.message || "Ocurrió un error luego de aprobar el pago.");
          }
        } else {
          clearPendingPaymentProcess();
          cerrarModal(false);
          if (window.Swal) Swal.fire({ icon: "error", title: "Pago no aprobado", text: res?.messageUser || res?.message || "La transacción fue rechazada o cancelada." });
          else alert("Pago no aprobado o cancelado.");
        }
      },
    });
  } catch (err) {
    clearPendingPaymentProcess();
    if (window.Swal) Swal.fire({ icon: "error", title: "Error inesperado", text: err.message || "Ocurrió un error al intentar procesar el pago." });
    else alert(err.message || "Error inesperado.");
  }
}

function onPagoYCpeEmitidoOK(d, payload) {
  const correo = (payload?.buyerEmail || "").trim();
  const nombre = payload?.cliente?.razonSocial || CONFIG.DEFAULT_CUSTOMER_NAME;
  const tipo = (payload?.tipo || "boleta").toUpperCase();

  const cpeMsg = correo
    ? `El comprobante también será enviado a ${correo}.`
    : `Si ingresaste un correo, el comprobante te llegará en unos minutos.`;

  if (window.Swal) {
    Swal.fire({
      icon: "success",
      title: "Pago completado exitosamente",
      html:
        `✅ Gracias por su pago.<br>` +
        `${tipo} <strong>${escapeHtml(d.serie)}-${escapeHtml(d.correlativo)}</strong>` +
        `<br>Cliente: <strong>${escapeHtml(nombre)}</strong>` +
        `<br>Placa: <strong>${escapeHtml(payload?.plate || "—")}</strong>` +
        `<br>Estadía: <strong>${escapeHtml(payload?.estancia || "—")}</strong>`,
      footer: `<small>${escapeHtml(cpeMsg)}</small>`,
      confirmButtonText: "Ver PDF",
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(async () => {
      toggleTipo();
      try {
        const url = new URL(window.location.href);
        if (currentCardNo) {
          url.searchParams.set("ticket", currentCardNo);
          if (plateActual || plateFromQr) url.searchParams.set("plate", plateActual || plateFromQr);
          window.history.replaceState({}, "", url.toString());
        }
      } catch {}
      await fetchPaymentStatus(currentCardNo);
      setMsg(buildEstadoPrincipal());
      renderTicketUI();
      if (d.url_pdf) window.open(d.url_pdf, "_blank", "noopener,noreferrer");
    });
  } else {
    alert(`Emitido: ${d.serie}-${d.correlativo}`);
    toggleTipo();
    try {
      const url = new URL(window.location.href);
      if (currentCardNo) {
        url.searchParams.set("ticket", currentCardNo);
        if (plateActual || plateFromQr) url.searchParams.set("plate", plateActual || plateFromQr);
        window.history.replaceState({}, "", url.toString());
      }
    } catch {}
    fetchPaymentStatus(currentCardNo).then(() => { setMsg(buildEstadoPrincipal()); renderTicketUI(); });
    if (d.url_pdf) window.open(d.url_pdf, "_blank", "noopener,noreferrer");
  }
}

// ==========================
// Registrar pago local
// ==========================
async function pagar(amountOverride = null) {
  await getToken();

  const amountToSend = amountOverride !== null ? round2(amountOverride) : round2(montoActual);

  const r = await fetch(CONFIG.API_BASE + "/updatePaymentStatus", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({
      cardNo: currentCardNo,
      plate: plateActual || "",
      payTime: Math.floor(Date.now() / 1000),
      amount: amountToSend,
      deleteOnsiteCar: 0,
      promoCode: promoCodeActual,
      promoName: promoNameActual,
      discountValue: round2(descuentoAplicado),
      payChannel: CONFIG.PAYMENT_CHANNEL_IZIPAY,
      merchantCode: CONFIG.MERCHANT_CODE,
      orderNumber: (payInfo.orderNumber || "").toString().trim(),
      transactionId: (payInfo.transactionId || "").toString().trim(),
      invoiceQrCode: (invoiceQrCodeActual || "").trim(),
    }),
  });

  const txt = await r.text();
  let d = {};
  try { d = JSON.parse(txt); } catch { d = {}; }

  if (d.success || d.code === 0) {
    montoPagado = amountToSend;
    montoActual = 0;
    await fetchPaymentStatus(currentCardNo);
    setMsg(buildEstadoPrincipal());
    renderTicketUI();
    return true;
  }

  if (window.Swal) Swal.fire({ icon: "error", title: "Error al registrar pago", text: d.message || d.msg || "Fallo inesperado" });
  else alert("Error al pagar: " + (d.message || d.msg || "Fallo inesperado"));
  return false;
}

// ==========================
// Modal / Scanner
// ==========================
function abrirModal() {
  const m = qsi("modal");
  if (m) m.style.display = "flex";
  cargarCorreo();
  const btnEmitir = qsi("btnEmitir");
  if (btnEmitir) { btnEmitir.textContent = "Continuar al pago"; disable(btnEmitir, false); }
  toggleTipo();
}

function cerrarModal(clearProcess = true) {
  const m = qsi("modal");
  if (m) m.style.display = "none";
  const btnEmitir = qsi("btnEmitir");
  if (btnEmitir) { btnEmitir.textContent = "Continuar al pago"; disable(btnEmitir, false); }
  if (clearProcess) clearPendingPaymentProcess();
}

async function startCam(video) {
  mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
  video.srcObject = mediaStream;
  await video.play();
}

function stopCam() {
  mediaStream?.getTracks().forEach((t) => t.stop());
  mediaStream = null;
}

function cerrarScanner() {
  stopCam();
  const w = qsi("scanner-wrapper");
  if (w) w.style.display = "none";
}

// ==========================
// Validar CPE
// ==========================
async function validarCPE() {
  if (!currentCardNo) return alert("Primero consulta un ticket");

  const cpeKey = `cpe_aplicado_${currentCardNo}`;
  const cpeGuardado = sessionStorage.getItem(cpeKey);
  if (cpeGuardado || descuentoAplicado > 0) {
    alert("Ya se aplicó un descuento a este ticket. Solo 1 descuento por ticket.");
    return;
  }

  const wrap = qsi("scanner-wrapper");
  if (wrap) wrap.style.display = "flex";
  setMsg("Escanea el QR del CPE…");

  const video = qsi("scanner");
  if (!video) return alert("No existe #scanner en el HTML.");

  if (!window.ZXing?.BrowserQRCodeReader) {
    alert("ZXing no cargó. Revisa el <script> de ZXing.");
    cerrarScanner();
    return;
  }

  const reader = new ZXing.BrowserQRCodeReader();

  try {
    await startCam(video);
    const result = await reader.decodeOnceFromVideoDevice(undefined, video);
    const qrText = result.text.trim();

    await getToken();

    const r = await fetch(CONFIG.API_BASE + "/cpe/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ cardNo: currentCardNo, qrText }),
    });

    const txt = await r.text();
    let d = {};
    try { d = JSON.parse(txt); } catch { d = {}; }

    if (d.code !== 0) {
      const msg = d.msg || "No se pudo validar el CPE.";
      if (window.Swal) Swal.fire({ icon: "warning", title: "CPE", text: msg });
      else alert(msg);
      return;
    }

    const info = d.data || {};
    promoCodeActual = (info.promoCode || "").toString().trim();
    promoNameActual = (info.promoName || "").toString().trim();
    descuentoAplicado = round2(Number(info.val || 0));
    invoiceQrCodeActual = (info.invoiceQrCode || "").toString().trim();

    sessionStorage.setItem(cpeKey, JSON.stringify({ qrText, val: descuentoAplicado, promoName: promoNameActual, ts: Date.now() }));

    if (descuentoAplicado >= montoActual) {
      montoPagado = 0;
      montoActual = 0;
      setMsg(`✅ CPE validado: descuento total S/ ${round2(descuentoAplicado)}`);
      payInfo = { ...createDefaultPayInfo(), brand: CONFIG.DISCOUNT_BRAND_NAME, amount: "0.00" };
      const okPago = await pagar(0);
      if (okPago) { sessionStorage.removeItem(cpeKey); await fetchPaymentStatus(currentCardNo); renderTicketUI(); }
      return;
    }

    montoActual = round2(montoActual - descuentoAplicado);
    renderTicketUI();
    setMsg(`✅ CPE validado (${info.serie}-${info.correlativo}) - descuento S/ ${round2(descuentoAplicado)}`);

    if (window.Swal) {
      Swal.fire({
        icon: "success",
        title: "CPE validado",
        html: `<b>${escapeHtml(info.serie)}-${escapeHtml(info.correlativo)}</b><br>Descuento: <b>S/ ${round2(descuentoAplicado).toFixed(2)}</b><br>Saldo: <b>S/ ${round2(montoActual).toFixed(2)}</b>`,
      });
    }
  } catch (err) {
    alert("No se pudo escanear el QR: " + err.message);
  } finally {
    reader.reset();
    cerrarScanner();
  }
}

// ==========================
// UI tipo comprobante
// ==========================
function toggleTipo() {
  const esFactura = qs("input[name='tipo'][value='factura']")?.checked || false;
  const boletaModo = getBoletaModoSeleccionado();

  const boletaFields = qsi("boletaFields");
  const facturaFields = qsi("facturaFields");
  const boletaModoWrap = qsi("boletaModoWrap");
  const dniBlock = qsi("dniBlock");
  const nombreBlock = qsi("nombreBlock");
  const dniEl = qsi("dniDoc");
  const rucEl = qsi("nroDoc");
  const nomBoletaEl = qsi("nombreManual");
  const nomFacturaEl = qsi("nombreManualFactura");
  const rucMsgEl = qsi("rucMsg");

  if (rucMsgEl) { rucMsgEl.textContent = ""; rucMsgEl.style.display = "none"; }

  if (esFactura) {
    if (boletaFields) boletaFields.classList.add("oculto");
    if (facturaFields) facturaFields.classList.remove("oculto");
    if (boletaModoWrap) boletaModoWrap.style.display = "none";
    if (dniBlock) dniBlock.classList.add("oculto");
    if (nombreBlock) nombreBlock.classList.add("oculto");
    if (dniEl) dniEl.value = "";
    if (nomBoletaEl) { nomBoletaEl.value = CONFIG.DEFAULT_CUSTOMER_NAME; nomBoletaEl.placeholder = "CLIENTE GENERAL"; }
    if (rucEl && !rucEl.value) rucEl.value = "";
    if (nomFacturaEl) {
      if (!nomFacturaEl.value || nomFacturaEl.value === CONFIG.DEFAULT_CUSTOMER_NAME) nomFacturaEl.value = "";
      nomFacturaEl.placeholder = "Razón social";
    }
    operatorNameFront = CONFIG.DEFAULT_OPERATOR_NAME;
    if (!getCorreo()) cargarCorreo();
    return;
  }

  if (boletaFields) boletaFields.classList.remove("oculto");
  if (facturaFields) facturaFields.classList.add("oculto");
  if (boletaModoWrap) boletaModoWrap.style.display = "flex";

  if (boletaModo === "sin_dni") {
    if (dniBlock) dniBlock.classList.add("oculto");
    if (nombreBlock) nombreBlock.classList.add("oculto");
    if (dniEl) dniEl.value = "";
    if (nomBoletaEl) { nomBoletaEl.value = CONFIG.DEFAULT_CUSTOMER_NAME; nomBoletaEl.placeholder = "CLIENTE GENERAL"; }
    operatorNameFront = CONFIG.DEFAULT_OPERATOR_NAME;
  } else {
    if (dniBlock) dniBlock.classList.remove("oculto");
    if (nombreBlock) nombreBlock.classList.remove("oculto");
    if (nomBoletaEl && (!nomBoletaEl.value || nomBoletaEl.value === CONFIG.DEFAULT_CUSTOMER_NAME)) {
      nomBoletaEl.value = "";
      nomBoletaEl.placeholder = "Nombres / Razón social";
    }
  }

  if (!getCorreo()) cargarCorreo();
}

// ==========================
// Buscar RUC
// ==========================
async function buscarRuc() {
  const ruc = (qsi("nroDoc")?.value || "").trim();
  const nomEl = qsi("nombreManualFactura");
  const rucMsgEl = qsi("rucMsg");
  if (!nomEl) return;

  if (ruc.length !== 11) {
    nomEl.value = "";
    if (rucMsgEl) { rucMsgEl.style.display = "none"; rucMsgEl.textContent = ""; }
    return;
  }

  nomEl.value = "Consultando…";
  if (rucMsgEl) { rucMsgEl.style.display = "none"; rucMsgEl.textContent = ""; }

  try {
    const r = await fetch(`${CONFIG.FACT_API}?action=consulta&tipo=ruc&numero=${encodeURIComponent(ruc)}`);
    const txt = await r.text();
    const d = JSON.parse(txt || "{}");
    if (d.ok && d.razonSocial) {
      nomEl.value = d.razonSocial;
      operatorNameFront = d.razonSocial;
    } else {
      nomEl.value = "";
      if (rucMsgEl) { rucMsgEl.textContent = d.message || "RUC no encontrado"; rucMsgEl.style.display = "block"; }
      operatorNameFront = CONFIG.DEFAULT_OPERATOR_NAME;
    }
  } catch {
    nomEl.value = "";
    if (rucMsgEl) { rucMsgEl.textContent = "Error al consultar RUC"; rucMsgEl.style.display = "block"; }
    operatorNameFront = CONFIG.DEFAULT_OPERATOR_NAME;
  }
}

// ==========================
// Buscar DNI
// ==========================
async function buscarDni() {
  const boletaModo = getBoletaModoSeleccionado();
  if (boletaModo !== "con_dni") return;

  const dniEl = qsi("dniDoc");
  if (!dniEl) return;
  const dni = dniEl.value.trim();
  const nomEl = qsi("nombreManual");
  if (!nomEl) return;

  if (!dni || dni.length !== 8) { nomEl.value = ""; operatorNameFront = CONFIG.DEFAULT_OPERATOR_NAME; return; }

  nomEl.value = "Consultando…";

  try {
    const r = await fetch(`${CONFIG.FACT_API}?action=consulta&tipo=dni&numero=${encodeURIComponent(dni)}`);
    const txt = await r.text();
    let d = {};
    try { d = JSON.parse(txt || "{}"); } catch { d = {}; }

    const nombreDetectado = d.nombreCompleto || d.nombre || d.razonSocial || d.data?.nombreCompleto || d.data?.nombre || d.data?.razonSocial || "";

    if (d.ok && nombreDetectado) {
      nomEl.value = nombreDetectado;
      operatorNameFront = extractFirstName(nombreDetectado);
    } else {
      nomEl.value = "";
      operatorNameFront = CONFIG.DEFAULT_OPERATOR_NAME;
    }
  } catch {
    nomEl.value = "";
    operatorNameFront = CONFIG.DEFAULT_OPERATOR_NAME;
  }
}

// ==========================
// Confirmar datos y cobrar con Izipay
// ==========================
async function emitirComprobante() {
  if (emitiendo || izipayEnProceso) return;

  const btnEmitir = qsi("btnEmitir");
  disable(btnEmitir, true);
  emitiendo = true;

  try {
    const payload = await buildComprobantePayloadFromModal();
    pendingCpePayload = payload;
    izipayEnProceso = true;
    cerrarModal(false);
    await iniciarCobroIzipayConPayload(payload);
  } catch (e) {
    if (window.Swal) Swal.fire({ icon: "error", title: "Datos incompletos", text: e?.message || "Verifica los datos del comprobante." });
    else alert(e?.message || "Verifica los datos del comprobante.");
  } finally {
    emitiendo = false;
    disable(btnEmitir, false);
  }
}

// ==========================
// Emitir comprobante directo
// ==========================
async function emitirPayloadDirecto(payload) {
  const response = await fetch(`${CONFIG.FACT_API}?action=emitir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const txt = await response.text();
  let d = {};
  try { d = JSON.parse(txt || "{}"); } catch { d = {}; }
  return d;
}

// ==========================
// Buscar CPE
// ==========================
async function buscarCPE({ ticket = "", plate = "", doc = "", from = "", to = "" } = {}) {
  ticket = (ticket || "").trim();
  plate  = (plate  || "").trim();
  doc    = (doc    || "").trim();
  from   = (from   || "").trim();
  to     = (to     || "").trim();

  const filled = [ticket, plate, doc].filter((x) => x).length;
  if (filled === 0) { alert("Ingresa 1 criterio: ticket o placa o DNI/RUC."); return; }
  if (filled > 1)   { alert("Solo se permite 1 criterio a la vez: ticket o placa o DNI/RUC."); return; }

  const params = new URLSearchParams();
  params.set("action", "cpe_buscar");
  if (ticket) params.set("ticket", ticket);
  if (plate)  params.set("plate",  plate);
  if (doc)    params.set("doc",    doc);
  if (from)   params.set("from",   from);
  if (to)     params.set("to",     to);

  try {
    const r = await fetch(`${CONFIG.FACT_API}?${params.toString()}`, { method: "GET" });
    const txt = await r.text();
    let d = {};
    try { d = JSON.parse(txt || "{}"); } catch { d = {}; }

    if (!d.ok) {
      const msg = d.message || "No se pudo buscar CPE.";
      if (window.Swal) Swal.fire({ icon: "error", title: "Búsqueda CPE", text: msg });
      else alert(msg);
      return;
    }

    const rows = Array.isArray(d.data) ? d.data : [];
    if (rows.length === 0) {
      if (window.Swal) Swal.fire({ icon: "info", title: "Búsqueda CPE", text: "No se encontraron resultados." });
      else alert("No se encontraron resultados.");
      return;
    }

    if (window.Swal) {
      const html = rows.slice(0, 20).map((x) => {
        const tipo   = (x.tipo || "").toUpperCase();
        const serie  = x.serie || "";
        const corr   = x.correlativo || "";
        const cliente = x.cliente || "";
        const total  = typeof x.total === "number" ? x.total.toFixed(2) : x.total || "";
        const docNum = x.docNumero || "";
        const ticketRow = x.ticket || "";
        const plateRow  = x.plate  || "";
        const urlPdf = x.url_pdf ? (x.url_pdf.startsWith("http") ? x.url_pdf : "https://val.parkinventario.com" + x.url_pdf) : "";
        const storedAt = x.storedAt ? new Date(x.storedAt * 1000).toLocaleString("es-PE") : "";
        return `
          <div style="text-align:left;padding:10px 0;border-bottom:1px solid #eee;">
            <div><b>${escapeHtml(tipo)}</b> ${escapeHtml(serie)}-${escapeHtml(corr)} &nbsp; <span style="color:#666">S/ ${escapeHtml(total)}</span></div>
            <div style="color:#444">Cliente: <b>${escapeHtml(cliente)}</b></div>
            <div style="color:#666;font-size:12px;">Ticket: ${escapeHtml(ticketRow)} · Placa: ${escapeHtml(plateRow)} · Doc: ${escapeHtml(docNum)} · ${escapeHtml(storedAt)}</div>
            ${urlPdf ? `<div style="margin-top:6px;"><a href="${urlPdf}" target="_blank" rel="noopener">Ver PDF</a></div>` : ""}
          </div>`;
      }).join("");
      Swal.fire({ icon: "success", title: `CPE encontrados: ${rows.length}`, html: `<div style="max-height:420px;overflow:auto;">${html}</div>`, width: 700, confirmButtonText: "Cerrar" });
    } else {
      console.log("CPE resultados:", rows);
      alert(`Encontrados: ${rows.length} (ver consola)`);
    }
  } catch (e) {
    const msg = e?.message || "Error buscando CPE.";
    if (window.Swal) Swal.fire({ icon: "error", title: "Búsqueda CPE", text: msg });
    else alert(msg);
  }
}

// ==========================
// Limpiar
// ==========================
function limpiarFormulario() {
  const cardEl = qsi("cardNo");
  if (cardEl) cardEl.value = "";

  setMsg("Ingrese su ticket para calcular el monto");

  currentCardNo = "";
  montoActual = 0;
  montoPagado = 0;
  promoCodeActual = "";
  promoNameActual = "";
  descuentoAplicado = 0;
  invoiceQrCodeActual = "";
  estanciaActual = "—";
  inTimeEpochMs = 0;
  plateActual = "";
  plateFromQr = "";
  paymentStatusActual = null;
  entryGraceActual = null;
  toleranceModalShownForCard = "";

  payInfo = createDefaultPayInfo();

  const nroEl     = qsi("nroDoc");
  const dniEl     = qsi("dniDoc");
  const nomBoletaEl   = qsi("nombreManual");
  const nomFacturaEl  = qsi("nombreManualFactura");

  if (nroEl) nroEl.value = "";
  if (dniEl) dniEl.value = "";
  if (nomBoletaEl)  nomBoletaEl.value  = CONFIG.DEFAULT_CUSTOMER_NAME;
  if (nomFacturaEl) nomFacturaEl.value = "";

  setTicketNormalMode(true);
  clearInlineToleranceHost();
  setActionVisibility(true);

  cargarCorreo();
  operatorNameFront = CONFIG.DEFAULT_OPERATOR_NAME;
  clearPendingPaymentProcess();
  showFormView();
}

// ==========================
// Init
// ==========================
window.addEventListener("DOMContentLoaded", async () => {
  toggleTipo();

  document.querySelectorAll(".tipo-caption").forEach((el) => {
    el.style.display = "none";
  });

  document.querySelectorAll("input[name='boletaModo']").forEach((el) =>
    el.addEventListener("change", toggleTipo)
  );

  cargarCorreo();
  await loadStayTime();

  const params = new URLSearchParams(window.location.search);
  const rawTicketParam = (params.get("ticket") || params.get("cardNo") || "").trim();
  const rawPlateParam  = (params.get("plate") || "").trim().toUpperCase();
  const parsed = parseIncomingTicketPayload(rawTicketParam);

  if (rawPlateParam)    plateFromQr = rawPlateParam;
  else if (parsed.plate) plateFromQr = parsed.plate;

  const autoTicket = (parsed.cardNo || "").trim();

  if (autoTicket) {
    const input = qsi("cardNo");
    if (input) { input.value = autoTicket; setMsg("Consultando ticket…"); consultarTicket(); }
  } else {
    showFormView();
  }
});

// ==========================
// Exponer funciones globales
// ==========================
window.consultarTicket  = consultarTicket;
window.pagarYModal      = pagarYModal;
window.validarCPE       = validarCPE;
window.emitirComprobante = emitirComprobante;
window.toggleTipo       = toggleTipo;
window.buscarRuc        = buscarRuc;
window.buscarDni        = buscarDni;
window.cerrarScanner    = cerrarScanner;
window.abrirModal       = abrirModal;
window.cerrarModal      = cerrarModal;
window.guardarCorreo    = guardarCorreo;
window.cargarCorreo     = cargarCorreo;
window.buscarCPE        = buscarCPE;
window.volverAConsulta  = volverAConsulta;
window.limpiarFormulario = limpiarFormulario;

if (typeof validarVoucher === "function") {
  window.validarVoucher = validarVoucher;
}