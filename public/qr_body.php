<!-- Inter Google Font -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">

<!-- Estilos base -->
<link rel="stylesheet" href="/public/css/estilos.css?v=20260227-3" />

<!-- Izipay SDK -->
<script src="https://sandbox-checkout.izipay.pe/payments/v1/js/index.js" defer></script>

<!-- Config global para app.js -->
<script>
  window.FACT_API_URL = "https://val.parkinventario.com/facturacion/fact_api.php";
</script>

<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }

  body {
    font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: radial-gradient(circle at top, #fef9c3 0, #f9fafb 38%, #e5e7eb 100%);
    color: #111827;
  }

  .page {
    min-height: 100vh;
    max-width: 480px;
    margin: 0 auto;
    padding: 8px 14px 12px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
  }

  .card {
    background: #ffffff;
    border-radius: 28px;
    padding: 22px 18px 20px;
    box-shadow: 0 20px 48px rgba(15, 23, 42, 0.14);
  }

  .main-card {
    margin-top: 6px;
  }

  .form-card {
    text-align: center;
    position: relative;
    overflow: hidden;
    border: 1px solid #eceff3;
  }

  .form-card::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 6px;
    background: linear-gradient(90deg, #facc15, #f59e0b, #01224a);
  }

  .ticket-brand-mini {
    display: flex;
    justify-content: center;
    margin-bottom: 8px;
  }

  .form-brand {
    margin-top: 2px;
    margin-bottom: 10px;
  }

  .ticket-mini-logo {
    width: 150px;
    max-width: 70%;
    height: auto;
    object-fit: contain;
    display: block;
  }

  .t-sub {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .12em;
    color: #9ca3af;
    margin-bottom: 1px;
  }

  .field-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 8px;
  }

  .field-label.small-label {
    font-size: 12px;
  }

  .centered-label {
    text-align: center;
  }

  .input-box {
    width: 100%;
    padding: 12px 16px;
    border-radius: 999px;
    border: 1px solid #e5e7eb;
    font-size: 15px;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease;
    margin-bottom: 12px;
    background-color: #f9fafb;
  }

  .input-box-large {
    padding: 16px 18px;
    font-size: 18px;
    font-weight: 700;
    text-align: center;
    background: #f8fafc;
    border: 1px solid #dbe3ec;
  }

  .input-box:focus {
    border-color: #fbbf24;
    box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.18);
    background-color: #ffffff;
    transform: translateY(-1px);
  }

  .btn {
    width: 100%;
    border-radius: 999px;
    border: none;
    font-size: 15px;
    font-weight: 700;
    padding: 12px 16px;
    cursor: pointer;
    transition: transform 0.06s ease, box-shadow 0.12s ease, background-color 0.12s ease, color 0.12s ease;
  }

  .btn:active {
    transform: scale(0.98);
  }

  .btn-main {
    background: linear-gradient(90deg, #facc15, #fbbf24);
    color: #111827;
    box-shadow: 0 12px 28px rgba(245, 158, 11, 0.28);
    margin-top: 2px;
    margin-bottom: 12px;
  }

  .btn-main:hover {
    background: linear-gradient(90deg, #fbbf24, #f59e0b);
  }

  .btn-voucher {
    background: #fff7d9;
    color: #a35a00;
    border: 2px solid #f3b51d;
    box-shadow: 0 10px 25px rgba(243, 181, 29, 0.14);
  }

  .btn-voucher:hover {
    background: #fde68a;
  }

  .btn-pago {
    background: #01224a;
    color: #ffffff;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.32);
  }

  .btn-pago:hover {
    background: #001633;
  }

  .btn-light {
    background: #f3f4f6;
    color: #111827;
    border: 1px solid #e5e7eb;
    box-shadow: none;
  }

  .btn-light:hover {
    background: #e5e7eb;
  }

  .btn-primary {
    border-radius: 999px;
    padding-inline: 18px;
  }

  .btn-big {
    min-height: 58px;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .btn-emphasis {
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .msg {
    font-size: 13px;
    text-align: center;
    margin-bottom: 12px;
  }

  .msg-muted {
    color: #6b7280;
  }

  .msg-centered {
    margin-top: 2px;
    margin-bottom: 10px;
  }

  .msg.error {
    margin-top: 6px;
    font-size: 12px;
    color: #b00020;
  }

  .hint {
    display: block;
    margin-top: 6px;
    font-size: 11px;
    color: #6b7280;
  }

  .actions,
  .ticket-actions {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .action-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .action-hint {
    text-align: center;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 700;
    padding: 0 10px;
  }

  .action-hint-voucher {
    color: #a35a00;
  }

  .action-hint-pay {
    color: #01224a;
  }

  .footer {
    font-size: 11px;
    color: #9ca3af;
    text-align: center;
    margin-top: auto;
    padding-top: 12px;
  }

  /* =========================
     TICKET COMPACTO MOVIL
     ========================= */
  .ticket-stage {
    min-height: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    margin-top: 0;
  }

  .ticket-wrap {
    width: 100%;
    max-width: 430px;
  }

  .ticket-3d {
    width: 100%;
  }

  .ticket-paper {
    background: #ffffff;
    border-radius: 24px;
    padding: 14px 14px 18px;
    border: 1px solid #e5e7eb;
    box-shadow:
      0 16px 36px rgba(15, 23, 42, 0.10),
      0 3px 12px rgba(15, 23, 42, 0.05);
    position: relative;
    overflow: hidden;
  }

  .ticket-paper::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg, #facc15, #f59e0b, #01224a);
  }

  .ticket-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .ticket-title-left {
    min-width: 0;
    flex: 1;
  }

  .t-title {
    font-size: 18px;
    line-height: 1.1;
    font-weight: 900;
    color: #111827;
  }

  .t-amount-box {
    min-width: 128px;
    text-align: right;
  }

  .t-amount-lbl {
    display: block;
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 3px;
  }

  .t-amount-v {
    font-size: 26px;
    line-height: 1;
    font-weight: 900;
    color: #01224a;
  }

  .ticket-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0,0,0,.12), transparent);
    margin: 10px 0 10px;
  }

  .ticket-divider.compact {
    margin: 10px 0 12px;
  }

  .ticket-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 10px;
  }

  .t-item {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 10px 11px;
  }

  .t-k {
    display: block;
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 3px;
  }

  .t-v {
    display: block;
    font-size: 14px;
    line-height: 1.25;
    font-weight: 800;
    color: #111827;
    word-break: break-word;
  }

  /* Host fijo para tolerancia */
  #inlineToleranceHost {
    margin-top: 0;
  }

  /* Modal */
  .modal-root {
    position: fixed;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 900;
    font-family: inherit;
  }

  .modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.38);
    backdrop-filter: blur(1px);
  }

  .modal-box--comprobante {
    position: relative;
    background: #ffffff;
    border-radius: 18px;
    max-width: 480px;
    width: calc(100% - 32px);
    padding: 20px 18px 18px;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
    z-index: 1;
  }

  .modal-title {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    text-align: center;
  }

  .modal-subtitle {
    margin: 0 0 14px;
    font-size: 13px;
    color: #6b7280;
    text-align: center;
  }

  .tipo-selector {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }

  .tipo-card {
    flex: 1;
    cursor: pointer;
  }

  .tipo-card input {
    display: none;
  }

  .tipo-card-body {
    border-radius: 14px;
    border: 1px solid #e5e7eb;
    background: #fafafa;
    padding: 10px 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.18s ease-out;
  }

  .tipo-icon {
    font-size: 22px;
  }

  .tipo-title {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #111827;
  }

  .tipo-caption {
    display: block;
    font-size: 12px;
    color: #6b7280;
  }

  .tipo-card input:checked + .tipo-card-body {
    background: #fff7d9;
    border-color: #facc15;
    box-shadow: 0 10px 25px rgba(250, 204, 21, 0.25);
  }

  .datos-section {
    margin-top: 10px;
  }

  .datos-title {
    margin: 0 0 6px;
    font-size: 14px;
    font-weight: 600;
    color: #111827;
  }

  .nombre-section {
    margin-top: 14px;
  }

  .oculto {
    display: none;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 18px;
  }

  /* Scanner */
  #scanner-wrapper {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.85);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 950;
  }

  #scanner-wrapper video {
    width: 100%;
    max-width: 420px;
    border-radius: 24px;
    object-fit: cover;
  }

  #scanner-overlay {
    position: absolute;
    inset: 0;
  }

  #scanner-frame {
    position: absolute;
    width: 60%;
    max-width: 280px;
    aspect-ratio: 1 / 1;
    border-radius: 24px;
    border: 3px solid rgba(250, 204, 21, 0.85);
    box-shadow: 0 0 0 999px rgba(15, 23, 42, 0.65);
  }

  #laser {
    position: absolute;
    width: 55%;
    max-width: 260px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #fbbf24, transparent);
    animation: laser-scan 1.6s linear infinite;
  }

  #scanner-logo {
    position: absolute;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    height: 32px;
  }

  #close-scan {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: none;
    background: #f3f4f6;
    color: #111827;
    cursor: pointer;
  }

  @keyframes laser-scan {
    0% { transform: translateY(-35%); }
    50% { transform: translateY(35%); }
    100% { transform: translateY(-35%); }
  }

  .swal2-container {
    z-index: 2000 !important;
  }


.tipo-title-big {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.05;
}

.subtipo-selector {
  display: flex;
  gap: 10px;
  margin: 10px 0 12px;
}

.subtipo-card {
  flex: 1;
  cursor: pointer;
}

.subtipo-card input {
  display: none;
}

.subtipo-card-body {
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fafafa;
  padding: 10px 12px;
  text-align: center;
  transition: all 0.18s ease-out;
}

.subtipo-title {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}

.subtipo-card input:checked + .subtipo-card-body {
  background: #fff7d9;
  border-color: #facc15;
  box-shadow: 0 8px 22px rgba(250, 204, 21, 0.22);
}

.modal-box--comprobante {
  min-height: 575px;
}

#dniBlock,
#nombreBlock,
#correoSection,
#facturaFields,
#boletaFields {
  transition: all 0.18s ease;
}

  @media (max-width: 380px) {
    .page {
      padding: 6px 10px 10px;
    }

    .ticket-mini-logo {
      width: 130px;
    }

    .t-title {
      font-size: 16px;
    }

    .t-amount-v {
      font-size: 22px;
    }

    .btn-big {
      min-height: 54px;
      font-size: 17px;
    }

    .input-box-large {
      font-size: 16px;
      padding: 14px 16px;
    }

    .action-hint {
      font-size: 12px;
    }
  }
</style>

<div class="page">
  <!-- =========================
       VISTA 1: FORMULARIO
       ========================= -->
  <main id="formView" class="card main-card form-card">
    <div class="ticket-brand-mini form-brand">
      <img
        src="/public/img/logoCP.png"
        alt="Central Parking"
        class="ticket-mini-logo"
        style="width:150px;max-width:70%;height:auto;display:block;"
        fetchpriority="high"
      >
    </div>

    <div style="height: 6px;"></div>

    <label for="cardNo" class="field-label centered-label">Ingresa N° de ticket</label>
    <input
      id="cardNo"
      class="input-box input-box-large"
      type="text"
      placeholder="Ej: 12345"
      autocomplete="off"
      inputmode="numeric"
    />

    <button class="btn btn-main btn-big" onclick="consultarTicket()">Consultar ticket</button>

    <p id="estadoTxt" class="msg msg-muted msg-centered">
      Ingresa o escanea tu ticket para calcular el monto
    </p>
  </main>

  <!-- =========================
       VISTA 2: TICKET / TOLERANCIA
       ========================= -->
  <main id="ticketView" class="ticket-stage" style="display:none;">
    <section class="ticket-wrap">
      <div class="ticket-3d">
        <div class="ticket-paper">
          <div class="ticket-brand-mini">
            <img
              src="/public/img/logoCP.png"
              alt="Central Parking"
              class="ticket-mini-logo"
              style="width:150px;max-width:70%;height:auto;display:block;"
            >
          </div>

          <!-- CONTENIDO NORMAL -->
          <div id="ticketNormalContent">
            <div id="ticketNormalHeader" class="ticket-title-row">
              <div class="ticket-title-left">
                <p class="t-sub">TICKET DE ESTACIONAMIENTO</p>
                <h2 class="t-title">Resumen de pago</h2>
              </div>

              <div class="t-amount-box">
                <span class="t-amount-lbl">Monto a pagar</span>
                <strong id="t_amount" class="t-amount-v">S/ 0.00</strong>
              </div>
            </div>

            <div id="ticketNormalDivider1" class="ticket-divider"></div>

            <div id="ticketNormalGrid" class="ticket-info-grid">
              <div class="t-item">
                <span class="t-k">N° Ticket</span>
                <strong id="t_cardNo" class="t-v">—</strong>
              </div>

              <div class="t-item">
                <span class="t-k">Placa</span>
                <strong id="t_plate" class="t-v">—</strong>
              </div>

              <div class="t-item">
                <span class="t-k">Ingreso</span>
                <strong id="t_entryTime" class="t-v">—</strong>
              </div>

              <div class="t-item">
                <span class="t-k">Estadía</span>
                <strong id="t_stay" class="t-v">—</strong>
              </div>
            </div>

            <div id="ticketNormalDivider2" class="ticket-divider compact"></div>
          </div>

          <!-- oculto por compatibilidad -->
          <div id="t_qr" style="display:none;"></div>

          <!-- SOLO TARJETA DE TOLERANCIA -->
          <div id="inlineToleranceHost"></div>

          <!-- ACCIONES NORMALES -->
          <div id="ticketActions" class="ticket-actions">
            <div id="ticketVoucherBlock" class="action-block">
              <p class="action-hint action-hint-voucher">
                ¿Tienes un cupón de descuento? Valídalo aquí
              </p>
              <button
                id="btnTicketValidarCpe"
                class="btn btn-voucher btn-big btn-emphasis"
                onclick="validarCPE()"
              >
                Validar voucher de compra (CPE)
              </button>
            </div>

            <div id="ticketPayBlock" class="action-block">
              <p class="action-hint action-hint-pay">
                Si deseas pagar directamente sin voucher, hazlo aquí
              </p>
              <button
                id="btnTicketPagar"
                class="btn btn-pago btn-big btn-emphasis"
                onclick="pagarYModal()"
              >
                Pagar estacionamiento
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    © 2025 Park Access — Desarrollado por Park Access
  </footer>
</div>

<!-- Modal Comprobante -->
<div id="modal" class="modal-root">
  <div class="modal-backdrop"></div>

  <div class="modal-box modal-box--comprobante">
    <h3 class="modal-title">Selecciona tu comprobante</h3>
    <p class="modal-subtitle">
      Elige si deseas Boleta o Factura para tu pago.
    </p>

    <p id="cpeCountdown" class="msg msg-muted" style="margin:8px 0 0;">
      Tiempo para emitir comprobante: <b>02:00</b>
    </p>

    <!-- TIPO PRINCIPAL -->
    <div class="tipo-selector" onchange="toggleTipo()">
      <label class="tipo-card">
        <input type="radio" name="tipo" value="boleta" checked />
        <div class="tipo-card-body">
          <div class="tipo-icon">🧾</div>
          <div class="tipo-textos">
            <span class="tipo-title tipo-title-big">Boleta</span>
            <span class="tipo-caption">Para personas naturales</span>
          </div>
        </div>
      </label>

      <label class="tipo-card">
        <input type="radio" name="tipo" value="factura" />
        <div class="tipo-card-body">
          <div class="tipo-icon">📄</div>
          <div class="tipo-textos">
            <span class="tipo-title tipo-title-big">Factura</span>
            <span class="tipo-caption">Para empresas</span>
          </div>
        </div>
      </label>
    </div>

    <!-- SUBTIPO SOLO PARA BOLETA -->
    <div id="boletaModoWrap" class="subtipo-selector">
      <label class="subtipo-card">
        <input type="radio" name="boletaModo" value="sin_dni" checked />
        <div class="subtipo-card-body">
          <span class="subtipo-title">Sin DNI</span>
        </div>
      </label>

      <label class="subtipo-card">
        <input type="radio" name="boletaModo" value="con_dni" />
        <div class="subtipo-card-body">
          <span class="subtipo-title">Con DNI</span>
        </div>
      </label>
    </div>

    <!-- BOLETA -->
    <div id="boletaFields" class="datos-section">
      <h4 class="datos-title">Datos para Boleta</h4>

      <div id="dniBlock">
        <label for="dniDoc" class="field-label small-label">DNI</label>
        <input
          id="dniDoc"
          class="input-box"
          type="text"
          placeholder="8 dígitos"
          maxlength="8"
          autocomplete="off"
          inputmode="numeric"
          oninput="buscarDni()"
        />
      </div>

      <div id="nombreBlock" class="nombre-section" style="margin-top:12px;">
        <label for="nombreManual" class="field-label small-label">Nombre / Razón social</label>
        <input
          id="nombreManual"
          class="input-box"
          type="text"
          placeholder="CLIENTE GENERAL"
          value="CLIENTE GENERAL"
          autocomplete="off"
        />
      </div>
    </div>

    <!-- FACTURA -->
    <div id="facturaFields" class="datos-section oculto">
      <h4 class="datos-title">Datos para Factura</h4>

      <label for="nroDoc" class="field-label small-label">RUC</label>
      <input
        id="nroDoc"
        class="input-box"
        type="text"
        placeholder="RUC (11 dígitos)"
        maxlength="11"
        autocomplete="off"
        inputmode="numeric"
        oninput="buscarRuc()"
      />
      <div id="rucMsg" class="msg error" style="display:none"></div>

      <div class="nombre-section" style="margin-top:12px;">
        <label for="nombreManualFactura" class="field-label small-label">Razón social</label>
        <input
          id="nombreManualFactura"
          class="input-box"
          type="text"
          placeholder="Razón social"
          value=""
          autocomplete="off"
        />
      </div>
    </div>

    <!-- CORREO OBLIGATORIO -->
    <div class="nombre-section" id="correoSection">
      <label for="correoDoc" class="field-label small-label">Correo</label>
      <input
        id="correoDoc"
        class="input-box"
        type="email"
        inputmode="email"
        placeholder="correo@dominio.com"
        autocomplete="off"
        oninput="guardarCorreo()"
      />
      <small class="hint">
        El correo es obligatorio para la emisión y envío del CPE.
      </small>
    </div>

    <input type="hidden" id="montoPagado" />

    <div class="modal-actions">
      <button
        type="button"
        id="btnEmitir"
        class="btn btn-pago btn-primary"
        onclick="emitirComprobante()"
      >
        Continuar al pago
      </button>
    </div>
  </div>
</div>

<!-- Escáner QR -->
<div id="scanner-wrapper">
  <video id="scanner" playsinline></video>

  <div id="scanner-overlay"></div>
  <div id="scanner-frame"></div>
  <div id="laser"></div>

  <img id="scanner-logo" src="/public/img/logoCP.png" alt="Logo" />
  <button id="close-scan" onclick="cerrarScanner()">✕</button>
</div>

<!-- Libs -->
<script src="https://unpkg.com/@zxing/library@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>

<!-- Tu lógica -->
<script src="/public/js/app.js?v=20260227-8"></script>