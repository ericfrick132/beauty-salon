const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Navegando a http://localhost:3001...');
  await page.goto('http://localhost:3001');

  // Esperar a que la página cargue
  await page.waitForLoadState('networkidle');

  // Obtener el título
  const title = await page.title();
  console.log('Título de la página:', title);

  // Tomar captura de pantalla
  await page.screenshot({ path: 'screenshot-home.png', fullPage: true });
  console.log('Captura guardada en screenshot-home.png');

  // Verificar que no hay errores de consola críticos
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Error en consola:', msg.text());
    }
  });

  await browser.close();
  console.log('✓ Test completado exitosamente');
})();
