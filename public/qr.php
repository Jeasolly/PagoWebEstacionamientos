<?php
// /public/qr.php testtttt
declare(strict_types=1);

// Seguridad básica
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
  <title>Central Parking · Portal</title>

  <!-- Menú hamburguesa -->
  <link rel="stylesheet" href="/public/css/ui.css" />
</head>

<body>

  <!-- Botón hamburguesa flotante -->
  <div style="position:fixed;top:14px;left:14px;z-index:9997;">
    <button id="hambBtn" class="hamb-btn" aria-label="Abrir menú">
      <div class="hamb-lines">
        <span></span><span></span><span></span>
      </div>
    </button>
  </div>

  <!-- TU CONTENIDO ORIGINAL (en qr_body.php) -->
  <?php
    $bodyFile = __DIR__ . '/qr_body.php';
    if (file_exists($bodyFile)) {
      include $bodyFile;
    } else {
      echo '<div style="max-width:820px;margin:80px auto;padding:18px;font-family:Arial;border:1px solid #ddd;border-radius:12px">
              <h2 style="margin:0 0 10px 0">Falta qr_body.php</h2>
              <p>Debes crear <b>/public/qr_body.php</b> y pegar ahí tu contenido original (solo el body).</p>
            </div>';
    }
  ?>

  <!-- Drawer + overlay -->
  <div id="drawerOverlay" class="drawer-overlay"></div>

  <aside id="drawer" class="drawer" aria-label="Menú">
    <div class="drawer-header">
      <div class="drawer-brand">
        <div class="drawer-logo"></div>
        <div>
          <div class="drawer-title">Central Parking</div>
          <div class="drawer-sub">Comprobantes & soporte</div>
        </div>
      </div>
    </div>

    <nav class="drawer-nav">
      <a class="drawer-link" href="/facturacion/mis_cpe.php">
        <div class="drawer-ico">📄</div>
        <div>
          <div style="font-weight:800;">Ver mis CPE</div>
          <small>Busca por N° ticket y descarga PDF</small>
        </div>
      </a>

      <a class="drawer-link" href="/facturacion/soporte.php">
        <div class="drawer-ico">🛟</div>
        <div>
          <div style="font-weight:800;">Soporte</div>
          <small>WhatsApp, correo y ayuda</small>
        </div>
      </a>
    </nav>

    <div class="drawer-footer">
      © Central Parking System Perú
    </div>
  </aside>

  <!-- JS del menú -->
  <script src="/public/js/ui.js"></script>

</body>
</html>

